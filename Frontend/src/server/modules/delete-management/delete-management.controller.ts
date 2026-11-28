import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { AppError } from '../../utils/AppError';
import { sendSuccess } from '../../utils';
import { DeleteManagementService } from './delete-management.service';

export class DeleteManagementController {
  /**
   * GET /api/v1/delete-management/summary
   */
  public static async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (req.user.role !== 'Super Admin') {
      throw AppError.forbidden('Only Super Admin is authorized to access Delete Management.');
    }

    const summary = await DeleteManagementService.getSummary();
    sendSuccess(res, summary, 'Delete management summary retrieved successfully', 200);
  }

  /**
   * POST /api/v1/delete-management/purge
   */
  public static async purge(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (req.user.role !== 'Super Admin') {
      throw AppError.forbidden('Only Super Admin is authorized to perform data deletions.');
    }

    const { categories, confirmationText } = req.body as { categories: string[]; confirmationText: string };

    if (confirmationText !== 'DELETE') {
      throw AppError.badRequest('Confirmation keyword mismatch. You must explicitly type "DELETE" to confirm.');
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      throw AppError.badRequest('Please select at least one module category to delete.');
    }

    const result = await DeleteManagementService.purgeCategories(categories, req.user);
    sendSuccess(res, result, result.message, 200);
  }
}
