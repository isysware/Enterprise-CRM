import { Response } from 'express';
import { SettingsService } from './settings.service';
import { AuthenticatedRequest } from '../../types';
import { AppError } from '../../utils/AppError';
import { sendSuccess } from '../../utils';

export class SettingsController {
  /**
   * GET /api/v1/settings
   */
  public static async getAllSettings(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const settings = await SettingsService.getAllSettings();
    sendSuccess(res, settings, 'Settings retrieved successfully', 200);
  }

  /**
   * PUT /api/v1/settings/:category
   */
  public static async updateCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    const category = req.params.category as string;
    const data = req.body as Record<string, unknown>;

    if (!category) {
      throw AppError.badRequest('Settings category is required');
    }

    const updated = await SettingsService.updateCategory(category, data, req.user);
    sendSuccess(res, updated, `Settings for ${category} updated successfully`, 200);
  }

  /**
   * POST /api/v1/settings/reset
   */
  public static async resetToDefaults(req: AuthenticatedRequest, res: Response): Promise<void> {
    const defaults = await SettingsService.resetToDefaults(req.user);
    sendSuccess(res, defaults, 'System settings reset to defaults successfully', 200);
  }
}
