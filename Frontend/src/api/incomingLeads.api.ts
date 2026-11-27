import { apiClient } from './client';

export interface IncomingLeadDbDto {
  id: string;
  source: string;
  external_id: string;
  contact_data: Record<string, unknown>;
  campaign_data: Record<string, unknown>;
  interested_service: string | null;
  status: string;
  assigned_user_id: string | null;
  assigned_user_name?: string | null;
  converted_lead_id: string | null;
  received_at: string;
  created_at: string;
  updated_at: string;
}

export interface IngestIncomingLeadPayload {
  source: string;
  externalId: string;
  contactData?: Record<string, unknown>;
  campaignData?: Record<string, unknown>;
  interestedService?: string | null;
  status?: 'Pending' | 'Assigned' | 'Converted' | 'Rejected' | 'Spam';
}

export interface AssignIncomingLeadPayload {
  assignedUserId: string;
  teamId?: string | null;
  leadName: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  valuePKR?: number;
  notes?: string;
}

export const incomingLeadsApi = {
  listIncomingLeads: (status?: string) =>
    apiClient.get<IncomingLeadDbDto[]>('/incoming-leads', {
      params: status ? { status } : undefined,
    }),

  getIncomingLeadById: (id: string) =>
    apiClient.get<IncomingLeadDbDto>(`/incoming-leads/${encodeURIComponent(id)}`),

  ingestLead: (payload: IngestIncomingLeadPayload) =>
    apiClient.post<IncomingLeadDbDto>('/incoming-leads', payload),

  assignAndConvert: (id: string, payload: AssignIncomingLeadPayload) =>
    apiClient.post<{ incomingLead: IncomingLeadDbDto; leadId: string }>(
      `/incoming-leads/${encodeURIComponent(id)}/assign`,
      payload
    ),
};
