import { PricingModelItem } from '../types';
import { pricingModelsApi, CreatePricingModelInput, UpdatePricingModelInput } from '../api';

/**
 * Dynamic Pricing Models API Service (Connected to Express REST API /api/v1/pricing-models)
 */
export const pricingModelsService = {
  async getAll(): Promise<{ data: PricingModelItem[] | null; error: any }> {
    try {
      const list = await pricingModelsApi.listPricingModels();
      const mapped: PricingModelItem[] = list.map((pm) => ({
        id: pm.id,
        name: pm.name,
        billingType: pm.billingType as any,
        description: pm.description || '',
        isActive: pm.isActive !== false,
        isSystemDefault: pm.isDefault,
        createdAt: pm.createdAt,
        fields: (pm.fieldSchema || []) as any,
      }));
      return { data: mapped, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  async create(model: Omit<PricingModelItem, 'id' | 'createdAt'>): Promise<{ data: PricingModelItem | null; error: any }> {
    try {
      const input: CreatePricingModelInput = {
        name: model.name,
        billingType: model.billingType,
        description: model.description,
        isActive: model.isActive,
        isDefault: model.isSystemDefault,
        fieldSchema: (model.fields || []) as any,
      };
      const created = await pricingModelsApi.createPricingModel(input);
      const mapped: PricingModelItem = {
        id: created.id,
        name: created.name,
        billingType: created.billingType as any,
        description: created.description || '',
        isActive: created.isActive !== false,
        isSystemDefault: created.isDefault,
        createdAt: created.createdAt,
        fields: (created.fieldSchema || []) as any,
      };
      return { data: mapped, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  async update(id: string, updates: Partial<PricingModelItem>): Promise<{ data: PricingModelItem | null; error: any }> {
    try {
      const input: UpdatePricingModelInput = {
        name: updates.name,
        billingType: updates.billingType,
        description: updates.description,
        isActive: updates.isActive,
        isDefault: updates.isSystemDefault,
        fieldSchema: updates.fields as any,
      };
      const updated = await pricingModelsApi.updatePricingModel(id, input);
      const mapped: PricingModelItem = {
        id: updated.id,
        name: updated.name,
        billingType: updated.billingType as any,
        description: updated.description || '',
        isActive: updated.isActive !== false,
        isSystemDefault: updated.isDefault,
        createdAt: updated.createdAt,
        fields: (updated.fieldSchema || []) as any,
      };
      return { data: mapped, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  async delete(id: string): Promise<{ error: any }> {
    try {
      await pricingModelsApi.deletePricingModel(id);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  },
};
