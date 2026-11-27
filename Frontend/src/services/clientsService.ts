import { clientsApi } from '../api/clients.api';
import { Client } from '../types';

/**
 * Clients Database Service — Live Express API Client Integration
 */
export const clientsService = {
  async getAll(): Promise<{ data: Client[] | null; error: any }> {
    try {
      const res = await clientsApi.listClients({ limit: 200 });
      return { data: res.items as unknown as Client[], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async create(client: Omit<Client, 'id'>): Promise<{ data: any; error: any }> {
    try {
      const res = await clientsApi.convertLead({
        leadId: client.leadId || '',
        businessName: client.businessName,
        contactName: client.clientName,
        phone: client.phone,
        email: client.email || null,
        city: client.city || null,
        finalValuePKR: client.finalPrice,
      });
      return { data: res, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async update(id: string, updates: Partial<Client>): Promise<{ data: any; error: any }> {
    try {
      const res = await clientsApi.updateClient(id, updates as any);
      return { data: res, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async delete(_id: string): Promise<{ error: any }> {
    return { error: new Error('Destructive client deletion is disabled by business rules.') };
  },
};
