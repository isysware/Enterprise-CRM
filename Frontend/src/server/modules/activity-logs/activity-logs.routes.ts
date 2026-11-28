import { Router } from 'express';
import {
  authenticate,
  requirePermission,
  requireActiveAccount,
  asyncHandler,
} from '../../middleware';
import { ActivityLogsController } from './activity-logs.controller';

const router = Router();

router.use(authenticate, requireActiveAccount);

router.get(
  '/',
  requirePermission('canViewAuditLogs'),
  asyncHandler(ActivityLogsController.listLogs)
);

export const activityLogRoutes = router;
