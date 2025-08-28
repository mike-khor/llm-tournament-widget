import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { apiService } from './shared/services/api';
import type { EvaluationResponse, PromptEvaluationRequest } from './shared/types/api';

// Mock the API service
vi.mock('./shared/services/api', () => ({
  apiService: {
    evaluatePrompts: vi.fn(),
  }
}));

// Mock the components to focus on App-level logic
vi.mock('./components/EvaluationTable', () => ({
  EvaluationTable: ({ onEvaluate, results, loading, initialData, onClearHistory }: any) => (
    <div data-testid="evaluation-table">
      <div>Results: {results ? 'present' : 'null'}</div>
      <div>Loading: {loading ? 'true' : 'false'}</div>
      <div>Initial Data: {initialData ? 'present' : 'null'}</div>
      <button onClick={() => onEvaluate({ prompts: ['test'], test_input: 'test' })}>
        Evaluate
      </button>
      {onClearHistory && <button onClick={onClearHistory}>Clear History</button>}
    </div>
  )
}));

vi.mock('./components/HistoryPanel', () => ({
  HistoryPanel: ({ isOpen, onClose, onSelectEvaluation }: any) => (
    <div data-testid="history-panel">
      <div>Panel Open: {isOpen ? 'true' : 'false'}</div>
      <button onClick={onClose}>Close Panel</button>
      <button 
        onClick={() => onSelectEvaluation(
          { evaluation_id: 'test-eval' }, 
          { prompts: ['historical'], test_input: 'historical test' }
        )}
      >
        Select Historical
      </button>
    </div>
  )
}));

const mockApiService = apiService as any;

describe('App', () => {
  const mockEvaluationResponse: EvaluationResponse = {
    evaluation_id: 'test-eval-id',
    timestamp: '2023-01-01T00:00:00Z',
    results: [{
      prompt_id: 'prompt-1',
      prompt: 'Test prompt',
      generation_evaluation_results: [],
      final_scores: { accuracy: 0.85 },
      total_score: 0.85,
      execution_time: 1.2,
      generation_count: 3,
      evaluation_count: 3
    }],
    criteria: [{ name: 'accuracy', description: 'Test', weight: 1.0, score_type: 'continuous' }],
    status: 'completed',
    generation_provider: 'openai',
    generation_model: 'gpt-4o-mini',
    evaluation_provider: 'openai',
    evaluation_model: 'gpt-4o-mini'
  };

  beforeEach(() => {
    mockApiService.evaluatePrompts.mockClear();
  });

  describe('Initial Render', () => {
    it('should render the app with all main components', () => {
      render(<App />);
      
      expect(screen.getByTestId('evaluation-table')).toBeInTheDocument();
      expect(screen.getByTestId('history-panel')).toBeInTheDocument();
      expect(screen.getByText('Results: null')).toBeInTheDocument();
      expect(screen.getByText('Loading: false')).toBeInTheDocument();
      expect(screen.getByText('Initial Data: null')).toBeInTheDocument();
    });

    it('should render history toggle button', () => {
      render(<App />);
      
      const historyButton = screen.getByTitle('Toggle Evaluation History');
      expect(historyButton).toBeInTheDocument();
    });

    it('should render footer text', () => {
      render(<App />);
      
      expect(screen.getByText('Powered by FastAPI backend with support for multiple LLM providers')).toBeInTheDocument();
    });

    it('should start with history panel closed', () => {
      render(<App />);
      
      expect(screen.getByText('Panel Open: false')).toBeInTheDocument();
    });
  });

  describe('History Panel Toggle', () => {
    it('should open history panel when toggle button is clicked', () => {
      render(<App />);
      
      const historyButton = screen.getByTitle('Toggle Evaluation History');
      fireEvent.click(historyButton);
      
      expect(screen.getByText('Panel Open: true')).toBeInTheDocument();
    });

    it('should close history panel when close button is clicked', () => {
      render(<App />);
      
      // Open the panel first
      const historyButton = screen.getByTitle('Toggle Evaluation History');
      fireEvent.click(historyButton);
      expect(screen.getByText('Panel Open: true')).toBeInTheDocument();
      
      // Then close it
      const closeButton = screen.getByText('Close Panel');
      fireEvent.click(closeButton);
      expect(screen.getByText('Panel Open: false')).toBeInTheDocument();
    });

    it('should toggle history panel state correctly', () => {
      render(<App />);
      
      const historyButton = screen.getByTitle('Toggle Evaluation History');
      
      // Initially closed
      expect(screen.getByText('Panel Open: false')).toBeInTheDocument();
      
      // Click to open
      fireEvent.click(historyButton);
      expect(screen.getByText('Panel Open: true')).toBeInTheDocument();
      
      // Click to close
      fireEvent.click(historyButton);
      expect(screen.getByText('Panel Open: false')).toBeInTheDocument();
    });
  });

  describe('Evaluation Handling', () => {
    it('should call API and update results on successful evaluation', async () => {
      mockApiService.evaluatePrompts.mockResolvedValueOnce(mockEvaluationResponse);
      
      render(<App />);
      
      const evaluateButton = screen.getByText('Evaluate');
      fireEvent.click(evaluateButton);
      
      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Loading: true')).toBeInTheDocument();
      });
      
      // Should call API
      expect(mockApiService.evaluatePrompts).toHaveBeenCalledWith({
        prompts: ['test'],
        test_input: 'test'
      });
      
      // Should update results after API call
      await waitFor(() => {
        expect(screen.getByText('Loading: false')).toBeInTheDocument();
        expect(screen.getByText('Results: present')).toBeInTheDocument();
      });
    });

    it('should show error message on evaluation failure', async () => {
      const errorMessage = 'Evaluation failed';
      mockApiService.evaluatePrompts.mockRejectedValueOnce(new Error(errorMessage));
      
      render(<App />);
      
      const evaluateButton = screen.getByText('Evaluate');
      fireEvent.click(evaluateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Error occurred')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
      
      // Loading should be false after error
      expect(screen.getByText('Loading: false')).toBeInTheDocument();
    });

    it('should handle non-Error exceptions gracefully', async () => {
      mockApiService.evaluatePrompts.mockRejectedValueOnce('String error');
      
      render(<App />);
      
      const evaluateButton = screen.getByText('Evaluate');
      fireEvent.click(evaluateButton);
      
      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
      });
    });

    it('should dismiss error when dismiss button is clicked', async () => {
      const errorMessage = 'Test error';
      mockApiService.evaluatePrompts.mockRejectedValueOnce(new Error(errorMessage));
      
      render(<App />);
      
      const evaluateButton = screen.getByText('Evaluate');
      fireEvent.click(evaluateButton);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
      
      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);
      
      expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
    });
  });

  describe('Historical Evaluation Handling', () => {
    it('should set results and initial data when historical evaluation is selected', () => {
      render(<App />);
      
      const selectHistoricalButton = screen.getByText('Select Historical');
      fireEvent.click(selectHistoricalButton);
      
      expect(screen.getByText('Results: present')).toBeInTheDocument();
      expect(screen.getByText('Initial Data: present')).toBeInTheDocument();
    });

    it('should clear error when historical evaluation is selected', async () => {
      // First create an error
      mockApiService.evaluatePrompts.mockRejectedValueOnce(new Error('Test error'));
      render(<App />);
      
      const evaluateButton = screen.getByText('Evaluate');
      fireEvent.click(evaluateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });
      
      // Then select historical evaluation
      const selectHistoricalButton = screen.getByText('Select Historical');
      fireEvent.click(selectHistoricalButton);
      
      // Error should be cleared
      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  describe('Clear History Functionality', () => {
    it('should clear all data when clear history is called', () => {
      render(<App />);
      
      // First select historical data
      const selectHistoricalButton = screen.getByText('Select Historical');
      fireEvent.click(selectHistoricalButton);
      
      expect(screen.getByText('Results: present')).toBeInTheDocument();
      expect(screen.getByText('Initial Data: present')).toBeInTheDocument();
      
      // Then clear history
      const clearButton = screen.getByText('Clear History');
      fireEvent.click(clearButton);
      
      expect(screen.getByText('Results: null')).toBeInTheDocument();
      expect(screen.getByText('Initial Data: null')).toBeInTheDocument();
    });

    it('should clear error when clear history is called', async () => {
      // First create an error
      mockApiService.evaluatePrompts.mockRejectedValueOnce(new Error('Test error'));
      render(<App />);
      
      const evaluateButton = screen.getByText('Evaluate');
      fireEvent.click(evaluateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });
      
      // Then clear history
      const clearButton = screen.getByText('Clear History');
      fireEvent.click(clearButton);
      
      // Error should be cleared
      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  describe('State Management Integration', () => {
    it('should maintain proper state transitions during evaluation flow', async () => {
      mockApiService.evaluatePrompts.mockResolvedValueOnce(mockEvaluationResponse);
      
      render(<App />);
      
      // Initial state
      expect(screen.getByText('Results: null')).toBeInTheDocument();
      expect(screen.getByText('Loading: false')).toBeInTheDocument();
      
      // Start evaluation
      const evaluateButton = screen.getByText('Evaluate');
      fireEvent.click(evaluateButton);
      
      // Loading state
      await waitFor(() => {
        expect(screen.getByText('Loading: true')).toBeInTheDocument();
      });
      
      // Completed state
      await waitFor(() => {
        expect(screen.getByText('Loading: false')).toBeInTheDocument();
        expect(screen.getByText('Results: present')).toBeInTheDocument();
      });
    });

    it('should handle state correctly when switching between new and historical evaluations', async () => {
      mockApiService.evaluatePrompts.mockResolvedValueOnce(mockEvaluationResponse);
      
      render(<App />);
      
      // Start with a new evaluation
      const evaluateButton = screen.getByText('Evaluate');
      fireEvent.click(evaluateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Results: present')).toBeInTheDocument();
        expect(screen.getByText('Initial Data: null')).toBeInTheDocument();
      });
      
      // Select historical evaluation
      const selectHistoricalButton = screen.getByText('Select Historical');
      fireEvent.click(selectHistoricalButton);
      
      expect(screen.getByText('Results: present')).toBeInTheDocument();
      expect(screen.getByText('Initial Data: present')).toBeInTheDocument();
      
      // Clear and start new
      const clearButton = screen.getByText('Clear History');
      fireEvent.click(clearButton);
      
      expect(screen.getByText('Results: null')).toBeInTheDocument();
      expect(screen.getByText('Initial Data: null')).toBeInTheDocument();
    });
  });

  describe('Error Display and Management', () => {
    it('should display error with proper styling and content', async () => {
      const errorMessage = 'API connection failed';
      mockApiService.evaluatePrompts.mockRejectedValueOnce(new Error(errorMessage));
      
      render(<App />);
      
      const evaluateButton = screen.getByText('Evaluate');
      fireEvent.click(evaluateButton);
      
      await waitFor(() => {
        // Error message should be displayed
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(screen.getByText('Error occurred')).toBeInTheDocument();
        
        // Dismiss button should be present
        expect(screen.getByText('Dismiss')).toBeInTheDocument();
      });
    });

    it('should not show error display when there is no error', () => {
      render(<App />);
      
      expect(screen.queryByText('Error occurred')).not.toBeInTheDocument();
      expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
    });
  });
});