import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from '../modules/auth';

const router = Router();

// Health check endpoint
router.use('/health', healthRoutes);

// Authentication & Session endpoints
router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/leads', leadRoutes);
// router.use('/clients', clientRoutes);
// router.use('/follow-ups', followUpRoutes);

export const apiV1Router = router;
