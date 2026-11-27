import { z } from 'zod';

export const createLeadSourceSchema = z.object({
  name: z.string().min(2, 'Source name must be at least 2 characters').max(100),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateLeadSourceSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateLeadSourceInput = z.infer<typeof createLeadSourceSchema>;
export type UpdateLeadSourceInput = z.infer<typeof updateLeadSourceSchema>;
