"""
Evaluation service using configurable LLM providers.
"""

import asyncio
import logging
import uuid
from datetime import datetime
from typing import List, Optional

from app.core.models import (
    EvaluationCriterion, 
    PromptResult, 
    GenerationResult,
    EvaluationResult,
    GenerationEvaluationResult
)
from app.services.llm_providers import LLMProvider, LLMProviderError
from app.services.provider_factory import create_llm_provider

logger = logging.getLogger(__name__)

__all__ = ["EvaluationService", "EvaluationError"]


class EvaluationError(Exception):
    """Custom exception for evaluation errors."""
    pass


class EvaluationService:
    """Service for evaluating prompts using configurable LLM providers."""

    def __init__(self, provider: Optional[LLMProvider] = None):
        """
        Initialize evaluation service.
        
        Args:
            provider: LLM provider instance. If None, creates one using factory.
        """
        self.provider = provider or create_llm_provider()
        logger.info(f"Initialized evaluation service with provider: {type(self.provider).__name__}")

    async def generate_response(self, prompt: str, test_input: str) -> str:
        """Generate response using the configured LLM provider."""
        try:
            return await self.provider.generate_response(prompt, test_input)
        except LLMProviderError as e:
            logger.error(f"Provider error during generation: {e}")
            raise EvaluationError(f"Failed to generate response: {e}")
        except Exception as e:
            logger.error(f"Unexpected error during generation: {e}")
            raise EvaluationError(f"Unexpected generation error: {e}")

    async def evaluate_response(
        self,
        output: str,
        criterion: EvaluationCriterion,
        test_input: str,
        expected_output: Optional[str] = None,
    ) -> tuple[float, str]:
        """Evaluate a single response against one criterion using LLM-as-a-Judge."""
        try:
            return await self.provider.evaluate_response(
                output=output,
                criterion_name=criterion.name,
                criterion_description=criterion.description,
                test_input=test_input,
                expected_output=expected_output
            )
        except LLMProviderError as e:
            logger.error(f"Provider error during evaluation: {e}")
            return 0.5, f"Evaluation failed: {e}"
        except Exception as e:
            logger.error(f"Unexpected error during evaluation: {e}")
            return 0.5, f"Unexpected evaluation error: {e}"

    async def generate_multiple_responses(
        self,
        prompt: str,
        test_input: str,
        generation_count: int = 3,
    ) -> List[GenerationResult]:
        """Generate multiple responses for a single prompt."""
        logger.info(f"Generating {generation_count} responses for prompt")
        
        generation_tasks = [
            self.generate_single_response_with_timing(prompt, test_input)
            for _ in range(generation_count)
        ]
        
        results = await asyncio.gather(*generation_tasks, return_exceptions=True)
        
        generation_results: List[GenerationResult] = []
        for i, result in enumerate(results):
            if isinstance(result, (Exception, BaseException)):
                logger.error(f"Failed generation {i}: {result}")
                generation_results.append(
                    GenerationResult(
                        generation_id=str(uuid.uuid4()),
                        output=f"Generation failed: {str(result)}",
                        generation_time=0.0,
                    )
                )
            elif isinstance(result, GenerationResult):
                generation_results.append(result)
        
        return generation_results

    async def generate_single_response_with_timing(
        self, 
        prompt: str, 
        test_input: str
    ) -> GenerationResult:
        """Generate a single response with timing."""
        start_time = datetime.now()
        generation_id = str(uuid.uuid4())
        
        try:
            output = await self.generate_response(prompt, test_input)
            generation_time = (datetime.now() - start_time).total_seconds()
            
            return GenerationResult(
                generation_id=generation_id,
                output=output,
                generation_time=generation_time,
            )
        except Exception as e:
            generation_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"Generation {generation_id} failed: {e}")
            return GenerationResult(
                generation_id=generation_id,
                output=f"Generation failed: {str(e)}",
                generation_time=generation_time,
            )

    async def evaluate_generation_multiple_times(
        self,
        generation_result: GenerationResult,
        criteria: List[EvaluationCriterion],
        test_input: str,
        expected_output: Optional[str] = None,
        evaluation_count: int = 3,
    ) -> GenerationEvaluationResult:
        """Evaluate a single generation multiple times."""
        logger.info(f"Evaluating generation {generation_result.generation_id} {evaluation_count} times")
        
        # Create evaluation tasks for each criterion and each evaluation run
        evaluation_tasks = []
        for _ in range(evaluation_count):
            for criterion in criteria:
                evaluation_tasks.append(
                    self.evaluate_single_with_timing(
                        generation_result.output, criterion, test_input, expected_output
                    )
                )
        
        all_evaluation_results = await asyncio.gather(*evaluation_tasks, return_exceptions=True)
        
        # Group results by evaluation run
        evaluation_results = []
        criteria_count = len(criteria)
        
        for eval_run in range(evaluation_count):
            eval_id = str(uuid.uuid4())
            start_idx = eval_run * criteria_count
            end_idx = start_idx + criteria_count
            
            run_results = all_evaluation_results[start_idx:end_idx]
            scores = {}
            reasoning = {}
            total_eval_time = 0.0
            
            for i, result in enumerate(run_results):
                criterion_name = criteria[i].name
                if isinstance(result, (Exception, BaseException)):
                    logger.error(f"Evaluation failed for {criterion_name}: {result}")
                    scores[criterion_name] = 0.5
                    reasoning[criterion_name] = f"Evaluation error: {str(result)}"
                    total_eval_time += 0.0
                else:
                    try:
                        score, reason, eval_time = result
                        scores[criterion_name] = score
                        reasoning[criterion_name] = reason
                        total_eval_time += eval_time
                    except (TypeError, ValueError) as e:
                        logger.error(f"Failed to unpack result for {criterion_name}: {e}")
                        scores[criterion_name] = 0.5
                        reasoning[criterion_name] = f"Result unpacking error: {str(e)}"
                        total_eval_time += 0.0
            
            evaluation_results.append(
                EvaluationResult(
                    evaluation_id=eval_id,
                    scores=scores,
                    reasoning=reasoning,
                    evaluation_time=total_eval_time,
                )
            )
        
        # Aggregate scores and reasoning across evaluations
        aggregated_scores = {}
        aggregated_reasoning = {}
        
        for criterion in criteria:
            criterion_name = criterion.name
            scores_for_criterion = [
                eval_result.scores[criterion_name] 
                for eval_result in evaluation_results
            ]
            reasoning_for_criterion = [
                eval_result.reasoning[criterion_name]
                for eval_result in evaluation_results
            ]
            
            aggregated_scores[criterion_name] = sum(scores_for_criterion) / len(scores_for_criterion)
            aggregated_reasoning[criterion_name] = reasoning_for_criterion
        
        return GenerationEvaluationResult(
            generation_result=generation_result,
            evaluation_results=evaluation_results,
            aggregated_scores=aggregated_scores,
            aggregated_reasoning=aggregated_reasoning,
        )

    async def evaluate_single_with_timing(
        self,
        output: str,
        criterion: EvaluationCriterion,
        test_input: str,
        expected_output: Optional[str] = None,
    ) -> tuple[float, str, float]:
        """Evaluate a single response against one criterion with timing."""
        start_time = datetime.now()
        
        try:
            score, reasoning = await self.evaluate_response(output, criterion, test_input, expected_output)
            evaluation_time = (datetime.now() - start_time).total_seconds()
            return score, reasoning, evaluation_time
        except Exception as e:
            evaluation_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"Evaluation failed: {e}")
            return 0.5, f"Evaluation failed: {e}", evaluation_time

    async def evaluate_prompt(
        self,
        prompt: str,
        test_input: str,
        criteria: List[EvaluationCriterion],
        expected_output: Optional[str] = None,
        generation_count: int = 3,
        evaluation_count: int = 3,
    ) -> PromptResult:
        """Evaluate a single prompt with multiple generations and evaluations."""
        start_time = datetime.now()
        prompt_id = str(uuid.uuid4())

        logger.info(
            f"Evaluating prompt {prompt_id} with {generation_count} generations, "
            f"{evaluation_count} evaluations each, {len(criteria)} criteria"
        )

        try:
            # Step 1: Generate multiple responses
            generation_results = await self.generate_multiple_responses(
                prompt, test_input, generation_count
            )

            # Step 2: Evaluate each generation multiple times
            generation_eval_tasks = [
                self.evaluate_generation_multiple_times(
                    gen_result, criteria, test_input, expected_output, evaluation_count
                )
                for gen_result in generation_results
            ]

            generation_evaluation_results = await asyncio.gather(*generation_eval_tasks)

            # Step 3: Aggregate scores across all generations and evaluations
            final_scores = {}
            total_score = 0.0
            
            for criterion in criteria:
                criterion_name = criterion.name
                all_scores_for_criterion = []
                
                for gen_eval_result in generation_evaluation_results:
                    all_scores_for_criterion.append(gen_eval_result.aggregated_scores[criterion_name])
                
                # Average across all generations
                final_scores[criterion_name] = sum(all_scores_for_criterion) / len(all_scores_for_criterion)
                total_score += final_scores[criterion_name] * criterion.weight

            # Calculate execution time
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()

            result = PromptResult(
                prompt_id=prompt_id,
                prompt=prompt,
                generation_evaluation_results=generation_evaluation_results,
                final_scores=final_scores,
                total_score=total_score,
                execution_time=execution_time,
                generation_count=generation_count,
                evaluation_count=evaluation_count,
            )

            logger.info(
                f"Completed evaluation for prompt {prompt_id}. "
                f"Final total score: {total_score:.3f}, "
                f"Execution time: {execution_time:.2f}s"
            )

            return result

        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"Failed to evaluate prompt {prompt_id}: {e}")

            # Return error result
            return PromptResult(
                prompt_id=prompt_id,
                prompt=prompt,
                generation_evaluation_results=[],
                final_scores={c.name: 0.0 for c in criteria},
                total_score=0.0,
                execution_time=execution_time,
                generation_count=generation_count,
                evaluation_count=evaluation_count,
            )

    async def evaluate_multiple_prompts(
        self,
        prompts: List[str],
        test_input: str,
        criteria: List[EvaluationCriterion],
        expected_output: Optional[str] = None,
        generation_count: int = 3,
        evaluation_count: int = 3,
    ) -> List[PromptResult]:
        """Evaluate multiple prompts against the same criteria."""
        logger.info(f"Starting batch evaluation of {len(prompts)} prompts")

        # Create evaluation tasks
        eval_tasks = [
            self.evaluate_prompt(
                prompt, test_input, criteria, expected_output, generation_count, evaluation_count
            )
            for prompt in prompts
        ]

        results = await asyncio.gather(*eval_tasks, return_exceptions=True)

        # Handle any exceptions in results
        processed_results: List[PromptResult] = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Failed to evaluate prompt {i}: {result}")
                # Create error result
                processed_results.append(
                    PromptResult(
                        prompt_id=str(uuid.uuid4()),
                        prompt=prompts[i],
                        generation_evaluation_results=[],
                        final_scores={c.name: 0.0 for c in criteria},
                        total_score=0.0,
                        execution_time=0.0,
                        generation_count=generation_count,
                        evaluation_count=evaluation_count,
                    )
                )
            elif isinstance(result, PromptResult):
                processed_results.append(result)

        # Sort by total score (descending)
        processed_results.sort(key=lambda x: x.total_score, reverse=True)

        logger.info(
            f"Completed batch evaluation. "
            f"Best score: {processed_results[0].total_score:.3f}, "
            f"Worst score: {processed_results[-1].total_score:.3f}"
        )

        return processed_results

    def get_provider_info(self) -> dict:
        """Get information about the current provider."""
        return {
            "provider_type": type(self.provider).__name__,
            "model": self.provider.model,
        }