import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils';
import { PricingModelsService } from './pricing-models.service';
import { CreatePricingModelInput, UpdatePricingModelInput } from './pricing-models.validator';

export class PricingModelsController {
  public static async listPricingModels(req: AuthenticatedRequest, res: Response): Promise<void> {
    const models = await PricingModelsService.listPricingModels();
    sendSuccess(res, models, 'Pricing models retrieved successfully', 200);
  }

  public static async getPricingModelById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const model = await PricingModelsService.getPricingModelById(req.params.id as string);
    sendSuccess(res, model, 'Pricing model retrieved successfully', 200);
  }

  public static async createPricingModel(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as CreatePricingModelInput;
    const model = await PricingModelsService.createPricingModel(req.user, input);
    sendSuccess(res, model, 'Pricing model created successfully', 201);
  }

  public static async updatePricingModel(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as UpdatePricingModelInput;
    const model = await PricingModelsService.updatePricingModel(req.user, req.params.id as string, input);
    sendSuccess(res, model, 'Pricing model updated successfully', 200);
  }

  public static async deletePricingModel(req: AuthenticatedRequest, res: Response): Promise<void> {
    await PricingModelsService.deletePricingModel(req.user, req.params.id as string);
    sendSuccess(res, null, 'Pricing model deleted successfully', 200);
  }
}
