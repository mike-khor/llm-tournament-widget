"""
API endpoints for model configuration and availability.
"""

from typing import Dict, List

from app.core.models_config import (
    ModelInfo,
    ProviderConfig,
    get_available_models,
    get_evaluation_models,
    get_generation_models,
    get_model_info,
)
from fastapi import APIRouter

router = APIRouter()


@router.get("/", response_model=Dict[str, ProviderConfig])
async def get_models():
    """
    Get all available providers and their models.

    Returns:
        Dictionary of provider configurations with their available models
    """
    return get_available_models()


@router.get("/generation", response_model=List[ModelInfo])
async def get_models_for_generation():
    """
    Get all models that can be used for generation.

    Returns:
        List of models that support generation
    """
    return get_generation_models()


@router.get("/evaluation", response_model=List[ModelInfo])
async def get_models_for_evaluation():
    """
    Get all models that can be used for evaluation.

    Returns:
        List of models that support evaluation
    """
    return get_evaluation_models()


@router.get("/{provider}/{model_id}", response_model=ModelInfo)
async def get_model_details(provider: str, model_id: str):
    """
    Get detailed information about a specific model.

    Args:
        provider: Provider name (e.g., 'openai', 'claude')
        model_id: Model identifier (e.g., 'gpt-4o-mini')

    Returns:
        Detailed model information

    Raises:
        404: If model not found
    """
    from fastapi import HTTPException

    model_info = get_model_info(provider, model_id)
    if model_info is None:
        raise HTTPException(
            status_code=404,
            detail=f"Model {model_id} not found for provider {provider}",
        )

    return model_info
