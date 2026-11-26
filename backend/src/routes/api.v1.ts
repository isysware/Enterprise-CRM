import { Router } from 'express';
import { healthRoutes } from './health.routes';

const router = Router();

// Health check endpoint
router.use('/health', healthRoutes);

// Modular domain routes will be mounted here in subsequent steps:
// router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/leads', leadRoutes);
// router.use('/clients', clientRoutes);
// router.use('/follow-ups', followUpRoutes);

export const apiV1Router = router;
