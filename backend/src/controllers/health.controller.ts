import { Request, Response } from 'express';
import { HealthService } from '../services';
import { sendSuccess } from '../utils';

export class HealthController {
  public static getHealth(req: Request, res: Response): void {
    const isVerbose = req.query.verbose === 'true';
    const health = HealthService.getHealth(isVerbose);
    sendSuccess(res, health, 'Enterprise CRM API is operational', 200);
  }
}
