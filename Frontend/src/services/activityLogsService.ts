import { activityLogsApi } from '../api/activityLogs.api';
import { ActivityLog } from '../types';

/**
 * Activity & Audit Logs Database Service — Live Express API Client Integration
 */
export const activityLogsService = {
  async getAll(limit = 200): Promise<{ data: ActivityLog[] | null; error: any }> {
    try {
      const res = await activityLogsApi.listLogs({ limit });
      return { data: res.items as unknown as ActivityLog[], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async log(_logEntry: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<{ data: any; error: any }> {
    // Audit logs are created automatically by authenticated backend endpoints
    return { data: null, error: null };
  },
};
