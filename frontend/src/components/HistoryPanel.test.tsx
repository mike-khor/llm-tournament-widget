import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HistoryPanel } from './HistoryPanel';
import { apiService } from '../shared/services/api';
import type { EvaluationHistory, EvaluationResponse } from '../shared/types/api';

// Mock the API service
vi.mock('../shared/services/api', () => ({
  apiService: {
    getEvaluationHistory: vi.fn(),
    getEvaluationById: vi.fn(),
  }
}));

const mockApiService = apiService as any;

describe('HistoryPanel', () => {
  const mockOnClose = vi.fn();
  const mockOnSelectEvaluation = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSelectEvaluation: mockOnSelectEvaluation,
  };

  const mockEvaluationHistory: EvaluationHistory[] = [
    {
      id: 1,
      evaluation_id: 'eval-123',
      request_data: {
        prompts: ['Test prompt 1', 'Test prompt 2'],
        test_input: 'What is the capital of France?',
        criteria: [
          { name: 'accuracy', description: 'Test accuracy', weight: 0.6, score_type: 'continuous' },
          { name: 'relevance', description: 'Test relevance', weight: 0.4, score_type: 'continuous' }
        ]
      },
      response_data: {
        results: [
          { total_score: 0.85 },
          { total_score: 0.92 }
        ]
      },
      created_at: '2023-01-01T12:00:00Z',
      updated_at: '2023-01-01T12:00:00Z'
    },
    {
      id: 2,
      evaluation_id: 'eval-456',
      request_data: {
        prompts: ['Another prompt'],
        test_input: 'This is a very long test input that should be truncated when displayed in the history panel to ensure it fits nicely',
        criteria: [
          { name: 'clarity', description: 'Test clarity', weight: 1.0, score_type: 'continuous' }
        ]
      },
      response_data: {
        results: [
          { total_score: 0.75 }
        ]
      },
      created_at: '2023-01-02T14:30:00Z',
      updated_at: '2023-01-02T14:30:00Z'
    }
  ];

  const mockEvaluationResponse: EvaluationResponse = {
    evaluation_id: 'eval-123',
    timestamp: '2023-01-01T12:00:00Z',
    results: [],
    criteria: [],
    status: 'completed',
    generation_provider: 'openai',
    generation_model: 'gpt-4o-mini',
    evaluation_provider: 'openai',
    evaluation_model: 'gpt-4o-mini'
  };

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSelectEvaluation.mockClear();
    mockApiService.getEvaluationHistory.mockClear();
    mockApiService.getEvaluationById.mockClear();
  });

  describe('Panel Visibility and Animation', () => {
    it('should not render panel when closed', () => {
      render(<HistoryPanel {...defaultProps} isOpen={false} />);
      
      const panel = document.querySelector('.translate-x-0');
      expect(panel).not.toBeInTheDocument();
      
      const closedPanel = document.querySelector('.-translate-x-full');
      expect(closedPanel).toBeInTheDocument();
    });

    it('should render panel when open', () => {
      render(<HistoryPanel {...defaultProps} isOpen={true} />);
      
      expect(screen.getByText('Evaluation History')).toBeInTheDocument();
    });

    it('should render overlay when open', () => {
      render(<HistoryPanel {...defaultProps} isOpen={true} />);
      
      const overlay = document.querySelector('.bg-black.bg-opacity-25');
      expect(overlay).toBeInTheDocument();
    });

    it('should call onClose when overlay is clicked', () => {
      render(<HistoryPanel {...defaultProps} />);
      
      const overlay = document.querySelector('.bg-black.bg-opacity-25');
      if (overlay) {
        fireEvent.click(overlay);
      }
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when close button is clicked', () => {
      render(<HistoryPanel {...defaultProps} />);
      
      const closeButton = document.querySelector('button svg[viewBox="0 0 24 24"] path[d="M6 18L18 6M6 6l12 12"]')?.closest('button');
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('History Loading', () => {
    it('should load history when panel opens', async () => {
      mockApiService.getEvaluationHistory.mockResolvedValueOnce(mockEvaluationHistory);
      
      render(<HistoryPanel {...defaultProps} />);
      
      expect(mockApiService.getEvaluationHistory).toHaveBeenCalledWith(20);
    });

    it('should not load history when panel is closed', () => {
      render(<HistoryPanel {...defaultProps} isOpen={false} />);
      
      expect(mockApiService.getEvaluationHistory).not.toHaveBeenCalled();
    });

    it('should show loading state while fetching history', async () => {
      mockApiService.getEvaluationHistory.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<HistoryPanel {...defaultProps} />);
      
      expect(screen.getByText('Loading history...')).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should display history items after successful load', async () => {
      mockApiService.getEvaluationHistory.mockResolvedValueOnce(mockEvaluationHistory);
      
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
      });
      
      expect(screen.getByText('2 prompts • 2 criteria')).toBeInTheDocument();
      expect(screen.getByText('1 prompt • 1 criteria')).toBeInTheDocument();
    });

    it('should show empty state when no history is found', async () => {
      mockApiService.getEvaluationHistory.mockResolvedValueOnce([]);
      
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('No evaluation history found')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Run some evaluations to see them here')).toBeInTheDocument();
    });

    it('should handle error state correctly', async () => {
      const errorMessage = 'Failed to fetch history';
      mockApiService.getEvaluationHistory.mockRejectedValueOnce(new Error(errorMessage));
      
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
      
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });
  });

  describe('History Item Display', () => {
    beforeEach(async () => {
      mockApiService.getEvaluationHistory.mockResolvedValueOnce(mockEvaluationHistory);
    });

    it('should display correct evaluation summary information', async () => {
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('92.0%')).toBeInTheDocument(); // Top score from first evaluation
        expect(screen.getByText('75.0%')).toBeInTheDocument(); // Score from second evaluation
      });
    });

    it('should truncate long test input text', async () => {
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        const truncatedText = screen.getByText(/This is a very long test input that should be/);
        expect(truncatedText.textContent).toContain('...');
      });
    });

    it('should display formatted date correctly', async () => {
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        // Dates should be formatted - exact format depends on locale but should contain date components
        const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });

    it('should show evaluation ID prefix', async () => {
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('ID: eval-123...')).toBeInTheDocument();
        expect(screen.getByText('ID: eval-456...')).toBeInTheDocument();
      });
    });
  });

  describe('Evaluation Selection', () => {
    beforeEach(async () => {
      mockApiService.getEvaluationHistory.mockResolvedValueOnce(mockEvaluationHistory);
    });

    it('should load and select evaluation when item is clicked', async () => {
      mockApiService.getEvaluationById.mockResolvedValueOnce(mockEvaluationResponse);
      
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
      });
      
      const evaluationItem = screen.getByText('What is the capital of France?').closest('div');
      fireEvent.click(evaluationItem!);
      
      await waitFor(() => {
        expect(mockApiService.getEvaluationById).toHaveBeenCalledWith('eval-123');
        expect(mockOnSelectEvaluation).toHaveBeenCalledWith(
          mockEvaluationResponse,
          mockEvaluationHistory[0].request_data
        );
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle error when loading specific evaluation', async () => {
      const errorMessage = 'Failed to load evaluation';
      mockApiService.getEvaluationById.mockRejectedValueOnce(new Error(errorMessage));
      
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
      });
      
      const evaluationItem = screen.getByText('What is the capital of France?').closest('div');
      fireEvent.click(evaluationItem!);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
      
      expect(mockOnSelectEvaluation).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh history when refresh button is clicked', async () => {
      mockApiService.getEvaluationHistory
        .mockResolvedValueOnceCallback(() => Promise.resolve([]))
        .mockResolvedValueOnce(mockEvaluationHistory);
      
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('No evaluation history found')).toBeInTheDocument();
      });
      
      const refreshButton = screen.getByText('Refresh History');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(mockApiService.getEvaluationHistory).toHaveBeenCalledTimes(2);
      });
    });

    it('should disable refresh button while loading', async () => {
      mockApiService.getEvaluationHistory.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        const refreshButton = screen.getByText('Loading...');
        expect(refreshButton.closest('button')).toBeDisabled();
      });
    });

    it('should retry loading from error state', async () => {
      mockApiService.getEvaluationHistory
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockEvaluationHistory);
      
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
      
      const tryAgainButton = screen.getByText('Try again');
      fireEvent.click(tryAgainButton);
      
      await waitFor(() => {
        expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
      });
    });
  });

  describe('Data Formatting and Display', () => {
    beforeEach(async () => {
      mockApiService.getEvaluationHistory.mockResolvedValueOnce(mockEvaluationHistory);
    });

    it('should handle pluralization correctly', async () => {
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2 prompts • 2 criteria')).toBeInTheDocument();
        expect(screen.getByText('1 prompt • 1 criteria')).toBeInTheDocument();
      });
    });

    it('should display highest score from results', async () => {
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        // First evaluation has scores [0.85, 0.92] - should show 92.0%
        expect(screen.getByText('92.0%')).toBeInTheDocument();
        // Second evaluation has score [0.75] - should show 75.0%
        expect(screen.getByText('75.0%')).toBeInTheDocument();
      });
    });

    it('should handle missing or malformed data gracefully', async () => {
      const malformedHistory = [{
        ...mockEvaluationHistory[0],
        request_data: {},
        response_data: {}
      }];
      
      mockApiService.getEvaluationHistory.mockResolvedValueOnce(malformedHistory);
      
      render(<HistoryPanel {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('0 prompts • 0 criteria')).toBeInTheDocument();
        expect(screen.getByText('0.0%')).toBeInTheDocument();
      });
    });
  });
});