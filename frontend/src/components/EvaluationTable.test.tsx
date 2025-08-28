import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EvaluationTable } from './EvaluationTable';
import type { EvaluationResponse, PromptEvaluationRequest } from '../shared/types/api';

describe('EvaluationTable', () => {
  const mockOnEvaluate = vi.fn();
  const mockOnClearHistory = vi.fn();

  const defaultProps = {
    onEvaluate: mockOnEvaluate,
    results: null,
    loading: false,
  };

  const mockEvaluationResponse: EvaluationResponse = {
    evaluation_id: 'test-eval-id',
    timestamp: '2023-01-01T00:00:00Z',
    results: [
      {
        prompt_id: 'prompt-1',
        prompt: 'Test prompt 1',
        generation_evaluation_results: [],
        final_scores: { accuracy: 0.85, relevance: 0.9 },
        total_score: 0.87,
        execution_time: 1.2,
        generation_count: 3,
        evaluation_count: 3
      }
    ],
    criteria: [
      { name: 'accuracy', description: 'Accuracy test', weight: 0.5, score_type: 'continuous' },
      { name: 'relevance', description: 'Relevance test', weight: 0.5, score_type: 'continuous' }
    ],
    status: 'completed',
    generation_provider: 'openai',
    generation_model: 'gpt-4o-mini',
    evaluation_provider: 'openai',
    evaluation_model: 'gpt-4o-mini'
  };

  beforeEach(() => {
    mockOnEvaluate.mockClear();
    mockOnClearHistory.mockClear();
  });

  describe('Form Validation', () => {
    it('should disable submit button when test input is empty', () => {
      render(<EvaluationTable {...defaultProps} />);
      
      const submitButton = screen.queryByText('Start Evaluation');
      expect(submitButton).not.toBeInTheDocument();
    });

    it('should enable submit button when form is valid', async () => {
      render(<EvaluationTable {...defaultProps} />);
      
      // Fill required fields
      const testInput = screen.getByPlaceholderText('Enter the test question...');
      const promptInput = screen.getByPlaceholderText('Enter prompt 1...');
      
      fireEvent.change(testInput, { target: { value: 'Test question' } });
      fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
      
      await waitFor(() => {
        expect(screen.getByText('Start Evaluation')).toBeInTheDocument();
      });
    });

    it('should show invalid weight warning when criteria weights do not sum to 1.0', () => {
      render(<EvaluationTable {...defaultProps} />);
      
      // Default criteria should sum to 1.0, so should show valid
      expect(screen.getByText(/Total Weight: 1.000 ✓/)).toBeInTheDocument();
      
      // Modify a weight to make it invalid
      const weightInputs = screen.getAllByPlaceholderText('Weight');
      fireEvent.change(weightInputs[0], { target: { value: '0.8' } });
      
      expect(screen.getByText(/Total Weight:.*\(must equal 1\.0\)/)).toBeInTheDocument();
    });
  });

  describe('Prompts Management', () => {
    it('should add new prompt when Add button is clicked', () => {
      render(<EvaluationTable {...defaultProps} />);
      
      const addButton = screen.getByText('+ Add');
      fireEvent.click(addButton);
      
      expect(screen.getByPlaceholderText('Enter prompt 2...')).toBeInTheDocument();
    });

    it('should remove prompt when remove button is clicked', () => {
      render(<EvaluationTable {...defaultProps} />);
      
      // Add a second prompt first
      const addButton = screen.getByText('+ Add');
      fireEvent.click(addButton);
      
      // Now remove the first prompt
      const removeButtons = screen.getAllByText('×');
      fireEvent.click(removeButtons[0]);
      
      // Should only have one prompt left
      expect(screen.getAllByPlaceholderText(/Enter prompt \d+\.../)).toHaveLength(1);
    });

    it('should not allow removing the last prompt', () => {
      render(<EvaluationTable {...defaultProps} />);
      
      // Should not show remove button when only one prompt exists
      const removeButtons = screen.queryAllByText('×');
      const promptRemoveButtons = removeButtons.filter(button => 
        button.closest('td')?.querySelector('textarea[placeholder*="Enter prompt"]')
      );
      expect(promptRemoveButtons).toHaveLength(0);
    });

    it('should limit prompts to maximum of 10', () => {
      render(<EvaluationTable {...defaultProps} />);
      
      const addButton = screen.getByText('+ Add');
      
      // Add 9 more prompts (we start with 1)
      for (let i = 0; i < 9; i++) {
        fireEvent.click(addButton);
      }
      
      // Button should be disabled now
      expect(addButton.closest('button')).toBeDisabled();
    });
  });

  describe('Criteria Management', () => {
    it('should add new criterion when Add Criterion button is clicked', () => {
      render(<EvaluationTable {...defaultProps} />);
      
      const addCriterionButton = screen.getByText('+ Add Criterion');
      fireEvent.click(addCriterionButton);
      
      // Should have 4 criteria now (3 default + 1 new)
      expect(screen.getAllByPlaceholderText('Criterion name')).toHaveLength(4);
    });

    it('should remove criterion when remove button is clicked', () => {
      render(<EvaluationTable {...defaultProps} />);
      
      // Remove the first criterion
      const removeButtons = screen.getAllByText('×');
      const criterionRemoveButton = removeButtons.find(button => 
        button.closest('th')
      );
      
      if (criterionRemoveButton) {
        fireEvent.click(criterionRemoveButton);
      }
      
      // Should have 2 criteria left
      expect(screen.getAllByPlaceholderText('Criterion name')).toHaveLength(2);
    });

    it('should update criterion fields correctly', () => {
      render(<EvaluationTable {...defaultProps} />);
      
      const nameInput = screen.getAllByPlaceholderText('Criterion name')[0];
      const descInput = screen.getAllByPlaceholderText('Description')[0];
      const weightInput = screen.getAllByPlaceholderText('Weight')[0];
      
      fireEvent.change(nameInput, { target: { value: 'custom_criterion' } });
      fireEvent.change(descInput, { target: { value: 'Custom description' } });
      fireEvent.change(weightInput, { target: { value: '0.5' } });
      
      expect(nameInput).toHaveValue('custom_criterion');
      expect(descInput).toHaveValue('Custom description');
      expect(weightInput).toHaveValue(0.5);
    });
  });

  describe('Form Submission', () => {
    it('should call onEvaluate with correct data when form is submitted', async () => {
      render(<EvaluationTable {...defaultProps} />);
      
      // Fill form
      const testInput = screen.getByPlaceholderText('Enter the test question...');
      const expectedOutput = screen.getByPlaceholderText('Expected output (optional)...');
      const promptInput = screen.getByPlaceholderText('Enter prompt 1...');
      const genCount = screen.getByDisplayValue('3');
      const evalCount = screen.getAllByDisplayValue('3')[1]; // Second one is evaluation count
      
      fireEvent.change(testInput, { target: { value: 'Test question' } });
      fireEvent.change(expectedOutput, { target: { value: 'Expected answer' } });
      fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
      fireEvent.change(genCount, { target: { value: '5' } });
      fireEvent.change(evalCount, { target: { value: '2' } });
      
      // Submit form
      await waitFor(() => {
        const submitButton = screen.getByText('Start Evaluation');
        expect(submitButton).toBeInTheDocument();
        fireEvent.click(submitButton);
      });
      
      expect(mockOnEvaluate).toHaveBeenCalledWith({
        prompts: ['Test prompt'],
        test_input: 'Test question',
        expected_output: 'Expected answer',
        criteria: expect.arrayContaining([
          expect.objectContaining({ name: 'accuracy', weight: 0.4 }),
          expect.objectContaining({ name: 'relevance', weight: 0.3 }),
          expect.objectContaining({ name: 'clarity', weight: 0.3 })
        ]),
        generation_count: 5,
        evaluation_count: 2
      });
    });

    it('should not submit form when invalid', () => {
      render(<EvaluationTable {...defaultProps} />);
      
      // Don't fill test input - form should be invalid
      const submitButton = screen.queryByText('Start Evaluation');
      expect(submitButton).not.toBeInTheDocument();
      
      expect(mockOnEvaluate).not.toHaveBeenCalled();
    });
  });

  describe('Results Display', () => {
    it('should display loading state correctly', () => {
      render(<EvaluationTable {...defaultProps} loading={true} />);
      
      expect(screen.getByText('Evaluating...')).toBeInTheDocument();
    });

    it('should display results when evaluation is complete', () => {
      render(<EvaluationTable {...defaultProps} results={mockEvaluationResponse} />);
      
      // Should show scores
      expect(screen.getByText('85.0%')).toBeInTheDocument(); // accuracy score
      expect(screen.getByText('90.0%')).toBeInTheDocument(); // relevance score
      expect(screen.getByText('87.0%')).toBeInTheDocument(); // total score
    });

    it('should highlight best performing prompts', () => {
      render(<EvaluationTable {...defaultProps} results={mockEvaluationResponse} />);
      
      // The row with highest score should have blue background
      const highestScoreRow = screen.getByText('87.0%').closest('tr');
      expect(highestScoreRow).toHaveClass('bg-blue-50');
    });
  });

  describe('Historical Data', () => {
    const mockInitialData: PromptEvaluationRequest = {
      prompts: ['Historical prompt'],
      test_input: 'Historical test input',
      expected_output: 'Historical expected output',
      criteria: [
        { name: 'accuracy', description: 'Test', weight: 1.0, score_type: 'continuous' }
      ],
      generation_count: 2,
      evaluation_count: 1
    };

    it('should populate form with initial data when provided', () => {
      render(<EvaluationTable {...defaultProps} initialData={mockInitialData} onClearHistory={mockOnClearHistory} />);
      
      expect(screen.getByDisplayValue('Historical test input')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Historical expected output')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Historical prompt')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2')).toBeInTheDocument(); // generation count
      expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // evaluation count
    });

    it('should show historical data indicator when initial data is provided', () => {
      render(<EvaluationTable {...defaultProps} initialData={mockInitialData} onClearHistory={mockOnClearHistory} />);
      
      expect(screen.getByText('Historical Data')).toBeInTheDocument();
      expect(screen.getByText('Clear & Start New')).toBeInTheDocument();
    });

    it('should call onClearHistory when Clear & Start New is clicked', () => {
      render(<EvaluationTable {...defaultProps} initialData={mockInitialData} onClearHistory={mockOnClearHistory} />);
      
      const clearButton = screen.getByText('Clear & Start New');
      fireEvent.click(clearButton);
      
      expect(mockOnClearHistory).toHaveBeenCalled();
    });
  });

  describe('Configuration Inputs', () => {
    it('should update generation count correctly', () => {
      render(<EvaluationTable {...defaultProps} />);
      
      const genCountInput = screen.getByDisplayValue('3');
      fireEvent.change(genCountInput, { target: { value: '7' } });
      
      expect(genCountInput).toHaveValue(7);
    });

    it('should update evaluation count correctly', () => {
      render(<EvaluationTable {...defaultProps} />);
      
      const evalCountInputs = screen.getAllByDisplayValue('3');
      const evalCountInput = evalCountInputs[1]; // Second one is evaluation count
      fireEvent.change(evalCountInput, { target: { value: '4' } });
      
      expect(evalCountInput).toHaveValue(4);
    });

    it('should handle invalid number inputs gracefully', () => {
      render(<EvaluationTable {...defaultProps} />);
      
      const genCountInput = screen.getByDisplayValue('3');
      fireEvent.change(genCountInput, { target: { value: '' } });
      
      // Should default to 1 when empty
      expect(genCountInput).toHaveValue(1);
    });
  });
});