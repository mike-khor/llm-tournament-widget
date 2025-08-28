from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ScoreType(str, Enum):
    CONTINUOUS = "continuous"
    BINARY = "binary"
    LIKERT = "likert"


class EvaluationCriterion(BaseModel):
    name: str = Field(..., description="Name of the evaluation criterion")
    description: str = Field(
        ..., description="Description of what this criterion measures"
    )
    weight: float = Field(
        1.0, ge=0.0, le=1.0, description="Weight of this criterion (0-1)"
    )
    score_type: ScoreType = Field(
        ScoreType.CONTINUOUS, description="Type of scoring scale"
    )


class PromptEvaluationRequest(BaseModel):
    prompts: List[str] = Field(
        ..., min_length=1, max_length=10, description="List of prompts to evaluate"
    )
    test_input: str = Field(..., description="Input to test the prompts against")
    expected_output: Optional[str] = Field(
        None, description="Expected output for reference"
    )
    criteria: List[EvaluationCriterion] = Field(
        default=[
            EvaluationCriterion(
                name="accuracy",
                description="How factually correct and relevant is the response?",
                weight=0.4,
                score_type=ScoreType.CONTINUOUS,
            ),
            EvaluationCriterion(
                name="helpfulness",
                description="How helpful and actionable is the response?",
                weight=0.3,
                score_type=ScoreType.CONTINUOUS,
            ),
            EvaluationCriterion(
                name="safety",
                description="Is the response safe and free from harmful content?",
                weight=0.3,
                score_type=ScoreType.CONTINUOUS,
            ),
        ],
        description="List of evaluation criteria",
    )
    generation_count: int = Field(
        3, ge=1, le=10, description="Number of generations per prompt"
    )
    evaluation_count: int = Field(
        3, ge=1, le=10, description="Number of evaluations per generation"
    )
    # Model configuration for generation and evaluation
    generation_provider: Optional[str] = Field(
        None, description="Provider to use for generation (e.g., 'openai', 'claude')"
    )
    generation_model: Optional[str] = Field(
        None, description="Model to use for generation (e.g., 'gpt-4o-mini')"
    )
    evaluation_provider: Optional[str] = Field(
        None, description="Provider to use for evaluation (e.g., 'openai', 'claude')"
    )
    evaluation_model: Optional[str] = Field(
        None, description="Model to use for evaluation (e.g., 'gpt-4o-mini')"
    )


class GenerationResult(BaseModel):
    """Result of a single generation."""

    generation_id: str = Field(..., description="Unique identifier for this generation")
    output: str = Field(..., description="Generated output from the prompt")
    generation_time: float = Field(
        ..., ge=0.0, description="Time taken to generate in seconds"
    )


class EvaluationResult(BaseModel):
    """Result of a single evaluation of a generation."""

    evaluation_id: str = Field(..., description="Unique identifier for this evaluation")
    scores: Dict[str, float] = Field(..., description="Scores for each criterion")
    reasoning: Dict[str, str] = Field(..., description="Reasoning for each score")
    evaluation_time: float = Field(
        ..., ge=0.0, description="Time taken to evaluate in seconds"
    )


class GenerationEvaluationResult(BaseModel):
    """Combined result for one generation with multiple evaluations."""

    generation_result: GenerationResult = Field(..., description="Generation result")
    evaluation_results: List[EvaluationResult] = Field(
        ..., description="Multiple evaluation results for this generation"
    )
    aggregated_scores: Dict[str, float] = Field(
        ..., description="Average scores across all evaluations for each criterion"
    )
    aggregated_reasoning: Dict[str, List[str]] = Field(
        ..., description="All reasoning explanations for each criterion"
    )


class PromptResult(BaseModel):
    """Final aggregated result for a prompt with multiple generations and evaluations."""

    prompt_id: str = Field(..., description="Unique identifier for this prompt")
    prompt: str = Field(..., description="The prompt text")
    generation_evaluation_results: List[GenerationEvaluationResult] = Field(
        ..., description="Results for each generation with its evaluations"
    )
    final_scores: Dict[str, float] = Field(
        ..., description="Final averaged scores across all generations and evaluations"
    )
    total_score: float = Field(..., ge=0.0, le=1.0, description="Weighted total score")
    execution_time: float = Field(
        ..., ge=0.0, description="Total time taken for all generations and evaluations"
    )
    generation_count: int = Field(..., description="Number of generations performed")
    evaluation_count: int = Field(
        ..., description="Number of evaluations per generation"
    )


class EvaluationResponse(BaseModel):
    evaluation_id: str = Field(..., description="Unique identifier for this evaluation")
    timestamp: str = Field(..., description="ISO timestamp of evaluation")
    results: List[PromptResult] = Field(..., description="Results for each prompt")
    criteria: List[EvaluationCriterion] = Field(
        ..., description="Criteria used for evaluation"
    )
    status: str = Field("completed", description="Status of the evaluation")
    # Model information used for this evaluation
    generation_provider: str = Field(..., description="Provider used for generation")
    generation_model: str = Field(..., description="Model used for generation")
    evaluation_provider: str = Field(..., description="Provider used for evaluation")
    evaluation_model: str = Field(..., description="Model used for evaluation")


class EvaluationHistory(BaseModel):
    id: Optional[int] = Field(None, description="Database ID")
    evaluation_id: str = Field(..., description="Unique evaluation identifier")
    request_data: dict = Field(..., description="Original request data")
    response_data: dict = Field(..., description="Response data")
    created_at: datetime = Field(
        default_factory=datetime.now, description="Creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=datetime.now, description="Last update timestamp"
    )


class HealthResponse(BaseModel):
    status: str = Field(..., description="Health status")
    timestamp: str = Field(..., description="Current timestamp")
    version: str = Field("0.1.0", description="API version")


class ErrorResponse(BaseModel):
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
    timestamp: str = Field(
        default_factory=lambda: datetime.now().isoformat(),
        description="Error timestamp",
    )
