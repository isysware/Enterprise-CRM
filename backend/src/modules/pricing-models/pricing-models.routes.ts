import { Router } from 'express';
import {
  authenticate,
  requirePermission,
  requireActiveAccount,
  validate,
  asyncHandler,
} from '../../middleware';
import { PricingModelsController } from './pricing-models.controller';
import { createPricingModelSchema, updatePricingModelSchema } from './pricing-models.validator';

const router = Router();

router.use(authenticate, requireActiveAccount);

router.get('/', asyncHandler(PricingModelsController.listPricingModels));
router.get('/:id', asyncHandler(PricingModelsController.getPricingModelById));

router.post(
  '/',
  requirePermission('canAccessSettings'),
  validate({ body: createPricingModelSchema }),
  asyncHandler(PricingModelsController.createPricingModel)
);

router.put(
  '/:id',
  requirePermission('canAccessSettings'),
  validate({ body: updatePricingModelSchema }),
  asyncHandler(PricingModelsController.updatePricingModel)
);

router.delete(
  '/:id',
  requirePermission('canAccessSettings'),
  asyncHandler(PricingModelsController.deletePricingModel)
);

export const pricingModelRoutes = router;
