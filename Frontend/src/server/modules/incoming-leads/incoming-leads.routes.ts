import { Router } from 'express';
import {
  authenticate,
  requirePermission,
  requireActiveAccount,
  validate,
  asyncHandler,
} from '../../middleware';
import { IncomingLeadsController } from './incoming-leads.controller';
import { createIncomingLeadSchema, assignIncomingLeadSchema } from './incoming-leads.validator';

const router = Router();

// Protected: Inbound API webhook / ingest could be unauthenticated with API key later,
// but for now all operational endpoints require authentication and active account
router.use(authenticate, requireActiveAccount);

// Enforce required capability: canViewIncomingLeads (Hard locked to false for Employee)
router.get(
  '/',
  requirePermission('canViewIncomingLeads'),
  asyncHandler(IncomingLeadsController.listIncomingLeads)
);

router.get(
  '/:id',
  requirePermission('canViewIncomingLeads'),
  asyncHandler(IncomingLeadsController.getIncomingLeadById)
);

router.post(
  '/',
  validate({ body: createIncomingLeadSchema }),
  asyncHandler(IncomingLeadsController.ingestLead)
);

router.post(
  '/:id/assign',
  requirePermission('canAssignIncomingLeads'),
  validate({ body: assignIncomingLeadSchema }),
  asyncHandler(IncomingLeadsController.assignAndConvertToLead)
);

export const incomingLeadRoutes = router;
