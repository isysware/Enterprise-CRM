import { SystemSettings } from '../types';
import { settingsApi } from '../api';

/**
 * System Settings Database Service — Connected to PostgreSQL REST API (/api/v1/settings)
 */
export const settingsService = {
  async get(): Promise<{ data: SystemSettings | null; error: unknown }> {
    try {
      const data = await settingsApi.getSettings();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async update(settings: Partial<SystemSettings>): Promise<{ data: SystemSettings | null; error: unknown }> {
    try {
      const data = await settingsApi.updateCategory('general', settings);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
};
