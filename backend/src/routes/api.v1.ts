import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from '../modules/auth';
import { userRoutes } from '../modules/users';
import { roleRoutes } from '../modules/roles';
import { teamRoutes } from '../modules/teams';
import { serviceRoutes } from '../modules/services';
import { leadSourceRoutes } from '../modules/lead-sources';
import { pricingModelRoutes } from '../modules/pricing-models';
import { leadRoutes } from '../modules/leads';
import { incomingLeadRoutes } from '../modules/incoming-leads';
import { followUpRoutes } from '../modules/follow-ups';
import { clientRoutes } from '../modules/clients';
import { proposalRoutes } from '../modules/proposals';
import { activityLogRoutes } from '../modules/activity-logs';
import { reportRoutes } from '../modules/reports';
import { aiRoutes } from '../modules/ai';
import { integrationRoutes } from '../modules/integrations';
import { notificationRoutes } from '../modules/notifications/notifications.routes';
import { settingRoutes } from '../modules/settings';

const router = Router();

// Health check endpoint
router.use('/health', healthRoutes);

// Authentication & Session endpoints
router.use('/auth', authRoutes);

// Users & Organization
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/teams', teamRoutes);

// Catalogs & Pricing
router.use('/services', serviceRoutes);
router.use('/sources', leadSourceRoutes);
router.use('/pricing-models', pricingModelRoutes);

// Core CRM Sales Cycle
router.use('/leads', leadRoutes);
router.use('/incoming-leads', incomingLeadRoutes);
router.use('/follow-ups', followUpRoutes);
router.use('/clients', clientRoutes);
router.use('/proposals', proposalRoutes);

// Reporting & Analytics
router.use('/reports', reportRoutes);

// AI CRM Copilot Assistant
router.use('/ai', aiRoutes);

// External Integrations (Meta Lead Ads, WhatsApp)
router.use('/integrations', integrationRoutes);

// Auditing & Logs
router.use('/activity-logs', activityLogRoutes);

// Real Database-Backed Notifications
router.use('/notifications', notificationRoutes);

// Shared Organizational Settings
router.use('/settings', settingRoutes);

export const apiV1Router = router;
