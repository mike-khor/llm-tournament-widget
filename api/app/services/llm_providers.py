"""
LLM provider implementations for different AI services.
"""

import json
import logging
from abc import ABC, abstractmethod
from typing import Optional, Tuple

from anthropic import AsyncAnthropic
from app.services.rate_limiter import with_rate_limiting_and_retry
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

__all__ = ["LLMProvider", "OpenAIProvider", "ClaudeProvider", "LLMProviderError"]


class LLMProviderError(Exception):
    """Custom exception for LLM provider errors."""

    pass


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    def __init__(self, model: str):
        self.model = model

    @abstractmethod
    async def generate_response(self, prompt: str, test_input: str) -> str:
        """Generate response using the prompt and test input."""
        pass

    @abstractmethod
    async def evaluate_response(
        self,
        output: str,
        criterion_name: str,
        criterion_description: str,
        test_input: str,
        expected_output: Optional[str] = None,
    ) -> Tuple[float, str]:
        """Evaluate a response against a criterion using LLM-as-a-Judge."""
        pass

    def _build_evaluation_prompt(
        self,
        output: str,
        criterion_name: str,
        criterion_description: str,
        test_input: str,
        expected_output: Optional[str] = None,
    ) -> str:
        """Build evaluation prompt based on G-Eval framework."""
        prompt = f"""You are an expert evaluator. Please evaluate the following response based on this criterion:

Criterion: {criterion_name}
Description: {criterion_description}

Original Input: {test_input}
Response to Evaluate: {output}"""

        if expected_output:
            prompt += f"\nExpected Output: {expected_output}"

        prompt += """

Please provide:
1. A score from 0.0 to 1.0 (where 1.0 is perfect; 1 decimal only)
2. Brief reasoning for your score (maximum 2 sentences, no newline)

Consider the following scoring guidelines:
- 0.9-1.0: Exceptional quality, meets all requirements perfectly
- 0.7-0.8: Good quality, meets most requirements with minor issues
- 0.5-0.6: Average quality, meets some requirements but has notable issues
- 0.3-0.4: Below average, significant issues or gaps
- 0.0-0.2: Poor quality, fails to meet basic requirements

Respond in this exact JSON format:
{"reasoning": "First sentence describing adherance. A second sentence describing deviation.", "score": 0.0}"""

        return prompt

    def _parse_evaluation_response(self, content: str) -> Tuple[float, str]:
        """Parse the evaluation response JSON."""
        try:
            starting_idx = content.find('{"reasoning":')
            if starting_idx > 0:
                content = content[starting_idx:]

            if not content.endswith("}"):
                content += "}"

            result = json.loads(content.strip())
            score = float(result.get("score", 0.5))
            reasoning = str(result.get("reasoning", "No reasoning provided"))

            # Clamp score to valid range
            score = max(0.0, min(1.0, score))

            return score, reasoning

        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.exception(f"Failed to parse evaluation response: {content}")
            return 0.5, f"Evaluation parsing failed: {str(e)}"


class OpenAIProvider(LLMProvider):
    """OpenAI GPT provider implementation."""

    def __init__(self, api_key: str, model: str = "gpt-4"):
        super().__init__(model)
        self.client = AsyncOpenAI(api_key=api_key)

    async def generate_response(self, prompt: str, test_input: str) -> str:
        """Generate response using OpenAI GPT models."""
        input_text = f"{prompt}\n{test_input}"

        async def _make_request():
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": test_input},
                ],
                max_tokens=500,
                temperature=0.7,
            )

            content = response.choices[0].message.content
            if content is None or content.strip() == "":
                logger.warning(
                    f"Empty response from OpenAI for prompt: {prompt[:50]}..."
                )
                return "No response generated. The model returned empty content."

            return content.strip()

        try:
            return await with_rate_limiting_and_retry(
                _make_request,
                operation_name="OpenAI generation",
                input_text=input_text,
                estimated_output_length=500,
            )
        except Exception as e:
            logger.error(f"Failed to generate response with OpenAI: {str(e)}")
            raise LLMProviderError(f"OpenAI generation failed: {str(e)}")

    async def evaluate_response(
        self,
        output: str,
        criterion_name: str,
        criterion_description: str,
        test_input: str,
        expected_output: Optional[str] = None,
    ) -> Tuple[float, str]:
        """Evaluate a response using OpenAI GPT as judge."""
        eval_prompt = self._build_evaluation_prompt(
            output, criterion_name, criterion_description, test_input, expected_output
        )

        async def _make_request():
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": eval_prompt}],
                max_tokens=200,
                temperature=0.1,
            )

            content = response.choices[0].message.content
            if content is None or content.strip() == "":
                logger.warning(
                    f"Empty evaluation response for criterion: {criterion_name}"
                )
                return 0.5, "Evaluation failed: Empty response from evaluator model"

            return self._parse_evaluation_response(content.strip())

        try:
            return await with_rate_limiting_and_retry(
                _make_request,
                operation_name=f"OpenAI evaluation ({criterion_name})",
                input_text=eval_prompt,
                estimated_output_length=200,
            )
        except Exception as e:
            logger.error(f"Failed to evaluate response with OpenAI: {str(e)}")
            return 0.5, f"Evaluation failed: {str(e)}"


class ClaudeProvider(LLMProvider):
    """Anthropic Claude provider implementation."""

    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        super().__init__(model)
        self.client = AsyncAnthropic(api_key=api_key)

    async def generate_response(self, prompt: str, test_input: str) -> str:
        """Generate response using Claude models."""
        input_text = f"{prompt}\n{test_input}"

        async def _make_request():
            # Claude uses a different message format
            system_prompt = prompt
            user_message = test_input

            response = await self.client.messages.create(
                model=self.model,
                max_tokens=500,
                temperature=0.7,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            )

            # Extract text content from Claude's response
            content = ""
            for block in response.content:
                if block.type == "text":
                    content += block.text

            if not content or content.strip() == "":
                logger.warning(
                    f"Empty response from Claude for prompt: {prompt[:50]}..."
                )
                return "No response generated. The model returned empty content."

            return content.strip()

        try:
            return await with_rate_limiting_and_retry(
                _make_request,
                operation_name="Claude generation",
                input_text=input_text,
                estimated_output_length=500,
            )
        except Exception as e:
            logger.error(f"Failed to generate response with Claude: {str(e)}")
            raise LLMProviderError(f"Claude generation failed: {str(e)}")

    async def evaluate_response(
        self,
        output: str,
        criterion_name: str,
        criterion_description: str,
        test_input: str,
        expected_output: Optional[str] = None,
    ) -> Tuple[float, str]:
        """Evaluate a response using Claude as judge."""
        eval_prompt = self._build_evaluation_prompt(
            output, criterion_name, criterion_description, test_input, expected_output
        )

        async def _make_request():
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=200,
                temperature=0.1,
                messages=[{"role": "user", "content": eval_prompt}],
            )

            # Extract text content from Claude's response
            content = ""
            for block in response.content:
                if block.type == "text":
                    content += block.text

            if not content or content.strip() == "":
                logger.warning(
                    f"Empty evaluation response for criterion: {criterion_name}"
                )
                return 0.5, "Evaluation failed: Empty response from evaluator model"

            return self._parse_evaluation_response(content.strip())

        try:
            return await with_rate_limiting_and_retry(
                _make_request,
                operation_name=f"Claude evaluation ({criterion_name})",
                input_text=eval_prompt,
                estimated_output_length=200,
            )
        except Exception as e:
            logger.error(f"Failed to evaluate response with Claude: {str(e)}")
            return 0.5, f"Evaluation failed: {str(e)}"
