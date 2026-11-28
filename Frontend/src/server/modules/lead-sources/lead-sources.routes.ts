import { Router } from 'express';
import {
  authenticate,
  requirePermission,
  requireActiveAccount,
  validate,
  asyncHandler,
} from '../../middleware';
import { LeadSourcesController } from './lead-sources.controller';
import { createLeadSourceSchema, updateLeadSourceSchema } from './lead-sources.validator';

const router = Router();

router.use(authenticate, requireActiveAccount);

router.get('/', asyncHandler(LeadSourcesController.listSources));
router.get('/:id', asyncHandler(LeadSourcesController.getSourceById));

router.post(
  '/',
  requirePermission('canAccessSettings'),
  validate({ body: createLeadSourceSchema }),
  asyncHandler(LeadSourcesController.createSource)
);

router.put(
  '/:id',
  requirePermission('canAccessSettings'),
  validate({ body: updateLeadSourceSchema }),
  asyncHandler(LeadSourcesController.updateSource)
);

router.patch(
  '/:id',
  requirePermission('canAccessSettings'),
  validate({ body: updateLeadSourceSchema }),
  asyncHandler(LeadSourcesController.updateSource)
);

router.delete(
  '/:id',
  requirePermission('canAccessSettings'),
  asyncHandler(LeadSourcesController.deleteSource)
);

export const leadSourceRoutes = router;
