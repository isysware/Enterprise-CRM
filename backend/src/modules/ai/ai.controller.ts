import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils';
import { AiAssistantService } from './ai.service';
import { AiAssistantInput } from './ai.validator';

export class AiController {
  public static async askAssistant(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as AiAssistantInput;
    const response = await AiAssistantService.processRequest(req.user, req.scope, input);
    sendSuccess(res, response, 'AI Copilot operational analysis generated', 200);
  }
}
