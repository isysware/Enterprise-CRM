import { z } from 'zod';

const optionalUuid = z.preprocess(
  val => (val === '' || val === undefined ? null : val),
  z.string().uuid().nullable().optional()
);

export const createServiceSchema = z.object({
  name: z.string().min(2, 'Service name must be at least 2 characters').max(200),
  category: z.string().min(2).max(100),
  description: z.string().optional().nullable(),
  defaultPricePKR: z.number().nonnegative('Price cannot be negative').default(0),
  pricingModelId: optionalUuid,
  pricing_model_id: optionalUuid,
  isActive: z.boolean().default(true),
});

export const updateServiceSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  category: z.string().min(2).max(100).optional(),
  description: z.string().optional().nullable(),
  defaultPricePKR: z.number().nonnegative().optional(),
  pricingModelId: optionalUuid,
  pricing_model_id: optionalUuid,
  isActive: z.boolean().optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
