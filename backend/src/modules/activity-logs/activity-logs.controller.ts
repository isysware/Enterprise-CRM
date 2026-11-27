import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils';
import { ActivityLogsService, ListActivityLogsQuery } from './activity-logs.service';

export class ActivityLogsController {
  public static async listLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    const queryInput = req.query as unknown as ListActivityLogsQuery;
    const result = await ActivityLogsService.listLogs(queryInput);
    sendSuccess(res, result, 'Activity logs retrieved successfully', 200);
  }
}
