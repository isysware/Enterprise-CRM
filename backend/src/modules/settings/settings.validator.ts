import { z } from 'zod';

export const updateSettingsCategorySchema = z.object({}).passthrough();

export const updateSettingsParamsSchema = z.object({
  category: z.string().min(1).max(50),
});

export type UpdateSettingsCategoryInput = z.infer<typeof updateSettingsCategorySchema>;
