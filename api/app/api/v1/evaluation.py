import logging
import uuid
from datetime import datetime
from typing import List, Optional

from app.core.config import settings
from app.core.models import (
    EvaluationHistory,
    EvaluationResponse,
    PromptEvaluationRequest,
)
from app.db.database import DatabaseManager, get_database
from app.services.evaluation_service import EvaluationError, EvaluationService
from app.services.provider_factory import ProviderFactory
from fastapi import APIRouter, Depends, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["evaluation"])


# Evaluation service setup
def get_evaluation_service(
    generation_provider: Optional[str] = None,
    generation_model: Optional[str] = None,
    evaluation_provider: Optional[str] = None,
    evaluation_model: Optional[str] = None,
):
    """Get evaluation service instance with specific models."""

    # Use provided values or fallback to settings defaults
    gen_provider = generation_provider or settings.llm_provider
    gen_model = generation_model or (
        settings.openai_model if gen_provider == "openai" else settings.claude_model
    )
    eval_provider = evaluation_provider or gen_provider
    eval_model = evaluation_model or gen_model

    # Create providers with specified models
    generation_provider_instance = ProviderFactory.create_provider_with_model(
        gen_provider, gen_model
    )
    evaluation_provider_instance = ProviderFactory.create_provider_with_model(
        eval_provider, eval_model
    )

    return EvaluationService(
        generation_provider=generation_provider_instance,
        evaluation_provider=evaluation_provider_instance,
    )


@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_prompts(
    request: PromptEvaluationRequest, db: DatabaseManager = Depends(get_database)
):
    """Evaluate multiple prompts and return ranked results."""

    try:
        # Validate request
        if not request.prompts:
            raise HTTPException(status_code=400, detail="No prompts provided")

        if len(request.prompts) > settings.max_prompts_per_request:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum {settings.max_prompts_per_request} prompts allowed",
            )

        logger.info(f"Starting evaluation of {len(request.prompts)} prompts")

        # Determine models to use - defaults to configuration if not provided
        gen_provider = request.generation_provider or settings.llm_provider
        gen_model = request.generation_model or (
            settings.openai_model if gen_provider == "openai" else settings.claude_model
        )
        eval_provider = request.evaluation_provider or gen_provider
        eval_model = request.evaluation_model or gen_model

        logger.info(
            f"Using models: generation={gen_provider}/{gen_model}, evaluation={eval_provider}/{eval_model}"
        )

        # Get evaluation service and perform evaluation
        evaluation_service = get_evaluation_service(
            generation_provider=gen_provider,
            generation_model=gen_model,
            evaluation_provider=eval_provider,
            evaluation_model=eval_model,
        )
        results = await evaluation_service.evaluate_multiple_prompts(  # type: ignore[attr-defined]
            prompts=request.prompts,
            test_input=request.test_input,
            criteria=request.criteria,
            expected_output=request.expected_output,
            generation_count=request.generation_count,
            evaluation_count=request.evaluation_count,
        )

        # Create response
        evaluation_id = str(uuid.uuid4())
        response = EvaluationResponse(
            evaluation_id=evaluation_id,
            timestamp=datetime.now().isoformat(),
            results=results,
            criteria=request.criteria,
            status="completed",
            generation_provider=gen_provider,
            generation_model=gen_model,
            evaluation_provider=eval_provider,
            evaluation_model=eval_model,
        )

        # Save to database (don't fail if database save fails)
        try:
            await db.save_evaluation(
                evaluation_id=evaluation_id,
                request_data=request.model_dump(),
                response_data=response.model_dump(),
                generation_provider=gen_provider,
                generation_model=gen_model,
                evaluation_provider=eval_provider,
                evaluation_model=eval_model,
            )
        except Exception as e:
            logger.exception(f"Failed to save evaluation to database: {e}")

        logger.info(f"Completed evaluation {evaluation_id}")
        return response

    except EvaluationError as e:
        logger.error(f"Evaluation error: {e}")
        raise HTTPException(status_code=422, detail=str(e))

    except Exception as e:
        logger.error(f"Unexpected error during evaluation: {e}")
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred during evaluation"
        )


@router.get("/evaluations/{evaluation_id}", response_model=EvaluationResponse)
async def get_evaluation(
    evaluation_id: str, db: DatabaseManager = Depends(get_database)
):
    """Get evaluation results by ID."""

    try:
        evaluation = await db.get_evaluation(evaluation_id)

        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")

        # Convert database response to API response
        return EvaluationResponse.model_validate(evaluation.response_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving evaluation {evaluation_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve evaluation")


@router.get("/evaluations", response_model=List[EvaluationHistory])
async def get_recent_evaluations(
    limit: int = 10, db: DatabaseManager = Depends(get_database)
):
    """Get recent evaluations."""

    try:
        if limit > 50:
            limit = 50  # Cap at 50 for performance

        evaluations = await db.get_recent_evaluations(limit)

        # Convert to response models - accessing the values, not the column objects
        history_list: List[EvaluationHistory] = []
        for eval_db in evaluations:
            history = EvaluationHistory(
                id=eval_db.id,  # type: ignore[arg-type]
                evaluation_id=eval_db.evaluation_id,  # type: ignore[arg-type]
                request_data=eval_db.request_data,  # type: ignore[arg-type]
                response_data=eval_db.response_data,  # type: ignore[arg-type]
                created_at=eval_db.created_at,  # type: ignore[arg-type]
                updated_at=eval_db.updated_at,  # type: ignore[arg-type]
            )
            history_list.append(history)
        return history_list

    except Exception as e:
        logger.error(f"Error retrieving recent evaluations: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve evaluations")


@router.get("/provider-info")
async def get_provider_info():
    """Get information about the current LLM provider."""
    try:
        evaluation_service = get_evaluation_service()
        provider_info = evaluation_service.get_provider_info()

        return {
            "current_providers": provider_info,
            "configured_provider": settings.llm_provider,
            "available_providers": ["openai", "claude"],
        }

    except Exception as e:
        logger.error(f"Error getting provider info: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to get provider information"
        )
