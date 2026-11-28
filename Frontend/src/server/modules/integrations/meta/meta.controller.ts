import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../../types';
import { sendSuccess } from '../../../utils';
import { MetaIntegrationService } from './meta.service';
import { MetaConfigureInput, MetaWebhookPayload } from './meta.validator';

export class MetaController {
  public static async getStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const status = await MetaIntegrationService.getStatus();
    sendSuccess(res, status, 'Meta integration status retrieved', 200);
  }

  public static async configure(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as MetaConfigureInput;
    const result = await MetaIntegrationService.configure(req.user, input);
    sendSuccess(res, result, 'Meta Lead Ads configuration saved', 200);
  }

  public static async verifyWebhook(req: Request, res: Response): Promise<void> {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    const result = await MetaIntegrationService.verifyWebhook(mode, token, challenge);
    res.status(200).send(result);
  }

  public static async handleWebhook(req: Request, res: Response): Promise<void> {
    const payload = req.body as MetaWebhookPayload;
    const result = await MetaIntegrationService.ingestWebhookEvent(payload);
    sendSuccess(res, result, 'Meta Lead Ads event processed', 200);
  }
}
