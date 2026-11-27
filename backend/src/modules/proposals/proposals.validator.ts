import { z } from 'zod';

export const proposalLineItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Item name required'),
  description: z.string().optional(),
  quantity: z.number().positive().default(1),
  unitPricePKR: z.number().nonnegative().default(0),
  totalPKR: z.number().nonnegative().default(0),
});

export const proposalMilestoneSchema = z.object({
  title: z.string().min(1),
  percentage: z.number().min(0).max(100),
  amountPKR: z.number().nonnegative(),
  dueDate: z.string().optional().nullable(),
});

export const createProposalSchema = z.object({
  leadId: z.string().uuid().optional().nullable(),
  proposalNumber: z.string().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().split('T')[0]),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  clientSnapshot: z.record(z.unknown()).default({}),
  assignedRepId: z.string().uuid().optional().nullable(),
  scopeDeliverables: z.string().optional().nullable(),
  lineItems: z.array(proposalLineItemSchema).default([]),
  discountPKR: z.number().nonnegative().default(0),
  taxPKR: z.number().nonnegative().default(0),
  totalPKR: z.number().nonnegative().default(0),
  milestones: z.array(proposalMilestoneSchema).default([]),
  terms: z.string().optional().nullable(),
  letterheadSnapshot: z.record(z.unknown()).default({}),
  status: z.enum(['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired']).default('Draft'),
});

export const updateProposalSchema = z.object({
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  clientSnapshot: z.record(z.unknown()).optional(),
  assignedRepId: z.string().uuid().optional().nullable(),
  scopeDeliverables: z.string().optional().nullable(),
  lineItems: z.array(proposalLineItemSchema).optional(),
  discountPKR: z.number().nonnegative().optional(),
  taxPKR: z.number().nonnegative().optional(),
  totalPKR: z.number().nonnegative().optional(),
  milestones: z.array(proposalMilestoneSchema).optional(),
  terms: z.string().optional().nullable(),
  letterheadSnapshot: z.record(z.unknown()).optional(),
  status: z.enum(['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired']).optional(),
});

export const updateProposalStatusSchema = z.object({
  status: z.enum(['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired']),
});

export type CreateProposalInput = z.input<typeof createProposalSchema>;
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;
export type UpdateProposalStatusInput = z.infer<typeof updateProposalStatusSchema>;
