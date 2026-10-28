import { Proposal } from '../types';

/**
 * Proposals Database Service (Quarantined - database persistence not enabled yet)
 */
export const proposalsService = {
  async getAll(): Promise<{ data: Proposal[] | null; error: any }> {
    return { data: null, error: new Error('Proposals database persistence is not enabled yet.') };
  },

  async create(_proposal: Omit<Proposal, 'id' | 'createdAt'>): Promise<{ data: any; error: any }> {
    return { data: null, error: new Error('Proposals database persistence is not enabled yet.') };
  },

  async update(_id: string, _updates: Partial<Proposal>): Promise<{ data: any; error: any }> {
    return { data: null, error: new Error('Proposals database persistence is not enabled yet.') };
  },

  async delete(_id: string): Promise<{ error: any }> {
    return { error: new Error('Proposals database persistence is not enabled yet.') };
  }
};

