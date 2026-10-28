import { ActivityLog } from '../types';

/**
 * Activity & Audit Logs Database Service (Quarantined - database persistence not enabled yet)
 */
export const activityLogsService = {
  async getAll(_limit = 200): Promise<{ data: ActivityLog[] | null; error: any }> {
    return { data: null, error: new Error('Activity logs database persistence is not enabled yet.') };
  },

  async log(_logEntry: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<{ data: any; error: any }> {
    return { data: null, error: new Error('Activity logs database persistence is not enabled yet.') };
  }
};

