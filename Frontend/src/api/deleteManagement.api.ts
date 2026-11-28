import { apiClient } from './client';

export interface DeleteCategoryItem {
  id: string;
  name: string;
  description: string;
  count: number;
  dangerLevel: 'medium' | 'high' | 'critical';
  dependenciesNote: string;
}

export interface PurgeResult {
  success: boolean;
  message: string;
  purgedCategories: string[];
  summary: DeleteCategoryItem[];
}

export const deleteManagementApi = {
  getSummary: () =>
    apiClient.get<DeleteCategoryItem[]>('/delete-management/summary'),

  purge: (categories: string[], confirmationText: string) =>
    apiClient.post<PurgeResult>('/delete-management/purge', {
      categories,
      confirmationText,
    }),
};
