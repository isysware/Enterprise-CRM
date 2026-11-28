import { z } from 'zod';

export const CANONICAL_LEAD_STATUSES = [
  'New',
  'Contacted',
  'Follow-Up Required',
  'Qualified',
  'Won',
  'Hold',
  'Cold',
  'Returned',
  'Converted',
  'Lost',
] as const;

export const createLeadSchema = z.object({
  name: z.string().min(2, 'Contact name required').max(200),
  businessName: z.string().optional().nullable(),
  phone: z.string().min(5, 'Valid phone number required').max(50),
  email: z.string().email().optional().nullable(),
  city: z.string().optional().nullable(),
  serviceIds: z.array(z.string()).default([]),
  serviceSnapshot: z.array(z.unknown()).default([]),
  valuePKR: z.number().nonnegative().default(0),
  status: z.enum(CANONICAL_LEAD_STATUSES).default('New'),
  quality: z.enum(['High', 'Normal', 'Low']).default('Normal'),
  priority: z.enum(['Urgent', 'High', 'Medium', 'Low']).default('Medium'),
  source: z.string().min(1, 'Lead source required'),
  sourceId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  assignedToId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  teamId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  pricingModelId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  pricing_model_id: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  budgetDetails: z.record(z.unknown()).default({}),
  budget_details: z.record(z.unknown()).optional(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  nextFollowUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable(),
  nextFollowUpTime: z.string().optional().nullable(),
});

export const updateLeadSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  businessName: z.string().optional().nullable(),
  phone: z.string().min(5).max(50).optional(),
  email: z.string().email().optional().nullable(),
  city: z.string().optional().nullable(),
  serviceIds: z.array(z.string()).optional(),
  serviceSnapshot: z.array(z.unknown()).optional(),
  valuePKR: z.number().nonnegative().optional(),
  status: z.enum(CANONICAL_LEAD_STATUSES).optional(),
  quality: z.enum(['High', 'Normal', 'Low']).optional(),
  priority: z.enum(['Urgent', 'High', 'Medium', 'Low']).optional(),
  source: z.string().optional(),
  sourceId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  assignedToId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  teamId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  pricingModelId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  pricing_model_id: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  budgetDetails: z.record(z.unknown()).optional(),
  budget_details: z.record(z.unknown()).optional(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  nextFollowUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  nextFollowUpTime: z.string().optional().nullable(),
});

export const changeLeadStatusSchema = z.object({
  status: z.enum(CANONICAL_LEAD_STATUSES),
  notes: z.string().optional(),
});

export const reassignLeadSchema = z.object({
  assignedToId: z.string().uuid('Valid user UUID required'),
  teamId: z.string().uuid().optional().nullable(),
  reason: z.string().optional(),
});

export const addLeadActivitySchema = z.object({
  type: z.enum(['Call', 'Meeting', 'Note', 'Email', 'WhatsApp', 'Status Change', 'Assignment']),
  title: z.string().min(1, 'Title required').max(200),
  notes: z.string().optional().nullable(),
  outcome: z.string().optional().nullable(),
  durationMinutes: z.number().int().nonnegative().optional().nullable(),
});

export const listLeadsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  priority: z.string().optional(),
  quality: z.string().optional(),
  assignedToId: z.string().optional(),
  teamId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(1000).default(20),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateLeadInput = z.input<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ChangeLeadStatusInput = z.infer<typeof changeLeadStatusSchema>;
export type ReassignLeadInput = z.infer<typeof reassignLeadSchema>;
export type AddLeadActivityInput = z.infer<typeof addLeadActivitySchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
