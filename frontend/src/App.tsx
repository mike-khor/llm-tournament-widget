import { useState } from 'react';
import { EvaluationTable, HistoryPanel } from './components';
import { apiService, PromptEvaluationRequest, EvaluationResponse } from './shared';

function App() {
  const [results, setResults] = useState<EvaluationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [initialFormData, setInitialFormData] = useState<PromptEvaluationRequest | null>(null);

  const handleEvaluate = async (request: PromptEvaluationRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.evaluatePrompts(request);
      setResults(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Evaluation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistoricalEvaluation = (evaluation: EvaluationResponse, originalRequest: any) => {
    setResults(evaluation);
    setInitialFormData(originalRequest);
    setError(null);
  };

  const handleClearHistory = () => {
    setResults(null);
    setInitialFormData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto py-8 px-6 relative">
        {/* History Toggle Button */}
        <button
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="fixed top-4 left-4 z-30 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-2 shadow-sm transition-colors"
          title="Toggle Evaluation History"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error occurred</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm text-red-800 hover:text-red-600"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Table Component */}
        <EvaluationTable 
          onEvaluate={handleEvaluate}
          results={results}
          loading={loading}
          initialData={initialFormData}
          onClearHistory={handleClearHistory}
        />

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            Powered by FastAPI backend with support for multiple LLM providers
          </p>
        </div>

        {/* History Panel */}
        <HistoryPanel
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onSelectEvaluation={handleSelectHistoricalEvaluation}
        />
      </div>
    </div>
  );
}

export default App;
