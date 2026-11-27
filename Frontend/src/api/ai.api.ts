import { apiClient } from './client';

export interface AiActionProposal {
  actionType: string;
  summary: string;
  payload: Record<string, unknown>;
  requiresConfirmation: boolean;
}

export interface AiAssistantResponseData {
  answer: string;
  insights?: string[];
  citations?: string[];
  actionProposal?: AiActionProposal;
}

export interface AiAssistantQueryPayload {
  prompt: string;
  contextScope?: string;
  history?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

export const aiApi = {
  askAssistant: (payload: AiAssistantQueryPayload) =>
    apiClient.post<AiAssistantResponseData>('/ai/assistant', payload),
};
