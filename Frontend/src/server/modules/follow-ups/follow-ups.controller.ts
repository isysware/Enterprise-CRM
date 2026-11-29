import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils';
import { FollowUpsService } from './follow-ups.service';
import {
  CreateFollowUpInput,
  UpdateFollowUpInput,
  CompleteFollowUpInput,
  RescheduleFollowUpInput,
  ListFollowUpsQuery,
} from './follow-ups.validator';

export class FollowUpsController {
  public static async listFollowUps(req: AuthenticatedRequest, res: Response): Promise<void> {
    const queryInput = req.query as unknown as ListFollowUpsQuery;
    const followUps = await FollowUpsService.listFollowUps(req.user, req.scope, queryInput);
    sendSuccess(res, followUps, 'Follow-ups retrieved successfully', 200);
  }

  public static async getFollowUpById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const followUp = await FollowUpsService.getFollowUpById(req.user, req.scope, req.params.id as string);
    sendSuccess(res, followUp, 'Follow-up retrieved successfully', 200);
  }

  public static async createFollowUp(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as CreateFollowUpInput;
    const followUp = await FollowUpsService.createFollowUp(req.user, req.scope, input, req.permissions);
    sendSuccess(res, followUp, 'Follow-up scheduled successfully', 201);
  }

  public static async completeFollowUp(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as CompleteFollowUpInput;
    const followUp = await FollowUpsService.completeFollowUp(req.user, req.scope, req.params.id as string, input);
    sendSuccess(res, followUp, 'Follow-up completed successfully', 200);
  }

  public static async rescheduleFollowUp(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as RescheduleFollowUpInput;
    const followUp = await FollowUpsService.rescheduleFollowUp(req.user, req.scope, req.params.id as string, input);
    sendSuccess(res, followUp, 'Follow-up rescheduled successfully', 200);
  }

  public static async updateFollowUp(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as UpdateFollowUpInput;
    const followUp = await FollowUpsService.updateFollowUp(req.user, req.scope, req.params.id as string, input);
    sendSuccess(res, followUp, 'Follow-up updated successfully', 200);
  }

  public static async deleteFollowUp(req: AuthenticatedRequest, res: Response): Promise<void> {
    await FollowUpsService.deleteFollowUp(req.user, req.scope, req.params.id as string);
    sendSuccess(res, null, 'Follow-up deleted successfully', 200);
  }
}
