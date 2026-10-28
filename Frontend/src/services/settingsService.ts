import { SystemSettings } from '../types';

/**
 * System Settings Database Service (Quarantined - database persistence not enabled yet)
 */
export const settingsService = {
  async get(): Promise<{ data: SystemSettings | null; error: any }> {
    return { data: null, error: new Error('System settings database persistence is not enabled yet.') };
  },

  async update(_settings: Partial<SystemSettings>): Promise<{ data: any; error: any }> {
    return { data: null, error: new Error('System settings database persistence is not enabled yet.') };
  }
};

