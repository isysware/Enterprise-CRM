import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../../types';
import { sendSuccess } from '../../../utils';
import { WhatsAppIntegrationService } from './whatsapp.service';
import {
  WhatsAppSendMessageInput,
  WhatsAppInboundMessageInput,
} from './whatsapp.validator';

export class WhatsAppController {
  public static async getStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const status = await WhatsAppIntegrationService.getStatus();
    sendSuccess(res, status, 'WhatsApp connection status retrieved', 200);
  }

  public static async initSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    const status = await WhatsAppIntegrationService.initSession(req.user);
    sendSuccess(res, status, 'WhatsApp pairing session initialized', 200);
  }

  public static async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as WhatsAppSendMessageInput;
    const result = await WhatsAppIntegrationService.sendMessage(req.user, req.scope, input);
    sendSuccess(res, result, 'WhatsApp message queued/sent successfully', 200);
  }

  public static async handleInboundMessage(req: Request, res: Response): Promise<void> {
    const payload = req.body as WhatsAppInboundMessageInput;
    const result = await WhatsAppIntegrationService.handleInboundMessage(payload);
    sendSuccess(res, result, 'Inbound WhatsApp message processed', 200);
  }
}
