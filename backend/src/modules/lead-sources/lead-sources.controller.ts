import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils';
import { LeadSourcesService } from './lead-sources.service';
import { CreateLeadSourceInput, UpdateLeadSourceInput } from './lead-sources.validator';

export class LeadSourcesController {
  public static async listSources(req: AuthenticatedRequest, res: Response): Promise<void> {
    const activeOnly = req.query.activeOnly === 'true';
    const sources = await LeadSourcesService.listSources(activeOnly);
    sendSuccess(res, sources, 'Lead sources retrieved successfully', 200);
  }

  public static async getSourceById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const source = await LeadSourcesService.getSourceById(req.params.id as string);
    sendSuccess(res, source, 'Lead source retrieved successfully', 200);
  }

  public static async createSource(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as CreateLeadSourceInput;
    const source = await LeadSourcesService.createSource(req.user, input);
    sendSuccess(res, source, 'Lead source created successfully', 201);
  }

  public static async updateSource(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as UpdateLeadSourceInput;
    const source = await LeadSourcesService.updateSource(req.user, req.params.id as string, input);
    sendSuccess(res, source, 'Lead source updated successfully', 200);
  }

  public static async deleteSource(req: AuthenticatedRequest, res: Response): Promise<void> {
    await LeadSourcesService.deleteSource(req.user, req.params.id as string);
    sendSuccess(res, null, 'Lead source deleted successfully', 200);
  }
}
