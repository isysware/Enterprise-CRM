import { apiClient } from './client';

export interface LeadSourceDto {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLeadSourceInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateLeadSourceInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export const sourcesApi = {
  listSources: (activeOnly?: boolean) =>
    apiClient.get<LeadSourceDto[]>('/sources', {
      params: activeOnly ? { activeOnly: true } : undefined,
    }),

  getSourceById: (id: string) => apiClient.get<LeadSourceDto>(`/sources/${id}`),

  createSource: (data: CreateLeadSourceInput) =>
    apiClient.post<LeadSourceDto>('/sources', data),

  updateSource: (id: string, data: UpdateLeadSourceInput) =>
    apiClient.patch<LeadSourceDto>(`/sources/${id}`, data),

  deleteSource: (id: string) => apiClient.delete<null>(`/sources/${id}`),
};
