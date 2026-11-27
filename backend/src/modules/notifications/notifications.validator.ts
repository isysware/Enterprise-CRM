import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().positive().max(100).optional().default(30),
});

export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['missed_followup', 'today_followup', 'lead_assigned', 'system', 'urgent_lead']),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  timeLabel: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  targetTab: z.string().optional(),
  targetId: z.string().optional(),
});
