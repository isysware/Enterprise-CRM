import { ServiceItem } from '../types';
import { servicesApi, CreateServiceInput, UpdateServiceInput } from '../api';

/**
 * CRM Services / Offerings API Service (Connected to Express REST API /api/v1/services)
 */
export const servicesService = {
  async getAll(activeOnly?: boolean): Promise<{ data: ServiceItem[] | null; error: any }> {
    try {
      const list = await servicesApi.listServices(activeOnly);
      const mapped: ServiceItem[] = list.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        defaultPricePKR: Number(s.defaultPricePKR || 0),
        basePricePKR: Number(s.defaultPricePKR || 0),
        pricingModel: (s.pricingModelName || 'Monthly Subscription') as any,
        description: s.description || '',
        isActive: s.isActive !== false,
      }));
      return { data: mapped, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  async create(service: Omit<ServiceItem, 'id'>): Promise<{ data: ServiceItem | null; error: any }> {
    try {
      const input: CreateServiceInput = {
        name: service.name,
        category: service.category,
        defaultPricePKR: service.defaultPricePKR ?? service.basePricePKR ?? 0,
        description: service.description,
        isActive: service.isActive,
      };
      const created = await servicesApi.createService(input);
      const mapped: ServiceItem = {
        id: created.id,
        name: created.name,
        category: created.category,
        defaultPricePKR: Number(created.defaultPricePKR || 0),
        basePricePKR: Number(created.defaultPricePKR || 0),
        pricingModel: (created.pricingModelName || 'Monthly Subscription') as any,
        description: created.description || '',
        isActive: created.isActive,
      };
      return { data: mapped, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  async update(id: string, updates: Partial<ServiceItem>): Promise<{ data: ServiceItem | null; error: any }> {
    try {
      const input: UpdateServiceInput = {
        name: updates.name,
        category: updates.category,
        defaultPricePKR: updates.defaultPricePKR ?? updates.basePricePKR,
        description: updates.description,
        isActive: updates.isActive,
      };
      const updated = await servicesApi.updateService(id, input);
      const mapped: ServiceItem = {
        id: updated.id,
        name: updated.name,
        category: updated.category,
        defaultPricePKR: Number(updated.defaultPricePKR || 0),
        basePricePKR: Number(updated.defaultPricePKR || 0),
        pricingModel: (updated.pricingModelName || 'Monthly Subscription') as any,
        description: updated.description || '',
        isActive: updated.isActive,
      };
      return { data: mapped, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  async delete(id: string): Promise<{ error: any }> {
    try {
      await servicesApi.deleteService(id);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  },
};
