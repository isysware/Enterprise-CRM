import { Router } from 'express';
import { WhatsAppController } from './whatsapp.controller';
import {
  authenticate,
  requireActiveAccount,
  requirePermission,
  validate,
  asyncHandler,
} from '../../../middleware';
import {
  whatsappSendMessageSchema,
  whatsappInboundMessageSchema,
} from './whatsapp.validator';

const router = Router();

// 1. Administrative Status & Session Management (requires canManageIntegrations)
router.get(
  '/status',
  authenticate,
  requireActiveAccount,
  requirePermission('canManageIntegrations'),
  asyncHandler(WhatsAppController.getStatus)
);

router.post(
  '/session/init',
  authenticate,
  requireActiveAccount,
  requirePermission('canManageIntegrations'),
  asyncHandler(WhatsAppController.initSession)
);

// 2. Outbound Message Dispatch (authenticated actor with valid scope)
router.post(
  '/messages/send',
  authenticate,
  requireActiveAccount,
  validate({ body: whatsappSendMessageSchema }),
  asyncHandler(WhatsAppController.sendMessage)
);

// 3. Inbound Webhook / Runtime Hook (from Baileys/provider runner)
router.post(
  '/webhook/inbound',
  validate({ body: whatsappInboundMessageSchema }),
  asyncHandler(WhatsAppController.handleInboundMessage)
);

export const whatsappRoutes = router;
