import { z } from 'zod';

export const convertLeadToClientSchema = z.object({
  leadId: z.string().uuid('Valid lead UUID required'),
  businessName: z.string().min(2, 'Business name required'),
  contactName: z.string().min(2, 'Contact name required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(5, 'Valid phone number required'),
  city: z.string().optional().nullable(),
  servicesSnapshot: z.array(z.unknown()).default([]),
  source: z.string().optional().nullable(),
  pricingModelId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  pricing_model_id: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  finalValuePKR: z.number().nonnegative().default(0),
  assignedOwnerId: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  termsDetails: z.string().optional().nullable(),
});

export const updateClientSchema = z.object({
  businessName: z.string().min(2).optional(),
  contactName: z.string().min(2).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(5).optional(),
  city: z.string().optional().nullable(),
  finalValuePKR: z.number().nonnegative().optional(),
  assignedOwnerId: z.string().uuid().optional().nullable(),
  status: z.enum(['Active', 'Inactive', 'Suspended', 'Completed']).optional(),
  termsDetails: z.string().optional().nullable(),
});

export const revertClientSchema = z.object({
  reason: z.string().min(1, 'Reason for reversion required'),
  revertLeadStatusTo: z.enum(['Qualified', 'Follow-Up Required', 'Contacted', 'New']).default('Qualified'),
});

export const listClientsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  assignedOwnerId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(1000).default(20),
});

export type ConvertLeadToClientInput = z.infer<typeof convertLeadToClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type RevertClientInput = z.infer<typeof revertClientSchema>;
export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;
