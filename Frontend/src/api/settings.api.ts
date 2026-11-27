import { apiClient } from './client';
import { SystemSettings } from '../types';

export const settingsApi = {
  getSettings: () => apiClient.get<SystemSettings>('/settings'),

  updateCategory: (category: string, data: Partial<SystemSettings>) =>
    apiClient.put<SystemSettings>(`/settings/${category}`, data),

  resetToDefaults: () => apiClient.post<SystemSettings>('/settings/reset'),
};
