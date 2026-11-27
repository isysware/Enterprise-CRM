import { z } from 'zod';
import { CANONICAL_ROLES, CANONICAL_CAPABILITIES } from '../../constants';

export const updateRolePermissionSchema = z.object({
  capability: z.enum(CANONICAL_CAPABILITIES as unknown as [string, ...string[]]),
  isGranted: z.boolean(),
});

export type UpdateRolePermissionInput = z.infer<typeof updateRolePermissionSchema>;
