import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate, requireActiveAccount, requirePermission, validate, asyncHandler } from '../../middleware';
import { reportQuerySchema } from './reports.validator';

const router = Router();

// Reports are protected by capability and hard organizational scope
router.use(authenticate, requireActiveAccount, requirePermission('canViewReports'));

// 1. Sales & Pipeline
router.get(
  '/sales-pipeline',
  validate({ query: reportQuerySchema }),
  asyncHandler(ReportsController.getSalesPipeline)
);

// 2. Team & Staff Performance
router.get(
  '/team-staff',
  validate({ query: reportQuerySchema }),
  asyncHandler(ReportsController.getTeamStaff)
);

// 3. Follow-Ups & Activity
router.get(
  '/follow-ups',
  validate({ query: reportQuerySchema }),
  asyncHandler(ReportsController.getFollowUpsActivity)
);

// 4. Clients & Conversions
router.get(
  '/clients-conversions',
  validate({ query: reportQuerySchema }),
  asyncHandler(ReportsController.getClientsConversions)
);

// 5. Source & Service Performance
router.get(
  '/source-service',
  validate({ query: reportQuerySchema }),
  asyncHandler(ReportsController.getSourceService)
);

// 6. Commercial & Revenue
router.get(
  '/commercial-revenue',
  validate({ query: reportQuerySchema }),
  asyncHandler(ReportsController.getCommercialRevenue)
);

export const reportRoutes = router;
