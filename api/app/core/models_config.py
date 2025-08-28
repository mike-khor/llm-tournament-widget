"""
Configuration for available LLM providers and models.
"""

from typing import Dict, List

from pydantic import BaseModel


class ModelInfo(BaseModel):
    """Information about a specific model."""

    id: str  # Model identifier (e.g., "gpt-4o-mini")
    name: str  # Display name (e.g., "GPT-4o Mini")
    provider: str  # Provider name (e.g., "openai")
    description: str  # Brief description
    context_length: int  # Maximum context length
    supports_generation: bool = True  # Can be used for generation
    supports_evaluation: bool = True  # Can be used for evaluation
    cost_per_1k_input_tokens: float = 0.0  # Cost in USD
    cost_per_1k_output_tokens: float = 0.0  # Cost in USD


class ProviderConfig(BaseModel):
    """Configuration for a provider."""

    name: str  # Provider name
    display_name: str  # Human-readable name
    enabled: bool = True  # Whether this provider is available
    models: List[ModelInfo]  # Available models for this provider


# Available models configuration
MODELS_CONFIG: Dict[str, ProviderConfig] = {
    "openai": ProviderConfig(
        name="openai",
        display_name="OpenAI",
        enabled=True,
        models=[
            ModelInfo(
                id="gpt-4o-2024-08-06",
                name="GPT-4o",
                provider="openai",
                description="Most capable GPT-4 model, great for complex reasoning",
                context_length=128000,
                supports_generation=True,
                supports_evaluation=True,
                cost_per_1k_input_tokens=0.0025,
                cost_per_1k_output_tokens=0.01,
            ),
            ModelInfo(
                id="gpt-4o-mini-2024-07-18",
                name="GPT-4o Mini",
                provider="openai",
                description="Faster and more affordable GPT-4 model",
                context_length=128000,
                supports_generation=True,
                supports_evaluation=True,
                cost_per_1k_input_tokens=0.00015,
                cost_per_1k_output_tokens=0.0006,
            ),
            ModelInfo(
                id="gpt-4.1-nano-2025-04-14",
                name="GPT-4.1 nano",
                provider="openai",
                description="Fastest, most cost-efficient version of GPT-4.1",
                context_length=128000,
                supports_generation=True,
                supports_evaluation=True,
                cost_per_1k_input_tokens=0.0001,
                cost_per_1k_output_tokens=0.0004,
            ),
        ],
    ),
    "claude": ProviderConfig(
        name="claude",
        display_name="Anthropic Claude",
        enabled=True,
        models=[
            ModelInfo(
                id="claude-sonnet-4-20250514",
                name="Claude 4 Sonnet",
                provider="claude",
                description="Optimal balance of intelligence, cost, and speed",
                context_length=200000,
                supports_generation=True,
                supports_evaluation=True,
                cost_per_1k_input_tokens=0.003,
                cost_per_1k_output_tokens=0.015,
            ),
            ModelInfo(
                id="claude-3-5-haiku-20241022",
                name="Claude 3.5 Haiku",
                provider="claude",
                description="Fastest, most cost-effective Claude model",
                context_length=200000,
                supports_generation=True,
                supports_evaluation=True,
                cost_per_1k_input_tokens=0.0008,
                cost_per_1k_output_tokens=0.004,
            ),
        ],
    ),
}


def get_available_models() -> Dict[str, ProviderConfig]:
    """Get all available models configuration."""
    return {name: config for name, config in MODELS_CONFIG.items() if config.enabled}


def get_model_info(provider: str, model_id: str) -> ModelInfo | None:
    """Get information about a specific model."""
    if provider not in MODELS_CONFIG:
        return None

    provider_config = MODELS_CONFIG[provider]
    if not provider_config.enabled:
        return None

    for model in provider_config.models:
        if model.id == model_id:
            return model

    return None


def get_generation_models() -> List[ModelInfo]:
    """Get all models that support generation."""
    models = []
    for provider_config in get_available_models().values():
        models.extend([m for m in provider_config.models if m.supports_generation])
    return models


def get_evaluation_models() -> List[ModelInfo]:
    """Get all models that support evaluation."""
    models = []
    for provider_config in get_available_models().values():
        models.extend([m for m in provider_config.models if m.supports_evaluation])
    return models


def is_valid_model_combination(
    generation_provider: str,
    generation_model: str,
    evaluation_provider: str,
    evaluation_model: str,
) -> bool:
    """Check if the provider/model combination is valid."""
    gen_model = get_model_info(generation_provider, generation_model)
    eval_model = get_model_info(evaluation_provider, evaluation_model)

    return (
        gen_model is not None
        and gen_model.supports_generation
        and eval_model is not None
        and eval_model.supports_evaluation
    )
