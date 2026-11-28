import { z } from 'zod';

export const createIncomingLeadSchema = z.object({
  source: z.string().min(1, 'Source required').max(50),
  externalId: z.string().min(1, 'External ID required').max(255),
  contactData: z.record(z.unknown()).default({}),
  campaignData: z.record(z.unknown()).default({}),
  interestedService: z.string().optional().nullable(),
  status: z.enum(['Pending', 'Assigned', 'Converted', 'Rejected', 'Spam']).default('Pending'),
});

export const assignIncomingLeadSchema = z.object({
  assignedUserId: z.string().uuid('Valid user UUID required'),
  teamId: z.string().uuid().optional().nullable(),
  leadName: z.string().min(2, 'Lead name required'),
  phone: z.string().min(5, 'Valid phone number required'),
  email: z.string().email().optional().nullable(),
  city: z.string().optional().nullable(),
  valuePKR: z.number().nonnegative().default(0),
  notes: z.string().optional(),
});

export type CreateIncomingLeadInput = z.infer<typeof createIncomingLeadSchema>;
export type AssignIncomingLeadInput = z.infer<typeof assignIncomingLeadSchema>;
