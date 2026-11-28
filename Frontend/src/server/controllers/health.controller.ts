import { Request, Response } from 'express';
import { HealthService } from '../services';
import { sendSuccess } from '../utils';

export class HealthController {
  public static async getHealth(req: Request, res: Response): Promise<void> {
    const isVerbose = req.query.verbose === 'true';
    const health = await HealthService.getHealth(isVerbose);
    const statusCode = health.status === 'healthy' ? 200 : 503;
    sendSuccess(res, health, 'Enterprise CRM API operational status', statusCode);
  }
}
