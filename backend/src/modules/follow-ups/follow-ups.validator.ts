import { z } from 'zod';

export const createFollowUpSchema = z.object({
  leadId: z.string().uuid('Valid lead UUID required'),
  clientBusinessSnapshot: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'scheduledDate must be YYYY-MM-DD format'),
  scheduledTime: z.string().optional().nullable(),
  type: z.enum(['Call', 'Meeting', 'Email', 'WhatsApp']).default('Call'),
  assignedToId: z.string().uuid().optional(),
  notes: z.string().optional().nullable(),
});

export const updateFollowUpSchema = z.object({
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduledTime: z.string().optional().nullable(),
  type: z.enum(['Call', 'Meeting', 'Email', 'WhatsApp']).optional(),
  assignedToId: z.string().uuid().optional(),
  notes: z.string().optional().nullable(),
});

export const completeFollowUpSchema = z.object({
  resultOutcome: z.string().min(1, 'Outcome/result required'),
  nextFollowUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  nextFollowUpTime: z.string().optional().nullable(),
});

export const rescheduleFollowUpSchema = z.object({
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'New scheduledDate required in YYYY-MM-DD format'),
  scheduledTime: z.string().optional().nullable(),
  reason: z.string().optional(),
});

export const listFollowUpsQuerySchema = z.object({
  classification: z.enum(['today', 'upcoming', 'missed', 'completed']).optional(),
  leadId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
export type CompleteFollowUpInput = z.infer<typeof completeFollowUpSchema>;
export type RescheduleFollowUpInput = z.infer<typeof rescheduleFollowUpSchema>;
export type ListFollowUpsQuery = z.infer<typeof listFollowUpsQuerySchema>;
