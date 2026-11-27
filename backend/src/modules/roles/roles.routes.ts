import { Router } from 'express';
import {
  authenticate,
  requirePermission,
  requireActiveAccount,
  validate,
  asyncHandler,
} from '../../middleware';
import { RolesController } from './roles.controller';
import { updateRolePermissionSchema } from './roles.validator';

const router = Router();

router.use(authenticate, requireActiveAccount);

// Accessible by all authenticated active users
router.get('/', asyncHandler(RolesController.getRoles));

// Strictly Super Admin only routes (canManageRoles)
router.get(
  '/permissions',
  requirePermission('canManageRoles'),
  asyncHandler(RolesController.getAllMatrices)
);

router.put(
  '/:role/permissions',
  requirePermission('canManageRoles'),
  validate({ body: updateRolePermissionSchema }),
  asyncHandler(RolesController.updateCapability)
);

router.post(
  '/permissions/reset',
  requirePermission('canManageRoles'),
  asyncHandler(RolesController.resetToDefaults)
);

export const roleRoutes = router;
