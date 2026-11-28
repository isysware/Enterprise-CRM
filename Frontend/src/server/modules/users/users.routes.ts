import { Router } from 'express';
import {
  authenticate,
  requirePermission,
  requireActiveAccount,
  validate,
  asyncHandler,
} from '../../middleware';
import { UsersController } from './users.controller';
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  resetUserPasswordSchema,
} from './users.validator';

const router = Router();

// All user management routes require valid authentication and active account
router.use(authenticate, requireActiveAccount);

router.get('/', asyncHandler(UsersController.listUsers));
router.get('/:id', asyncHandler(UsersController.getUserById));

router.post(
  '/',
  requirePermission('canManageUsers'),
  validate({ body: createUserSchema }),
  asyncHandler(UsersController.createUser)
);

router.put(
  '/:id',
  validate({ body: updateUserSchema }),
  asyncHandler(UsersController.updateUser)
);

router.patch(
  '/:id',
  validate({ body: updateUserSchema }),
  asyncHandler(UsersController.updateUser)
);

router.patch(
  '/:id/status',
  requirePermission('canManageUsers'),
  validate({ body: updateUserStatusSchema }),
  asyncHandler(UsersController.updateUserStatus)
);

router.post(
  '/:id/reset-password',
  requirePermission('canManageUsers'),
  validate({ body: resetUserPasswordSchema }),
  asyncHandler(UsersController.resetPassword)
);

export const userRoutes = router;
