import { Router } from 'express';
import {
  authenticate,
  requireActiveAccount,
  requirePermission,
  validate,
  asyncHandler,
} from '../../middleware';
import { AuthController } from './auth.controller';
import {
  loginSchema,
  changePasswordSchema,
  resetPasswordSchema,
} from './auth.validator';

const router = Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate credentials and issue JWT tokens in HttpOnly cookies
 * @access  Public
 */
router.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler(AuthController.login)
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Exchange refresh token for a new access token
 * @access  Public (Cookie/Token required)
 */
router.post('/refresh', asyncHandler(AuthController.refresh));

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Invalidate tokens and clear auth cookies
 * @access  Public
 */
router.post('/logout', asyncHandler(AuthController.logout));

/**
 * @route   GET /api/v1/auth/me
 * @desc    Resolve current authenticated user, effective permissions, and scope
 * @access  Private
 */
router.get(
  '/me',
  asyncHandler(authenticate as unknown as (req: any, res: any, next: any) => Promise<unknown>),
  asyncHandler(AuthController.getMe)
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change own password
 * @access  Private (Active accounts only)
 */
router.post(
  '/change-password',
  asyncHandler(authenticate as unknown as (req: any, res: any, next: any) => Promise<unknown>),
  requireActiveAccount as unknown as (req: any, res: any, next: any) => void,
  validate({ body: changePasswordSchema }),
  asyncHandler(AuthController.changePassword)
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset subordinate user password (Super Admin & Admin with authority)
 * @access  Private (Requires canManageUsers capability & hierarchical authority)
 */
router.post(
  '/reset-password',
  asyncHandler(authenticate as unknown as (req: any, res: any, next: any) => Promise<unknown>),
  requireActiveAccount as unknown as (req: any, res: any, next: any) => void,
  requirePermission('canManageUsers') as unknown as (req: any, res: any, next: any) => void,
  validate({ body: resetPasswordSchema }),
  asyncHandler(AuthController.resetPassword)
);

export const authRoutes = router;
