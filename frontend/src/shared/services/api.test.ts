import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiService } from './api';
import type { PromptEvaluationRequest, EvaluationResponse, EvaluationHistory, ProviderInfo } from '../types/api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiService', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('request method', () => {
    it('should make successful API calls', async () => {
      const mockResponse = { status: 'ok' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.healthCheck();
      
      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/health',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle API errors with detailed messages', async () => {
      const errorResponse = {
        detail: [
          { msg: 'Field required', type: 'missing', loc: ['prompts'] },
          { msg: 'Invalid value', type: 'value_error', loc: ['test_input'] }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve(errorResponse),
      });

      await expect(apiService.healthCheck()).rejects.toThrow('Field required, Invalid value');
    });

    it('should handle simple error messages', async () => {
      const errorResponse = { detail: 'Simple error message' };
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve(errorResponse),
      });

      await expect(apiService.healthCheck()).rejects.toThrow('Simple error message');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiService.healthCheck()).rejects.toThrow('Network error');
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(apiService.healthCheck()).rejects.toThrow('HTTP error! status: 500');
    });
  });

  describe('evaluatePrompts', () => {
    it('should send correct request for evaluation', async () => {
      const mockRequest: PromptEvaluationRequest = {
        prompts: ['Test prompt 1', 'Test prompt 2'],
        test_input: 'Test input',
        expected_output: 'Expected output',
        criteria: [
          {
            name: 'accuracy',
            description: 'How accurate is the response?',
            weight: 0.5,
            score_type: 'continuous'
          }
        ],
        generation_count: 3,
        evaluation_count: 2
      };

      const mockResponse: EvaluationResponse = {
        evaluation_id: 'test-id',
        timestamp: '2023-01-01T00:00:00Z',
        results: [],
        criteria: mockRequest.criteria!,
        status: 'completed',
        generation_provider: 'openai',
        generation_model: 'gpt-4o-mini',
        evaluation_provider: 'openai',
        evaluation_model: 'gpt-4o-mini'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.evaluatePrompts(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/evaluate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockRequest),
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });
  });

  describe('getEvaluationHistory', () => {
    it('should fetch evaluation history with default limit', async () => {
      const mockHistory: EvaluationHistory[] = [
        {
          id: 1,
          evaluation_id: 'eval-1',
          request_data: { prompts: ['test'] },
          response_data: { results: [] },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistory),
      });

      const result = await apiService.getEvaluationHistory();

      expect(result).toEqual(mockHistory);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/evaluations?limit=10',
        expect.any(Object)
      );
    });

    it('should fetch evaluation history with custom limit', async () => {
      const mockHistory: EvaluationHistory[] = [];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistory),
      });

      await apiService.getEvaluationHistory(20);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/evaluations?limit=20',
        expect.any(Object)
      );
    });
  });

  describe('getEvaluationById', () => {
    it('should fetch specific evaluation by ID', async () => {
      const evaluationId = 'test-eval-id';
      const mockResponse: EvaluationResponse = {
        evaluation_id: evaluationId,
        timestamp: '2023-01-01T00:00:00Z',
        results: [],
        criteria: [],
        status: 'completed',
        generation_provider: 'openai',
        generation_model: 'gpt-4o-mini',
        evaluation_provider: 'openai',
        evaluation_model: 'gpt-4o-mini'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.getEvaluationById(evaluationId);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8000/api/v1/evaluations/${evaluationId}`,
        expect.any(Object)
      );
    });
  });

  describe('getProviderInfo', () => {
    it('should fetch provider information', async () => {
      const mockProviderInfo: ProviderInfo = {
        current_provider: 'openai',
        model: 'gpt-4',
        configured_provider: 'openai',
        available_providers: ['openai', 'claude']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProviderInfo),
      });

      const result = await apiService.getProviderInfo();

      expect(result).toEqual(mockProviderInfo);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/provider',
        expect.any(Object)
      );
    });
  });

  describe('environment configuration', () => {
    it('should use correct API base URL in requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      });

      await apiService.healthCheck();
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:8000'),
        expect.any(Object)
      );
    });
  });
});