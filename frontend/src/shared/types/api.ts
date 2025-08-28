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
  // Model configuration
  generation_provider?: string;
  generation_model?: string;
  evaluation_provider?: string;
  evaluation_model?: string;
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
  // Model information used for this evaluation
  generation_provider: string;
  generation_model: string;
  evaluation_provider: string;
  evaluation_model: string;
}

export interface ProviderInfo {
  current_provider: string;
  model: string;
  configured_provider: string;
  available_providers: string[];
}

// Model configuration types
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  context_length: number;
  supports_generation: boolean;
  supports_evaluation: boolean;
  cost_per_1k_input_tokens: number;
  cost_per_1k_output_tokens: number;
}

export interface ProviderConfig {
  name: string;
  display_name: string;
  enabled: boolean;
  models: ModelInfo[];
}

export interface ModelsResponse {
  [providerName: string]: ProviderConfig;
}

export interface ApiError {
  detail: string | Array<{ msg: string; type: string; loc: string[] }>;
}

export interface EvaluationHistory {
  id?: number;
  evaluation_id: string;
  request_data: Record<string, any>;
  response_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}