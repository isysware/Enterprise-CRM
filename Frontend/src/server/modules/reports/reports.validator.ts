import { z } from 'zod';

export const reportQuerySchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fromDate must be YYYY-MM-DD').optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'toDate must be YYYY-MM-DD').optional(),
  teamId: z.string().optional(),
  userId: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
