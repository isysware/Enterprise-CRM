import { apiClient } from './client';

export interface DynamicFieldDto {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'date';
  options?: string[];
  defaultValue?: unknown;
  required?: boolean;
  includeInTotal?: boolean;
}

export interface PricingModelDto {
  id: string;
  name: string;
  billingType: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  defaultValues?: Record<string, unknown>;
  fieldSchema?: DynamicFieldDto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePricingModelInput {
  name: string;
  billingType: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  defaultValues?: Record<string, unknown>;
  fieldSchema?: DynamicFieldDto[];
}

export interface UpdatePricingModelInput {
  name?: string;
  billingType?: string;
  description?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  defaultValues?: Record<string, unknown>;
  fieldSchema?: DynamicFieldDto[];
}

export const pricingModelsApi = {
  listPricingModels: () => apiClient.get<PricingModelDto[]>('/pricing-models'),

  getPricingModelById: (id: string) =>
    apiClient.get<PricingModelDto>(`/pricing-models/${id}`),

  createPricingModel: (data: CreatePricingModelInput) =>
    apiClient.post<PricingModelDto>('/pricing-models', data),

  updatePricingModel: (id: string, data: UpdatePricingModelInput) =>
    apiClient.patch<PricingModelDto>(`/pricing-models/${id}`, data),

  deletePricingModel: (id: string) =>
    apiClient.delete<null>(`/pricing-models/${id}`),
};
