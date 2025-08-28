import React, { useState, useEffect } from 'react';
import { apiService } from '../shared/services/api';
import type { ModelInfo, ModelsResponse } from '../shared/types/api';

interface ModelSelectorProps {
  label: string;
  selectedProvider?: string;
  selectedModel?: string;
  onModelChange: (provider: string, model: string) => void;
  filterType?: 'generation' | 'evaluation' | 'all';
  disabled?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  label,
  selectedProvider,
  selectedModel,
  onModelChange,
  filterType = 'all',
  disabled = false,
}) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [providersData, setProvidersData] = useState<ModelsResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadModels = async () => {
    try {
      setLoading(true);
      setError(null);

      let modelsList: ModelInfo[];

      if (filterType === 'generation') {
        modelsList = await apiService.getGenerationModels();
      } else if (filterType === 'evaluation') {
        modelsList = await apiService.getEvaluationModels();
      } else {
        const providersResponse = await apiService.getAvailableModels();
        setProvidersData(providersResponse);
        modelsList = Object.values(providersResponse)
          .flatMap(provider => provider.models);
      }

      setModels(modelsList);
    } catch (err) {
      console.error('Failed to load models:', err);
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
    // eslint-disable-next-line
  }, []);

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    if (!selectedValue) return;

    const [provider, modelId] = selectedValue.split('/');
    onModelChange(provider, modelId);
  };

  const getCurrentValue = () => {
    if (selectedProvider && selectedModel) {
      return `${selectedProvider}/${selectedModel}`;
    }
    return '';
  };

  const groupedModels = models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, ModelInfo[]>);

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="animate-pulse bg-gray-200 h-10 rounded-md"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="text-sm text-red-600 p-2 bg-red-50 rounded-md">
          {error}
          <button
            onClick={loadModels}
            className="ml-2 text-red-800 hover:text-red-900 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        value={getCurrentValue()}
        onChange={handleModelChange}
        disabled={disabled || loading}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
      >
        <option value="">Select a model...</option>
        {Object.entries(groupedModels).map(([provider, providerModels]) => {
          const providerConfig = providersData[provider];
          const providerDisplayName = providerConfig?.display_name || provider;

          return (
            <optgroup key={provider} label={providerDisplayName}>
              {providerModels.map((model) => (
                <option key={`${model.provider}/${model.id}`} value={`${model.provider}/${model.id}`}>
                  {model.name} - {model.description}
                  {model.cost_per_1k_input_tokens > 0 && (
                    ` ($${model.cost_per_1k_input_tokens.toFixed(4)}/1K tokens)`
                  )}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>

      {selectedProvider && selectedModel && (
        <div className="text-xs text-gray-500 mt-1">
          {(() => {
            const selectedModelInfo = models.find(
              m => m.provider === selectedProvider && m.id === selectedModel
            );
            if (!selectedModelInfo) return null;

            return (
              <div className="space-y-1">
                <div>Context Length: {selectedModelInfo.context_length.toLocaleString()} tokens</div>
                {selectedModelInfo.cost_per_1k_input_tokens > 0 && (
                  <div>
                    Cost: ${selectedModelInfo.cost_per_1k_input_tokens.toFixed(4)} input /
                    ${selectedModelInfo.cost_per_1k_output_tokens.toFixed(4)} output per 1K tokens
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};