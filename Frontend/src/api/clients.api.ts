import { apiClient } from './client';
import { PaginatedResponse } from './types';

export interface ClientDbDto {
  id: string;
  originating_lead_id: string | null;
  business_name: string;
  contact_name: string;
  email: string | null;
  phone: string;
  city: string | null;
  services_snapshot: unknown[];
  source: string | null;
  pricing_model_id: string | null;
  final_value_pkr: string | number;
  assigned_owner_id: string | null;
  closed_by_id: string | null;
  terms_details: string | null;
  converted_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  assigned_owner_name?: string | null;
  closed_by_name?: string | null;
  pricing_model_name?: string | null;
}

export interface ListClientsQuery {
  search?: string;
  status?: string;
  assignedOwnerId?: string;
  page?: number;
  limit?: number;
}

export interface ConvertLeadPayload {
  leadId: string;
  businessName: string;
  contactName: string;
  email?: string | null;
  phone: string;
  city?: string | null;
  servicesSnapshot?: unknown[];
  source?: string | null;
  pricingModelId?: string | null;
  finalValuePKR?: number;
  assignedOwnerId?: string | null;
  termsDetails?: string | null;
}

export interface UpdateClientPayload {
  businessName?: string;
  contactName?: string;
  email?: string | null;
  phone?: string;
  city?: string | null;
  finalValuePKR?: number;
  assignedOwnerId?: string | null;
  status?: 'Active' | 'Inactive' | 'Suspended' | 'Completed';
  termsDetails?: string | null;
}

export interface RevertClientPayload {
  reason: string;
  revertLeadStatusTo?: 'Qualified' | 'Follow-Up Required' | 'Contacted' | 'New';
}

export const clientsApi = {
  listClients: (params?: ListClientsQuery) =>
    apiClient.get<PaginatedResponse<ClientDbDto>>('/clients', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    }),

  getClientById: (id: string) =>
    apiClient.get<ClientDbDto>(`/clients/${encodeURIComponent(id)}`),

  convertLead: (payload: ConvertLeadPayload) =>
    apiClient.post<ClientDbDto>('/clients/convert-lead', payload),

  revertClient: (id: string, payload: RevertClientPayload) =>
    apiClient.post<{ client: ClientDbDto; revertedLeadId: string | null }>(
      `/clients/${encodeURIComponent(id)}/revert`,
      payload
    ),

  updateClient: (id: string, payload: UpdateClientPayload) =>
    apiClient.put<ClientDbDto>(`/clients/${encodeURIComponent(id)}`, payload),
};
