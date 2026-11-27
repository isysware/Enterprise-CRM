import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(100),
  code: z.string().min(2, 'Team code must be at least 2 characters').max(50),
  description: z.string().optional(),
  managerId: z.string().uuid().optional().nullable(),
  teamLeadId: z.string().uuid().optional().nullable(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  code: z.string().min(2).max(50).optional(),
  description: z.string().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  teamLeadId: z.string().uuid().optional().nullable(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

export const addTeamMemberSchema = z.object({
  userId: z.string().uuid('Valid user UUID required'),
  isPrimary: z.boolean().default(false),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
