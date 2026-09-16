import { PricingModelItem } from '../types';

/**
 * Dynamic Pricing Models & Fields Database Service (Quarantined - database persistence not enabled yet)
 */
export const pricingModelsService = {
  async getAll(): Promise<{ data: PricingModelItem[] | null; error: any }> {
    return { data: null, error: new Error('Pricing models database persistence is not enabled yet.') };
  },

  async create(_model: Omit<PricingModelItem, 'id' | 'createdAt'>): Promise<{ data: any; error: any }> {
    return { data: null, error: new Error('Pricing models database persistence is not enabled yet.') };
  },

  async update(_id: string, _updates: Partial<PricingModelItem>): Promise<{ data: any; error: any }> {
    return { data: null, error: new Error('Pricing models database persistence is not enabled yet.') };
  },

  async delete(_id: string): Promise<{ error: any }> {
    return { error: new Error('Pricing models database persistence is not enabled yet.') };
  }
};

