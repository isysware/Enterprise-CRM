import { z } from 'zod';
import { CANONICAL_ROLES } from '../../constants';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  role: z.enum(CANONICAL_ROLES as unknown as [string, ...string[]]),
  teamId: z.string().uuid().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  teamLeadId: z.string().uuid().optional().nullable(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  role: z.enum(CANONICAL_ROLES as unknown as [string, ...string[]]).optional(),
  teamId: z.string().uuid().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  teamLeadId: z.string().uuid().optional().nullable(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'restricted', 'inactive']),
});

export const resetUserPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;
