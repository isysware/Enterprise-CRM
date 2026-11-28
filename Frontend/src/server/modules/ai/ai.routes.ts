import { Router } from 'express';
import { AiController } from './ai.controller';
import { authenticate, requireActiveAccount, validate, asyncHandler } from '../../middleware';
import { aiAssistantQuerySchema } from './ai.validator';

const router = Router();

// Endpoint: POST /api/v1/ai/assistant
router.post(
  '/assistant',
  authenticate,
  requireActiveAccount,
  validate({ body: aiAssistantQuerySchema }),
  asyncHandler(AiController.askAssistant)
);

export const aiRoutes = router;
