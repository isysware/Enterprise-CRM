import { Lead, Activity } from '../types';

/**
 * Leads Database Service (Quarantined - database persistence not enabled yet)
 */
export const leadsService = {
  async getAll(): Promise<{ data: Lead[] | null; error: any }> {
    return { data: null, error: new Error('Leads database persistence is not enabled yet.') };
  },

  async create(_lead: Omit<Lead, 'id' | 'createdAt' | 'lastContactDate' | 'activities'>): Promise<{ data: any; error: any }> {
    return { data: null, error: new Error('Leads database persistence is not enabled yet.') };
  },

  async update(_id: string, _updates: Partial<Lead>): Promise<{ data: any; error: any }> {
    return { data: null, error: new Error('Leads database persistence is not enabled yet.') };
  },

  async delete(_id: string): Promise<{ error: any }> {
    return { error: new Error('Leads database persistence is not enabled yet.') };
  },

  async addActivity(_leadId: string, _activity: Omit<Activity, 'id' | 'timestamp'>): Promise<{ data: any; error: any }> {
    return { data: null, error: new Error('Leads database persistence is not enabled yet.') };
  },

  async bulkInsert(_leadsList: Partial<Lead>[]): Promise<{ count: number; error: any }> {
    return { count: 0, error: new Error('Leads database persistence is not enabled yet.') };
  }
};

