import { FollowUp } from '../types';

/**
 * Follow-Ups Database Service (Quarantined - database persistence not enabled yet)
 */
export const followUpsService = {
  async getAll(): Promise<{ data: FollowUp[] | null; error: any }> {
    return { data: null, error: new Error('Follow-ups database persistence is not enabled yet.') };
  },

  async create(_fu: Omit<FollowUp, 'id' | 'createdAt'>): Promise<{ data: any; error: any }> {
    return { data: null, error: new Error('Follow-ups database persistence is not enabled yet.') };
  },

  async update(_id: string, _updates: Partial<FollowUp>): Promise<{ data: any; error: any }> {
    return { data: null, error: new Error('Follow-ups database persistence is not enabled yet.') };
  },

  async delete(_id: string): Promise<{ error: any }> {
    return { error: new Error('Follow-ups database persistence is not enabled yet.') };
  }
};

