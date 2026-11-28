import { Router } from 'express';
import {
  authenticate,
  requirePermission,
  requireActiveAccount,
  validate,
  asyncHandler,
} from '../../middleware';
import { ServicesController } from './services.controller';
import { createServiceSchema, updateServiceSchema } from './services.validator';

const router = Router();

router.use(authenticate, requireActiveAccount);

router.get('/', asyncHandler(ServicesController.listServices));
router.get('/:id', asyncHandler(ServicesController.getServiceById));

router.post(
  '/',
  requirePermission('canManageServices'),
  validate({ body: createServiceSchema }),
  asyncHandler(ServicesController.createService)
);

router.put(
  '/:id',
  requirePermission('canManageServices'),
  validate({ body: updateServiceSchema }),
  asyncHandler(ServicesController.updateService)
);

router.patch(
  '/:id',
  requirePermission('canManageServices'),
  validate({ body: updateServiceSchema }),
  asyncHandler(ServicesController.updateService)
);

router.delete(
  '/:id',
  requirePermission('canManageServices'),
  asyncHandler(ServicesController.deleteService)
);

export const serviceRoutes = router;
