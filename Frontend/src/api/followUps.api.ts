import { apiClient } from './client';

export interface FollowUpDbDto {
  id: string;
  lead_id: string;
  assigned_to_id: string;
  type: 'Call' | 'Meeting' | 'Email' | 'WhatsApp';
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  notes: string | null;
  result_outcome: string | null;
  client_business_snapshot: string | null;
  phone: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  lead_name?: string | null;
  assigned_to_name?: string | null;
}

export interface ListFollowUpsQuery {
  classification?: 'today' | 'upcoming' | 'missed' | 'completed';
  leadId?: string;
  assignedToId?: string;
  date?: string;
}

export interface CreateFollowUpPayload {
  leadId: string;
  clientBusinessSnapshot?: string | null;
  phone?: string | null;
  scheduledDate: string;
  scheduledTime?: string | null;
  type?: 'Call' | 'Meeting' | 'Email' | 'WhatsApp';
  assignedToId?: string;
  notes?: string | null;
}

export interface CompleteFollowUpPayload {
  resultOutcome: string;
  nextFollowUpDate?: string | null;
  nextFollowUpTime?: string | null;
}

export interface RescheduleFollowUpPayload {
  scheduledDate: string;
  scheduledTime?: string | null;
  reason?: string | null;
  notes?: string | null;
  type?: 'Call' | 'Meeting' | 'Email' | 'WhatsApp';
  assignedToId?: string;
}

export const followUpsApi = {
  listFollowUps: (params?: ListFollowUpsQuery) =>
    apiClient.get<FollowUpDbDto[]>('/follow-ups', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    }),

  getFollowUpById: (id: string) =>
    apiClient.get<FollowUpDbDto>(`/follow-ups/${encodeURIComponent(id)}`),

  createFollowUp: (payload: CreateFollowUpPayload) =>
    apiClient.post<FollowUpDbDto>('/follow-ups', payload),

  updateFollowUp: (id: string, payload: Partial<CreateFollowUpPayload>) =>
    apiClient.patch<FollowUpDbDto>(`/follow-ups/${encodeURIComponent(id)}`, payload),

  completeFollowUp: (id: string, payload: CompleteFollowUpPayload) =>
    apiClient.patch<FollowUpDbDto>(`/follow-ups/${encodeURIComponent(id)}/complete`, payload),

  rescheduleFollowUp: (id: string, payload: RescheduleFollowUpPayload) =>
    apiClient.patch<FollowUpDbDto>(`/follow-ups/${encodeURIComponent(id)}/reschedule`, payload),

  deleteFollowUp: (id: string) =>
    apiClient.delete<null>(`/follow-ups/${encodeURIComponent(id)}`),
};
