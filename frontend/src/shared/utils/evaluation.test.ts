import { describe, it, expect } from 'vitest';
import {
  validateCriteriaWeights,
  getBestPromptIds,
  formatScore,
  formatTime,
  formatHistoryDate,
  getEvaluationSummary,
  validateFormContent,
  isFormValid
} from './evaluation';
import type { EvaluationCriterion, PromptResult, EvaluationHistory } from '../types/api';

describe('Evaluation Utilities', () => {
  describe('validateCriteriaWeights', () => {
    it('should return true for weights that sum to 1.0', () => {
      const criteria: EvaluationCriterion[] = [
        { name: 'accuracy', description: 'Test', weight: 0.3, score_type: 'continuous' },
        { name: 'relevance', description: 'Test', weight: 0.4, score_type: 'continuous' },
        { name: 'clarity', description: 'Test', weight: 0.3, score_type: 'continuous' }
      ];
      
      expect(validateCriteriaWeights(criteria)).toBe(true);
    });

    it('should return true for weights that sum close to 1.0 (floating point tolerance)', () => {
      const criteria: EvaluationCriterion[] = [
        { name: 'accuracy', description: 'Test', weight: 0.33333, score_type: 'continuous' },
        { name: 'relevance', description: 'Test', weight: 0.33333, score_type: 'continuous' },
        { name: 'clarity', description: 'Test', weight: 0.33334, score_type: 'continuous' }
      ];
      
      expect(validateCriteriaWeights(criteria)).toBe(true);
    });

    it('should return false for weights that do not sum to 1.0', () => {
      const criteria: EvaluationCriterion[] = [
        { name: 'accuracy', description: 'Test', weight: 0.5, score_type: 'continuous' },
        { name: 'relevance', description: 'Test', weight: 0.3, score_type: 'continuous' }
      ];
      
      expect(validateCriteriaWeights(criteria)).toBe(false);
    });

    it('should handle empty criteria array', () => {
      expect(validateCriteriaWeights([])).toBe(false);
    });

    it('should handle single criterion with weight 1.0', () => {
      const criteria: EvaluationCriterion[] = [
        { name: 'accuracy', description: 'Test', weight: 1.0, score_type: 'continuous' }
      ];
      
      expect(validateCriteriaWeights(criteria)).toBe(true);
    });
  });

  describe('getBestPromptIds', () => {
    const mockResults: PromptResult[] = [
      {
        prompt_id: 'prompt-1',
        prompt: 'Prompt 1',
        generation_evaluation_results: [],
        final_scores: {},
        total_score: 0.85,
        execution_time: 1.0,
        generation_count: 3,
        evaluation_count: 3
      },
      {
        prompt_id: 'prompt-2',
        prompt: 'Prompt 2',
        generation_evaluation_results: [],
        final_scores: {},
        total_score: 0.92,
        execution_time: 1.2,
        generation_count: 3,
        evaluation_count: 3
      },
      {
        prompt_id: 'prompt-3',
        prompt: 'Prompt 3',
        generation_evaluation_results: [],
        final_scores: {},
        total_score: 0.92,
        execution_time: 1.1,
        generation_count: 3,
        evaluation_count: 3
      }
    ];

    it('should return IDs of prompts with highest score', () => {
      const result = getBestPromptIds(mockResults);
      expect(result).toEqual(['prompt-2', 'prompt-3']);
    });

    it('should handle single best prompt', () => {
      const singleBest = [mockResults[0], mockResults[1]];
      const result = getBestPromptIds(singleBest);
      expect(result).toEqual(['prompt-2']);
    });

    it('should handle empty results array', () => {
      const result = getBestPromptIds([]);
      expect(result).toEqual([]);
    });

    it('should handle null/undefined results', () => {
      expect(getBestPromptIds(null as any)).toEqual([]);
      expect(getBestPromptIds(undefined as any)).toEqual([]);
    });

    it('should handle all prompts having same score', () => {
      const sameScores = mockResults.map(r => ({ ...r, total_score: 0.85 }));
      const result = getBestPromptIds(sameScores);
      expect(result).toEqual(['prompt-1', 'prompt-2', 'prompt-3']);
    });
  });

  describe('formatScore', () => {
    it('should format score as percentage with one decimal', () => {
      expect(formatScore(0.856)).toBe('85.6');
      expect(formatScore(0.9)).toBe('90.0');
      expect(formatScore(1)).toBe('100.0');
      expect(formatScore(0)).toBe('0.0');
    });

    it('should handle edge cases', () => {
      expect(formatScore(0.001)).toBe('0.1');
      expect(formatScore(0.999)).toBe('99.9');
    });
  });

  describe('formatTime', () => {
    it('should format time with two decimal places and "s" suffix', () => {
      expect(formatTime(1.234)).toBe('1.23s');
      expect(formatTime(0.1)).toBe('0.10s');
      expect(formatTime(10)).toBe('10.00s');
    });
  });

  describe('formatHistoryDate', () => {
    it('should format date string consistently', () => {
      const dateString = '2023-12-01T14:30:45Z';
      const result = formatHistoryDate(dateString);
      
      // We can't test exact output due to timezone differences, 
      // but we can verify it contains expected components
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Date part
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Time part
      expect(result).toContain(' '); // Space between date and time
    });
  });

  describe('getEvaluationSummary', () => {
    const mockHistoryItem: EvaluationHistory = {
      id: 1,
      evaluation_id: 'eval-1',
      request_data: {
        prompts: ['Prompt 1', 'Prompt 2'],
        test_input: 'This is a test input that might be quite long and needs truncation',
        criteria: [
          { name: 'accuracy', description: 'Test', weight: 0.5, score_type: 'continuous' },
          { name: 'relevance', description: 'Test', weight: 0.5, score_type: 'continuous' }
        ]
      },
      response_data: {
        results: [
          { total_score: 0.85 },
          { total_score: 0.92 }
        ]
      },
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };

    it('should extract correct summary information', () => {
      const summary = getEvaluationSummary(mockHistoryItem);
      
      expect(summary.promptCount).toBe(2);
      expect(summary.criteriaCount).toBe(2);
      expect(summary.topScore).toBe('92.0');
      expect(summary.testInput).toBe('This is a test input that might be quite long and ...');
    });

    it('should handle short test input without truncation', () => {
      const shortInput = {
        ...mockHistoryItem,
        request_data: {
          ...mockHistoryItem.request_data,
          test_input: 'Short input'
        }
      };
      
      const summary = getEvaluationSummary(shortInput);
      expect(summary.testInput).toBe('Short input');
    });

    it('should handle missing data gracefully', () => {
      const incompleteData: EvaluationHistory = {
        id: 1,
        evaluation_id: 'eval-1',
        request_data: {},
        response_data: {},
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };
      
      const summary = getEvaluationSummary(incompleteData);
      
      expect(summary.promptCount).toBe(0);
      expect(summary.criteriaCount).toBe(0);
      expect(summary.topScore).toBe('0.0');
      expect(summary.testInput).toBe('');
    });
  });

  describe('validateFormContent', () => {
    const validCriteria: EvaluationCriterion[] = [
      { name: 'accuracy', description: 'Test accuracy', weight: 0.5, score_type: 'continuous' },
      { name: 'relevance', description: 'Test relevance', weight: 0.5, score_type: 'continuous' }
    ];

    it('should return true for valid form content', () => {
      const prompts = ['Prompt 1', 'Prompt 2'];
      const testInput = 'Valid test input';
      
      expect(validateFormContent(prompts, validCriteria, testInput)).toBe(true);
    });

    it('should return false for empty test input', () => {
      const prompts = ['Prompt 1'];
      const testInput = '   '; // Empty or whitespace
      
      expect(validateFormContent(prompts, validCriteria, testInput)).toBe(false);
    });

    it('should return false for empty prompts', () => {
      const prompts = ['Prompt 1', '', 'Prompt 3'];
      const testInput = 'Valid test input';
      
      expect(validateFormContent(prompts, validCriteria, testInput)).toBe(false);
    });

    it('should return false for criteria with empty names or descriptions', () => {
      const invalidCriteria: EvaluationCriterion[] = [
        { name: '', description: 'Test', weight: 0.5, score_type: 'continuous' },
        { name: 'relevance', description: '   ', weight: 0.5, score_type: 'continuous' }
      ];
      const prompts = ['Prompt 1'];
      const testInput = 'Valid test input';
      
      expect(validateFormContent(prompts, invalidCriteria, testInput)).toBe(false);
    });
  });

  describe('isFormValid', () => {
    const validCriteria: EvaluationCriterion[] = [
      { name: 'accuracy', description: 'Test accuracy', weight: 0.3, score_type: 'continuous' },
      { name: 'relevance', description: 'Test relevance', weight: 0.4, score_type: 'continuous' },
      { name: 'clarity', description: 'Test clarity', weight: 0.3, score_type: 'continuous' }
    ];

    it('should return true for completely valid form', () => {
      const prompts = ['Prompt 1', 'Prompt 2'];
      const testInput = 'Valid test input';
      
      expect(isFormValid(prompts, validCriteria, testInput)).toBe(true);
    });

    it('should return false if content validation fails', () => {
      const prompts = ['Prompt 1', ''];
      const testInput = 'Valid test input';
      
      expect(isFormValid(prompts, validCriteria, testInput)).toBe(false);
    });

    it('should return false if weight validation fails', () => {
      const invalidWeightCriteria: EvaluationCriterion[] = [
        { name: 'accuracy', description: 'Test', weight: 0.5, score_type: 'continuous' },
        { name: 'relevance', description: 'Test', weight: 0.3, score_type: 'continuous' }
      ];
      const prompts = ['Prompt 1'];
      const testInput = 'Valid test input';
      
      expect(isFormValid(prompts, invalidWeightCriteria, testInput)).toBe(false);
    });
  });
});