import { Router } from 'express';
import { authenticate, requireActiveAccount, requirePermission, asyncHandler } from '../../middleware';
import { DeleteManagementController } from './delete-management.controller';

const router = Router();

// Strictly Super Admin only: authenticated, active account, and canManageSuperAdmin capability
router.use(authenticate, requireActiveAccount, requirePermission('canManageSuperAdmin'));

router.get('/summary', asyncHandler(DeleteManagementController.getSummary));
router.post('/purge', asyncHandler(DeleteManagementController.purge));

export const deleteManagementRoutes = router;
