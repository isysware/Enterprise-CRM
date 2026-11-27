import { apiClient } from './client';

export interface ServiceDto {
  id: string;
  name: string;
  category: string;
  description?: string;
  defaultPricePKR: number;
  pricingModelId?: string | null;
  pricingModelName?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateServiceInput {
  name: string;
  category: string;
  description?: string;
  defaultPricePKR?: number;
  pricingModelId?: string | null;
  isActive?: boolean;
}

export interface UpdateServiceInput {
  name?: string;
  category?: string;
  description?: string | null;
  defaultPricePKR?: number;
  pricingModelId?: string | null;
  isActive?: boolean;
}

export const servicesApi = {
  listServices: (activeOnly?: boolean) =>
    apiClient.get<ServiceDto[]>('/services', {
      params: activeOnly ? { activeOnly: true } : undefined,
    }),

  getServiceById: (id: string) => apiClient.get<ServiceDto>(`/services/${id}`),

  createService: (data: CreateServiceInput) => apiClient.post<ServiceDto>('/services', data),

  updateService: (id: string, data: UpdateServiceInput) =>
    apiClient.patch<ServiceDto>(`/services/${id}`, data),

  deleteService: (id: string) => apiClient.delete<null>(`/services/${id}`),
};
