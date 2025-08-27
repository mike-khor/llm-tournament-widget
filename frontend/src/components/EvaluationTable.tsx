import React, { useState } from 'react';
import { EvaluationCriterion, PromptEvaluationRequest, EvaluationResponse } from '../shared/types/api';

interface EvaluationTableProps {
  onEvaluate: (request: PromptEvaluationRequest) => void;
  results: EvaluationResponse | null;
  loading: boolean;
}

const defaultCriteria: EvaluationCriterion[] = [
  {
    name: 'accuracy',
    description: 'How accurate and correct is the response?',
    weight: 0.4,
    score_type: 'continuous',
  },
  {
    name: 'relevance',
    description: 'How relevant is the response to the input?',
    weight: 0.3,
    score_type: 'continuous',
  },
  {
    name: 'clarity',
    description: 'How clear and well-structured is the response?',
    weight: 0.3,
    score_type: 'continuous',
  },
];

export const EvaluationTable: React.FC<EvaluationTableProps> = ({
  onEvaluate,
  results,
  loading
}) => {
  const [testInput, setTestInput] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [generationCount, setGenerationCount] = useState(3);
  const [evaluationCount, setEvaluationCount] = useState(3);
  const [prompts, setPrompts] = useState(['']);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(defaultCriteria);
  const [selectedCell, setSelectedCell] = useState<{promptId: string, criterionName: string} | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const addPrompt = () => {
    if (prompts.length < 10) {
      setPrompts([...prompts, '']);
    }
  };

  const removePrompt = (index: number) => {
    if (prompts.length > 1) {
      setPrompts(prompts.filter((_, i) => i !== index));
    }
  };

  const updatePrompt = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };

  const addCriterion = () => {
    if (criteria.length < 10) {
      setCriteria([...criteria, {
        name: `criterion_${criteria.length + 1}`,
        description: 'New criterion',
        weight: 0.1,
        score_type: 'continuous'
      }]);
    }
  };

  const removeCriterion = (index: number) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter((_, i) => i !== index));
    }
  };

  const updateCriterion = (index: number, field: keyof EvaluationCriterion, value: any) => {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], [field]: value };
    setCriteria(newCriteria);
  };

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const isWeightValid = Math.abs(totalWeight - 1.0) < 0.001;
  const isFormValid = testInput.trim() !== '' &&
                     prompts.every(p => p.trim() !== '') &&
                     isWeightValid &&
                     criteria.every(c => c.name.trim() !== '' && c.description.trim() !== '');

  const handleEvaluate = () => {
    if (!isFormValid) return;

    // Clear previous results to remove green highlighting
    setSelectedCell(null);
    setIsPanelOpen(false);

    const request: PromptEvaluationRequest = {
      prompts: prompts.filter(p => p.trim() !== ''),
      test_input: testInput,
      expected_output: expectedOutput || undefined,
      criteria: criteria,
      generation_count: generationCount,
      evaluation_count: evaluationCount,
    };

    onEvaluate(request);
  };

  const handleCellClick = (promptId: string, criterionName: string) => {
    setSelectedCell({ promptId, criterionName });
    setIsPanelOpen(true);
  };

  const getPanelData = (promptId: string, criterionName: string) => {
    if (!results) return null;
    const promptResult = results.results.find(r => r.prompt_id === promptId);
    if (!promptResult) return null;

    const generationResults = promptResult.generation_evaluation_results;

    const evaluationRows: Array<{
      generationId: number;
      generationOutput: string;
      evaluationId: number;
      score: number;
      reasoning: string;
      isFirstEvalForGeneration: boolean;
    }> = [];

    generationResults.forEach((gr, genIndex) => {
      const evaluations = gr.evaluation_results;

      evaluations.forEach((evalResult, evalIndex) => {
        evaluationRows.push({
          generationId: genIndex + 1,
          generationOutput: gr.generation_result.output,
          evaluationId: evalIndex + 1,
          score: evalResult.scores[criterionName] || 0,
          reasoning: evalResult.reasoning[criterionName] || 'No reasoning available',
          isFirstEvalForGeneration: evalIndex === 0
        });
      });
    });

    return { evaluationRows };
  };

  const getBestPromptIds = () => {
    if (!results || results.results.length === 0) return [];
    const maxScore = Math.max(...results.results.map(r => r.total_score));
    return results.results
      .filter(r => Math.abs(r.total_score - maxScore) < 0.001)
      .map(r => r.prompt_id);
  };

  const bestPromptIds = getBestPromptIds();

  return (
    <div className="relative h-screen">
      <div className="h-full overflow-auto">
        <div className="space-y-6 p-4">
          {/* Header Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">LLM Tournament</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Input *</label>
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Enter the test question..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Output</label>
                <textarea
                  value={expectedOutput}
                  onChange={(e) => setExpectedOutput(e.target.value)}
                  placeholder="Expected output (optional)..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Generations per Prompt</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={generationCount}
                  onChange={(e) => setGenerationCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evaluations per Generation</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={evaluationCount}
                  onChange={(e) => setEvaluationCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

        <div className="flex justify-between items-center">
          <div className="text-sm">
            <span className={`${isWeightValid ? 'text-green-600' : 'text-red-600'}`}>
              Total Weight: {totalWeight.toFixed(3)} {isWeightValid ? '✓' : '(must equal 1.0)'}
            </span>
          </div>
          {isFormValid && (
            <button
              onClick={handleEvaluate}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Evaluating...' : 'Start Evaluation'}
            </button>
          )}
        </div>
      </div>

          {/* Main Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                Prompts
                <button
                  onClick={addPrompt}
                  disabled={prompts.length >= 10}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  + Add
                </button>
              </th>
              {criteria.map((criterion, index) => (
                <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={criterion.name}
                        onChange={(e) => updateCriterion(index, 'name', e.target.value)}
                        className="text-xs font-medium bg-transparent border-none p-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                        placeholder="Criterion name"
                      />
                      {criteria.length > 1 && (
                        <button
                          onClick={() => removeCriterion(index)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={criterion.description}
                      onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                      className="text-xs text-gray-600 bg-transparent border-none p-0 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                      placeholder="Description"
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={criterion.weight}
                      onChange={(e) => updateCriterion(index, 'weight', parseFloat(e.target.value) || 0)}
                      className="text-xs bg-transparent border-none p-0 w-16 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                      placeholder="Weight"
                    />
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Score
                {criteria.length < 10 && (
                  <button
                    onClick={addCriterion}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    + Add Criterion
                  </button>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {prompts.map((prompt, promptIndex) => {
              const promptResult = results?.results.find((_, i) => i === promptIndex);
              const isHighestScore = promptResult && bestPromptIds.includes(promptResult.prompt_id);

              return (
                <tr key={promptIndex} className={isHighestScore ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-2">
                      <textarea
                        value={prompt}
                        onChange={(e) => updatePrompt(promptIndex, e.target.value)}
                        placeholder={`Enter prompt ${promptIndex + 1}...`}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={3}
                      />
                      {prompts.length > 1 && (
                        <button
                          onClick={() => removePrompt(promptIndex)}
                          className="text-red-600 hover:text-red-800 px-2 py-1 text-lg font-bold"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </td>

                  {criteria.map((criterion, criterionIndex) => (
                    <td
                      key={criterionIndex}
                      className="px-4 py-4 text-center relative"
                    >
                      {loading ? (
                        <div className="animate-pulse bg-gray-200 h-6 w-16 mx-auto rounded"></div>
                      ) : promptResult ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="text-sm">
                            <div className="font-medium">
                              {((promptResult.final_scores[criterion.name] || 0) * 100).toFixed(1)}%
                            </div>
                            {promptResult.score_std_devs?.[criterion.name] && (
                              <div className="text-xs text-gray-500">
                                ±{(promptResult.score_std_devs[criterion.name] * 100).toFixed(1)}%
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleCellClick(promptResult.prompt_id, criterion.name)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-sm">-</div>
                      )}
                    </td>
                  ))}

                  <td className="px-4 py-4 text-center font-medium">
                    {loading ? (
                      <div className="animate-pulse bg-gray-200 h-6 w-16 mx-auto rounded"></div>
                    ) : promptResult ? (
                      <div className={`text-lg ${isHighestScore ? 'text-blue-700 font-bold' : 'text-gray-900'}`}>
                        {(promptResult.total_score * 100).toFixed(1)}%
                      </div>
                    ) : (
                      <div className="text-gray-400">-</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Sliding Panel */}
      {isPanelOpen && selectedCell && (
        <div className="fixed right-0 top-0 h-full w-1/2 bg-white shadow-2xl border-l border-gray-200 z-50 transform transition-transform duration-300">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Evaluation Details
                </h3>
                <div className="text-sm text-gray-600 mt-1">
                  <div>Criterion: <span className="font-medium">{selectedCell.criterionName}</span></div>
                  <div className="mt-1">Prompt: <span className="font-medium">
                    {(() => {
                      const promptResult = results?.results.find(r => r.prompt_id === selectedCell.promptId);
                      const promptText = promptResult?.prompt || 'Unknown';
                      return promptText.length > 50 ? `${promptText.substring(0, 50)}...` : promptText;
                    })()}
                  </span></div>
                </div>
              </div>
              <button
                onClick={() => setIsPanelOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const panelData = getPanelData(selectedCell.promptId, selectedCell.criterionName);
                if (!panelData) return <div>No data available</div>;

                return (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-1/2">
                              Generation
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">
                              Eval #
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Score & Reasoning
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {panelData.evaluationRows.map((row) => (
                            <tr key={`${row.generationId}-${row.evaluationId}`}>
                              {row.isFirstEvalForGeneration ? (
                                <td
                                  className="px-3 py-3 border-r border-gray-200"
                                  rowSpan={panelData.evaluationRows.filter(r => r.generationId === row.generationId).length}
                                >
                                  <div className="text-sm text-gray-900">
                                    <div className="font-medium mb-2 text-blue-600">Generation {row.generationId}</div>
                                    <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded leading-relaxed max-h-32 overflow-y-auto">
                                      {row.generationOutput}
                                    </div>
                                  </div>
                                </td>
                              ) : null}
                              <td className="px-3 py-3 text-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                  {row.evaluationId}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <div className="text-sm">
                                  <div className="font-medium text-gray-900 mb-1">
                                    {(row.score * 100).toFixed(1)}%
                                  </div>
                                  <div className="text-xs text-gray-600 leading-relaxed">
                                    {row.reasoning}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};