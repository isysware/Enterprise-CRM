import { Router } from 'express';
import {
  authenticate,
  requirePermission,
  requireActiveAccount,
  validate,
  asyncHandler,
} from '../../middleware';
import { LeadsController } from './leads.controller';
import {
  createLeadSchema,
  updateLeadSchema,
  changeLeadStatusSchema,
  reassignLeadSchema,
  addLeadActivitySchema,
  listLeadsQuerySchema,
} from './leads.validator';

const router = Router();

router.use(authenticate, requireActiveAccount);

router.get('/', validate({ query: listLeadsQuerySchema }), asyncHandler(LeadsController.listLeads));
router.get('/:id', asyncHandler(LeadsController.getLeadById));

router.post(
  '/',
  requirePermission('canCreateLeads'),
  validate({ body: createLeadSchema }),
  asyncHandler(LeadsController.createLead)
);

router.put(
  '/:id',
  validate({ body: updateLeadSchema }),
  asyncHandler(LeadsController.updateLead)
);

router.patch(
  '/:id/status',
  validate({ body: changeLeadStatusSchema }),
  asyncHandler(LeadsController.changeStatus)
);

router.patch(
  '/:id/reassign',
  requirePermission('canReassignLeads'),
  validate({ body: reassignLeadSchema }),
  asyncHandler(LeadsController.reassignLead)
);

router.post(
  '/:id/activities',
  validate({ body: addLeadActivitySchema }),
  asyncHandler(LeadsController.addActivity)
);

router.delete(
  '/:id',
  requirePermission('canDeleteLeads'),
  asyncHandler(LeadsController.deleteLead)
);

export const leadRoutes = router;
