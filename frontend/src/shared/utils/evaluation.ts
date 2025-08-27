import { EvaluationCriterion, PromptResult, EvaluationHistory } from '../types/api';

/**
 * Validates if the total weight of criteria equals 1.0 (with small tolerance for floating point precision)
 */
export const validateCriteriaWeights = (criteria: EvaluationCriterion[]): boolean => {
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  return Math.abs(totalWeight - 1.0) < 0.001;
};

/**
 * Gets the IDs of prompts with the highest scores (handles ties)
 */
export const getBestPromptIds = (results: PromptResult[]): string[] => {
  if (!results || results.length === 0) return [];
  
  const maxScore = Math.max(...results.map(r => r.total_score));
  return results
    .filter(r => Math.abs(r.total_score - maxScore) < 0.001)
    .map(r => r.prompt_id);
};

/**
 * Formats a score as a percentage with one decimal place
 */
export const formatScore = (score: number): string => {
  return (score * 100).toFixed(1);
};

/**
 * Formats execution time in seconds with two decimal places
 */
export const formatTime = (seconds: number): string => {
  return `${seconds.toFixed(2)}s`;
};

/**
 * Formats a date string for display in the history panel
 */
export const formatHistoryDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

/**
 * Extracts a summary of evaluation data for history display
 */
export const getEvaluationSummary = (historyItem: EvaluationHistory) => {
  const requestData = historyItem.request_data;
  const responseData = historyItem.response_data;
  
  const promptCount = requestData.prompts?.length || 0;
  const testInput = requestData.test_input || '';
  const criteriaCount = requestData.criteria?.length || 0;
  const topScore = responseData.results?.reduce((max: number, result: any) => 
    Math.max(max, result.total_score || 0), 0) || 0;

  return {
    promptCount,
    testInput: testInput.length > 50 ? `${testInput.substring(0, 50)}...` : testInput,
    criteriaCount,
    topScore: formatScore(topScore),
  };
};

/**
 * Validates that all prompts and criteria have non-empty content
 */
export const validateFormContent = (
  prompts: string[], 
  criteria: EvaluationCriterion[], 
  testInput: string
): boolean => {
  return testInput.trim() !== '' && 
         prompts.every(p => p.trim() !== '') && 
         criteria.every(c => c.name.trim() !== '' && c.description.trim() !== '');
};

/**
 * Checks if a form is fully valid for submission
 */
export const isFormValid = (
  prompts: string[], 
  criteria: EvaluationCriterion[], 
  testInput: string
): boolean => {
  return validateFormContent(prompts, criteria, testInput) && 
         validateCriteriaWeights(criteria);
};