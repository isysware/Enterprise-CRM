import { apiClient } from './client';
import { PaginatedResponse } from './types';

export interface LeadDbDto {
  id: string;
  name: string;
  business_name: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  service_ids: string[];
  service_snapshot: unknown[];
  value_pkr: string | number;
  status: string;
  quality: string;
  priority: string;
  source: string;
  source_id: string | null;
  assigned_to_id: string | null;
  assigned_to_name?: string | null;
  team_id: string | null;
  team_name?: string | null;
  pricing_model_id: string | null;
  budget_details: Record<string, unknown>;
  notes: string | null;
  tags: string[];
  next_follow_up_date: string | null;
  next_follow_up_time: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  activities?: LeadActivityDto[];
}

export interface LeadActivityDto {
  id: string;
  lead_id: string;
  type: string;
  title: string;
  notes: string | null;
  actor_id: string;
  actor_name?: string;
  outcome?: string | null;
  duration_minutes?: number | null;
  created_at: string;
}

export interface ListLeadsQuery {
  search?: string;
  status?: string;
  source?: string;
  priority?: string;
  quality?: string;
  assignedToId?: string;
  teamId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateLeadPayload {
  name: string;
  businessName?: string | null;
  phone: string;
  email?: string | null;
  city?: string | null;
  serviceIds?: string[];
  serviceSnapshot?: unknown[];
  valuePKR?: number;
  status?: string;
  quality?: 'High' | 'Normal' | 'Low';
  priority?: 'Urgent' | 'High' | 'Medium' | 'Low';
  source: string;
  sourceId?: string | null;
  assignedToId?: string | null;
  teamId?: string | null;
  pricingModelId?: string | null;
  budgetDetails?: Record<string, unknown>;
  notes?: string | null;
  tags?: string[];
  nextFollowUpDate?: string | null;
  nextFollowUpTime?: string | null;
}

export interface UpdateLeadPayload {
  name?: string;
  businessName?: string | null;
  phone?: string;
  email?: string | null;
  city?: string | null;
  serviceIds?: string[];
  serviceSnapshot?: unknown[];
  valuePKR?: number;
  status?: string;
  quality?: 'High' | 'Normal' | 'Low';
  priority?: 'Urgent' | 'High' | 'Medium' | 'Low';
  source?: string;
  sourceId?: string | null;
  assignedToId?: string | null;
  teamId?: string | null;
  pricingModelId?: string | null;
  budgetDetails?: Record<string, unknown>;
  notes?: string | null;
  tags?: string[];
  nextFollowUpDate?: string | null;
  nextFollowUpTime?: string | null;
}

export const leadsApi = {
  listLeads: (params?: ListLeadsQuery) =>
    apiClient.get<PaginatedResponse<LeadDbDto>>('/leads', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    }),

  getLeadById: (id: string) => apiClient.get<LeadDbDto>(`/leads/${encodeURIComponent(id)}`),

  createLead: (payload: CreateLeadPayload) => apiClient.post<LeadDbDto>('/leads', payload),

  updateLead: (id: string, payload: UpdateLeadPayload) =>
    apiClient.put<LeadDbDto>(`/leads/${encodeURIComponent(id)}`, payload),

  changeStatus: (id: string, status: string, notes?: string) =>
    apiClient.patch<LeadDbDto>(`/leads/${encodeURIComponent(id)}/status`, { status, notes }),

  reassignLead: (id: string, assignedToId: string, teamId?: string | null, reason?: string) =>
    apiClient.patch<LeadDbDto>(`/leads/${encodeURIComponent(id)}/reassign`, {
      assignedToId,
      teamId: teamId || null,
      reason,
    }),

  addActivity: (
    id: string,
    activity: {
      type: 'Call' | 'Meeting' | 'Note' | 'Email' | 'WhatsApp' | 'Status Change' | 'Assignment';
      title: string;
      notes?: string | null;
      outcome?: string | null;
      durationMinutes?: number | null;
    }
  ) => apiClient.post<LeadActivityDto>(`/leads/${encodeURIComponent(id)}/activities`, activity),

  deleteLead: (id: string) => apiClient.delete<null>(`/leads/${encodeURIComponent(id)}`),
};
