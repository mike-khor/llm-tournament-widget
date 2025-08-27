"""
Rate limiting and retry logic for LLM API calls.
"""

import asyncio
import logging
import time
from collections import deque
from dataclasses import dataclass
from typing import Awaitable, Callable, Dict, TypeVar

from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T")

__all__ = [
    "RateLimitError",
    "RateLimiter",
    "RetryHandler",
    "with_rate_limiting_and_retry",
]


class RateLimitError(Exception):
    """Custom exception for rate limiting errors."""

    pass


@dataclass
class RequestRecord:
    """Record of a request for rate limiting purposes."""

    timestamp: float
    input_tokens: int
    output_tokens: int


class RateLimiter:
    """Token-based rate limiter for API requests."""

    def __init__(
        self,
        input_tokens_per_minute: int = 20000,
        output_tokens_per_minute: int = 8000,
        max_concurrent: int = 10,
    ):
        self.input_tokens_per_minute = input_tokens_per_minute
        self.output_tokens_per_minute = output_tokens_per_minute
        self.max_concurrent = max_concurrent

        # Track requests in the last minute
        self.request_history: deque[RequestRecord] = deque()
        self.concurrent_count = 0
        self.lock = asyncio.Lock()

        logger.info(
            f"Initialized rate limiter: {input_tokens_per_minute} input tokens/min, "
            f"{output_tokens_per_minute} output tokens/min, "
            f"{max_concurrent} max concurrent"
        )

    def _clean_old_requests(self) -> None:
        """Remove requests older than 1 minute."""
        cutoff_time = time.time() - 60  # 1 minute ago
        while self.request_history and self.request_history[0].timestamp < cutoff_time:
            self.request_history.popleft()

    def _get_current_usage(self) -> Dict[str, int]:
        """Get current token usage in the last minute."""
        self._clean_old_requests()

        input_tokens = sum(record.input_tokens for record in self.request_history)
        output_tokens = sum(record.output_tokens for record in self.request_history)

        return {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "concurrent": self.concurrent_count,
        }

    async def can_proceed(
        self, estimated_input_tokens: int, estimated_output_tokens: int
    ) -> bool:
        """Check if a request can proceed without hitting rate limits."""
        async with self.lock:
            usage = self._get_current_usage()

            # Check concurrent limit
            if usage["concurrent"] >= self.max_concurrent:
                return False

            # Check token limits (with some buffer for estimation errors)
            input_buffer = estimated_input_tokens * 1.2  # 20% buffer
            output_buffer = estimated_output_tokens * 1.2

            if (usage["input_tokens"] + input_buffer) > self.input_tokens_per_minute:
                return False

            if (usage["output_tokens"] + output_buffer) > self.output_tokens_per_minute:
                return False

            return True

    async def acquire(
        self, estimated_input_tokens: int, estimated_output_tokens: int
    ) -> None:
        """Acquire a slot for making a request (increment concurrent count)."""
        async with self.lock:
            self.concurrent_count += 1
            logger.debug(
                f"Acquired slot: {self.concurrent_count}/{self.max_concurrent} concurrent, "
                f"estimated {estimated_input_tokens} input + {estimated_output_tokens} output tokens"
            )

    async def release(
        self, actual_input_tokens: int, actual_output_tokens: int
    ) -> None:
        """Release a slot and record actual token usage."""
        async with self.lock:
            self.concurrent_count = max(0, self.concurrent_count - 1)

            # Record actual usage
            record = RequestRecord(
                timestamp=time.time(),
                input_tokens=actual_input_tokens,
                output_tokens=actual_output_tokens,
            )
            self.request_history.append(record)

            logger.debug(
                f"Released slot: {self.concurrent_count}/{self.max_concurrent} concurrent, "
                f"recorded {actual_input_tokens} input + {actual_output_tokens} output tokens"
            )

    async def wait_for_capacity(
        self,
        estimated_input_tokens: int,
        estimated_output_tokens: int,
        max_wait_time: float = 60.0,
    ) -> None:
        """Wait until there's capacity for the request."""
        start_time = time.time()

        while not await self.can_proceed(
            estimated_input_tokens, estimated_output_tokens
        ):
            if time.time() - start_time > max_wait_time:
                usage = self._get_current_usage()
                raise RateLimitError(
                    f"Rate limit wait timeout after {max_wait_time}s. "
                    f"Current usage: {usage['input_tokens']}/{self.input_tokens_per_minute} input, "
                    f"{usage['output_tokens']}/{self.output_tokens_per_minute} output, "
                    f"{usage['concurrent']}/{self.max_concurrent} concurrent"
                )

            # Wait a bit before checking again
            await asyncio.sleep(1.0)
            logger.debug(
                f"Waiting for rate limit capacity: "
                f"{estimated_input_tokens} input + {estimated_output_tokens} output tokens"
            )


class RetryHandler:
    """Handler for retrying failed requests with exponential backoff."""

    def __init__(self, max_retries: int = 2, base_delay: float = 5.0):
        self.max_retries = max_retries
        self.base_delay = base_delay

    def is_rate_limit_error(self, exception: Exception) -> bool:
        """Check if an exception is a rate limit error."""
        error_str = str(exception).lower()
        rate_limit_indicators = [
            "rate_limit_error",
            "rate limit",
            "too many requests",
            "429",
            "quota exceeded",
            "concurrent connections",
            "requests per minute",
        ]

        return any(indicator in error_str for indicator in rate_limit_indicators)

    async def retry_with_backoff(
        self, func: Callable[[], Awaitable[T]], operation_name: str = "API call"
    ) -> T:
        """Retry a function with exponential backoff on rate limit errors."""
        last_exception = None

        for attempt in range(self.max_retries + 1):  # +1 for initial attempt
            try:
                return await func()

            except Exception as e:
                last_exception = e

                # Only retry on rate limit errors
                if not self.is_rate_limit_error(e):
                    logger.error(
                        f"{operation_name} failed with non-rate-limit error: {e}"
                    )
                    raise e

                # Don't retry on the last attempt
                if attempt >= self.max_retries:
                    logger.error(
                        f"{operation_name} failed after {self.max_retries + 1} attempts "
                        f"due to rate limiting: {e}"
                    )
                    break

                # Calculate delay with exponential backoff
                delay = self.base_delay * (2**attempt)
                logger.warning(
                    f"{operation_name} hit rate limit (attempt {attempt + 1}), "
                    f"retrying in {delay}s: {e}"
                )

                await asyncio.sleep(delay)

        # If we get here, all retries failed
        if last_exception:
            raise last_exception
        else:
            raise RateLimitError("All retry attempts failed")


# Global instances
rate_limiter = RateLimiter(
    input_tokens_per_minute=settings.input_tokens_per_minute,
    output_tokens_per_minute=settings.output_tokens_per_minute,
    max_concurrent=settings.max_concurrent_requests,
)

retry_handler = RetryHandler(
    max_retries=settings.max_retries, base_delay=settings.retry_delay_seconds
)


def estimate_tokens(text: str) -> int:
    """Rough estimation of token count (4 characters ≈ 1 token)."""
    return max(1, len(text) // 4)


async def with_rate_limiting_and_retry(
    func: Callable[[], Awaitable[T]],
    operation_name: str = "API call",
    input_text: str = "",
    estimated_output_length: int = 500,
) -> T:
    """
    Execute a function with rate limiting and retry logic.

    Args:
        func: Async function to execute
        operation_name: Name for logging purposes
        input_text: Input text to estimate token count
        estimated_output_length: Estimated output length in characters

    Returns:
        Result from the function
    """
    estimated_input_tokens = estimate_tokens(input_text)
    estimated_output_tokens = estimate_tokens(" " * estimated_output_length)

    # Wait for capacity
    await rate_limiter.wait_for_capacity(
        estimated_input_tokens, estimated_output_tokens
    )

    # Acquire slot
    await rate_limiter.acquire(estimated_input_tokens, estimated_output_tokens)

    try:
        # Execute with retry logic
        result = await retry_handler.retry_with_backoff(func, operation_name)

        # Record actual usage (estimate based on result if it's text)
        actual_output_tokens = estimated_output_tokens
        if hasattr(result, "__len__"):
            try:
                actual_output_tokens = estimate_tokens(str(result))
            except (TypeError, ValueError):
                pass  # Use estimation if conversion fails

        await rate_limiter.release(estimated_input_tokens, actual_output_tokens)

        return result

    except Exception as e:
        # Release slot even on failure
        await rate_limiter.release(
            estimated_input_tokens, 0
        )  # No output tokens on failure
        raise e
