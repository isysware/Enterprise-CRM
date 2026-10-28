import { Client } from '../types';

/**
 * Clients Database Service (Quarantined - database persistence not enabled yet)
 */
export const clientsService = {
  async getAll(): Promise<{ data: Client[] | null; error: any }> {
    return { data: null, error: new Error('Clients database persistence is not enabled yet.') };
  },

  async create(_client: Omit<Client, 'id'>): Promise<{ data: any; error: any }> {
    return { data: null, error: new Error('Clients database persistence is not enabled yet.') };
  },

  async update(_id: string, _updates: Partial<Client>): Promise<{ data: any; error: any }> {
    return { data: null, error: new Error('Clients database persistence is not enabled yet.') };
  },

  async delete(_id: string): Promise<{ error: any }> {
    return { error: new Error('Clients database persistence is not enabled yet.') };
  }
};

