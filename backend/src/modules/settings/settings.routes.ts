import { Router } from 'express';
import { SettingsController } from './settings.controller';
import {
  authenticate,
  requireActiveAccount,
  requirePermission,
  validate,
  asyncHandler,
} from '../../middleware';
import { updateSettingsCategorySchema, updateSettingsParamsSchema } from './settings.validator';

const router = Router();

// Read all settings (available to all authenticated active users so branding/currency/tz are uniform)
router.get(
  '/',
  authenticate,
  requireActiveAccount,
  asyncHandler(SettingsController.getAllSettings)
);

// Update settings by category (requires canAccessSettings capability)
router.put(
  '/:category',
  authenticate,
  requireActiveAccount,
  requirePermission('canAccessSettings'),
  validate({ params: updateSettingsParamsSchema, body: updateSettingsCategorySchema }),
  asyncHandler(SettingsController.updateCategory)
);

// Reset settings to defaults (requires canAccessSettings capability)
router.post(
  '/reset',
  authenticate,
  requireActiveAccount,
  requirePermission('canAccessSettings'),
  asyncHandler(SettingsController.resetToDefaults)
);

export const settingRoutes = router;
