import { Router } from 'express';
import { MetaController } from './meta.controller';
import {
  authenticate,
  requireActiveAccount,
  requirePermission,
  validate,
  asyncHandler,
} from '../../../middleware';
import { metaConfigureSchema, metaLeadWebhookEntrySchema } from './meta.validator';

const router = Router();

// Protected configuration & status (Super Admin / Admin / Manager with canManageIntegrations)
router.get(
  '/status',
  authenticate,
  requireActiveAccount,
  requirePermission('canManageIntegrations'),
  asyncHandler(MetaController.getStatus)
);

router.post(
  '/configure',
  authenticate,
  requireActiveAccount,
  requirePermission('canManageIntegrations'),
  validate({ body: metaConfigureSchema }),
  asyncHandler(MetaController.configure)
);

// Public Webhook Verification & Ingestion from Meta Platform
router.get('/webhook', asyncHandler(MetaController.verifyWebhook));
router.post(
  '/webhook',
  validate({ body: metaLeadWebhookEntrySchema }),
  asyncHandler(MetaController.handleWebhook)
);

export const metaRoutes = router;
