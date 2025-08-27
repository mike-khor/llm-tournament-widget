import React, { useState, useEffect } from 'react';
import { EvaluationHistory, EvaluationResponse } from '../shared/types/api';
import { apiService } from '../shared/services/api';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEvaluation: (evaluation: EvaluationResponse, originalRequest: any) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isOpen,
  onClose,
  onSelectEvaluation,
}) => {
  const [evaluations, setEvaluations] = useState<EvaluationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const history = await apiService.getEvaluationHistory(20);
      setEvaluations(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
      console.error('Failed to load evaluation history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const handleSelectEvaluation = async (historyItem: EvaluationHistory) => {
    try {
      const evaluation = await apiService.getEvaluationById(historyItem.evaluation_id);
      onSelectEvaluation(evaluation, historyItem.request_data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load evaluation');
      console.error('Failed to load evaluation:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getEvaluationSummary = (historyItem: EvaluationHistory) => {
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
      topScore: (topScore * 100).toFixed(1),
    };
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sliding Panel */}
      <div
        className={`fixed left-0 top-0 h-full w-80 bg-white shadow-2xl border-r border-gray-200 z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">
                Evaluation History
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="p-4 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-600">Loading history...</p>
              </div>
            )}

            {error && (
              <div className="p-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-sm text-red-700">{error}</div>
                  <button
                    onClick={loadHistory}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && evaluations.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>No evaluation history found</p>
                <p className="text-xs mt-1">Run some evaluations to see them here</p>
              </div>
            )}

            {!loading && !error && evaluations.length > 0 && (
              <div className="divide-y divide-gray-200">
                {evaluations.map((evaluation) => {
                  const summary = getEvaluationSummary(evaluation);
                  return (
                    <div
                      key={evaluation.evaluation_id}
                      onClick={() => handleSelectEvaluation(evaluation)}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs text-gray-500">
                          {formatDate(evaluation.created_at)}
                        </div>
                        <div className="text-sm font-medium text-blue-600">
                          {summary.topScore}%
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-900 mb-1">
                        {summary.promptCount} prompt{summary.promptCount !== 1 ? 's' : ''} • {summary.criteriaCount} criteria
                      </div>
                      
                      <div className="text-xs text-gray-600 overflow-hidden">
                        <div style={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {summary.testInput}
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-xs text-gray-400">
                          ID: {evaluation.evaluation_id.substring(0, 8)}...
                        </div>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={loadHistory}
              disabled={loading}
              className="w-full text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            >
              {loading ? 'Loading...' : 'Refresh History'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};