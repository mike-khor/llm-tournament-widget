"""
Factory for creating LLM provider instances.
"""

import logging
from typing import Optional, Type

from app.core.config import settings
from app.services.llm_providers import (
    ClaudeProvider,
    LLMProvider,
    LLMProviderError,
    OpenAIProvider,
)

logger = logging.getLogger(__name__)

__all__ = ["ProviderFactory", "create_llm_provider"]


class ProviderFactory:
    """Factory class for creating LLM provider instances."""

    _providers = {
        "openai": OpenAIProvider,
        "claude": ClaudeProvider,
    }

    @classmethod
    def create_provider(
        cls, provider_name: str, model: Optional[str] = None
    ) -> LLMProvider:
        """Create an LLM provider instance based on the provider name."""
        provider_name = provider_name.lower()

        if provider_name not in cls._providers:
            available = ", ".join(cls._providers.keys())
            raise LLMProviderError(
                f"Unknown provider: {provider_name}. Available providers: {available}"
            )

        provider_class = cls._providers[provider_name]

        try:
            if provider_name == "openai":
                return provider_class(
                    api_key=settings.openai_api_key,
                    model=model or settings.openai_model,
                )
            elif provider_name == "claude":
                return provider_class(
                    api_key=settings.anthropic_api_key,
                    model=model or settings.claude_model,
                )
            else:
                raise LLMProviderError(
                    f"Provider configuration not found for: {provider_name}"
                )

        except Exception as e:
            logger.error(f"Failed to create provider {provider_name}: {e}")
            raise LLMProviderError(
                f"Failed to initialize {provider_name} provider: {e}"
            )

    @classmethod
    def create_provider_with_model(
        cls, provider_name: str, model_id: str
    ) -> LLMProvider:
        """Create an LLM provider instance with a specific model."""
        from app.core.models_config import get_model_info

        model_info = get_model_info(provider_name, model_id)
        if model_info is None:
            raise LLMProviderError(
                f"Model {model_id} not found for provider {provider_name}"
            )

        return cls.create_provider(provider_name, model_id)

    @classmethod
    def get_available_providers(cls) -> list[str]:
        """Get list of available provider names."""
        return list(cls._providers.keys())

    @classmethod
    def register_provider(cls, name: str, provider_class: Type[LLMProvider]) -> None:
        """Register a new provider class."""
        if not issubclass(provider_class, LLMProvider):
            raise ValueError("Provider class must inherit from LLMProvider")

        cls._providers[name.lower()] = provider_class
        logger.info(f"Registered new provider: {name}")


def create_llm_provider(provider_name: Optional[str] = None) -> LLMProvider:
    """
    Convenience function to create an LLM provider.

    Args:
        provider_name: Name of the provider to create. If None, uses settings.llm_provider

    Returns:
        LLMProvider instance

    Raises:
        LLMProviderError: If provider creation fails
    """
    if provider_name is None:
        provider_name = settings.llm_provider

    logger.info(f"Creating LLM provider: {provider_name}")
    return ProviderFactory.create_provider(provider_name)
