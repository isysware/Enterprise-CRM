import { ServiceItem } from '../types';

/**
 * CRM Services / Offerings Database Service (Quarantined - database persistence not enabled yet)
 */
export const servicesService = {
  async getAll(): Promise<{ data: ServiceItem[] | null; error: any }> {
    return { data: null, error: new Error('Services database persistence is not enabled yet.') };
  },

  async create(_service: Omit<ServiceItem, 'id'>): Promise<{ data: any; error: any }> {
    return { data: null, error: new Error('Services database persistence is not enabled yet.') };
  },

  async update(_id: string, _updates: Partial<ServiceItem>): Promise<{ data: any; error: any }> {
    return { data: null, error: new Error('Services database persistence is not enabled yet.') };
  },

  async delete(_id: string): Promise<{ error: any }> {
    return { error: new Error('Services database persistence is not enabled yet.') };
  }
};

