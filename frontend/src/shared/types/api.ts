// Types based on the API models from /api/app/core/models.py

export type ScoreType = 'continuous' | 'binary' | 'likert';

export interface EvaluationCriterion {
  name: string;
  description: string;
  weight: number;
  score_type: ScoreType;
}

export interface PromptEvaluationRequest {
  prompts: string[];
  test_input: string;
  expected_output?: string;
  criteria?: EvaluationCriterion[];
  generation_count?: number;
  evaluation_count?: number;
}

export interface GenerationResult {
  generation_id: string;
  output: string;
  generation_time: number;
}

export interface EvaluationResult {
  evaluation_id: string;
  scores: Record<string, number>;
  reasoning: Record<string, string>;
  evaluation_time: number;
}

export interface GenerationEvaluationResult {
  generation_result: GenerationResult;
  evaluation_results: EvaluationResult[];
  aggregated_scores: Record<string, number>;
  aggregated_reasoning: Record<string, string[]>;
}

export interface PromptResult {
  prompt_id: string;
  prompt: string;
  generation_evaluation_results: GenerationEvaluationResult[];
  final_scores: Record<string, number>;
  score_std_devs?: Record<string, number>;
  total_score: number;
  execution_time: number;
  generation_count: number;
  evaluation_count: number;
}

export interface EvaluationResponse {
  evaluation_id: string;
  timestamp: string;
  results: PromptResult[];
  criteria: EvaluationCriterion[];
  status: string;
}

export interface ProviderInfo {
  current_provider: string;
  model: string;
  configured_provider: string;
  available_providers: string[];
}

export interface ApiError {
  detail: string | Array<{ msg: string; type: string; loc: string[] }>;
}