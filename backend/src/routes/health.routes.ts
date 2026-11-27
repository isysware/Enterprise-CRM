import { Router } from 'express';
import { HealthController } from '../controllers';
import { validate, asyncHandler } from '../middleware';
import { healthQuerySchema } from '../validators';

const router = Router();

/**
 * @route   GET /api/v1/health
 * @desc    API Health & Diagnostic Status Check
 * @access  Public
 */
router.get('/', validate({ query: healthQuerySchema }), asyncHandler(HealthController.getHealth));

export const healthRoutes = router;
