import { z } from 'zod';

export const aiAssistantQuerySchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000, 'Prompt must not exceed 2000 characters'),
  contextScope: z
    .enum([
      'leads',
      'follow-ups',
      'pipeline',
      'staff',
      'clients',
      'general',
      'dashboard',
      'reports',
      'calendar',
      'settings',
    ])
    .default('general')
    .optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      })
    )
    .optional(),
});

export type AiAssistantInput = z.infer<typeof aiAssistantQuerySchema>;

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiActionProposal {
  actionType: string;
  targetEntity: string;
  proposedPayload: Record<string, unknown>;
  requiresConfirmation: true;
  warning: string;
  apiEndpoint: string;
}

export interface AiAssistantResponse {
  answer: string;
  insights?: {
    totalScopedLeads?: number;
    pipelineValuePKR?: number;
    missedFollowUpsCount?: number;
    upcomingFollowUpsCount?: number;
    conversionsCount?: number;
  };
  actionProposal?: AiActionProposal;
  suggestedPrompts?: string[];
  source: 'internal_crm_database';
}
