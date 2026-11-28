import { z } from 'zod';

export const dynamicFieldSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'number', 'select', 'boolean', 'date', 'currency', 'dropdown']),
  options: z.array(z.string()).optional(),
  defaultValue: z.unknown().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false).optional(),
  isRequired: z.boolean().optional(),
  includeInTotal: z.boolean().default(false).optional(),
}).passthrough();

export const createPricingModelSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  billingType: z.string().min(2).max(50),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  defaultValues: z.record(z.unknown()).default({}),
  fieldSchema: z.array(dynamicFieldSchema).default([]),
});

export const updatePricingModelSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  billingType: z.string().min(2).max(50).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  defaultValues: z.record(z.unknown()).optional(),
  fieldSchema: z.array(dynamicFieldSchema).optional(),
});

export type CreatePricingModelInput = z.infer<typeof createPricingModelSchema>;
export type UpdatePricingModelInput = z.infer<typeof updatePricingModelSchema>;
