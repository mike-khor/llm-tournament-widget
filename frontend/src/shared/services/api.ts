import {
  PromptEvaluationRequest,
  EvaluationResponse,
  ProviderInfo,
  ApiError,
  EvaluationHistory,
} from '../types/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({
          detail: `HTTP error! status: ${response.status}`,
        }));
        throw new Error(
          Array.isArray(errorData.detail)
            ? errorData.detail.map((e: { msg: string; type: string; loc: string[] }) => e.msg).join(', ')
            : errorData.detail
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  async evaluatePrompts(request: PromptEvaluationRequest): Promise<EvaluationResponse> {
    return this.request<EvaluationResponse>('/api/v1/evaluate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getProviderInfo(): Promise<ProviderInfo> {
    return this.request<ProviderInfo>('/api/v1/provider');
  }

  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/api/v1/health');
  }

  async getEvaluationHistory(limit: number = 10): Promise<EvaluationHistory[]> {
    return this.request<EvaluationHistory[]>(`/api/v1/evaluations?limit=${limit}`);
  }

  async getEvaluationById(evaluationId: string): Promise<EvaluationResponse> {
    return this.request<EvaluationResponse>(`/api/v1/evaluations/${evaluationId}`);
  }
}

export const apiService = new ApiService();