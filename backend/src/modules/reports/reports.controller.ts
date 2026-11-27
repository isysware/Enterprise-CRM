import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils';
import { ReportsService } from './reports.service';
import { ReportQuery } from './reports.validator';

export class ReportsController {
  public static async getSalesPipeline(req: AuthenticatedRequest, res: Response): Promise<void> {
    const filters = req.query as unknown as ReportQuery;
    const report = await ReportsService.getSalesPipelineReport(req.user, req.scope, filters);
    sendSuccess(res, report, 'Sales & Pipeline report generated successfully', 200);
  }

  public static async getTeamStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
    const filters = req.query as unknown as ReportQuery;
    const report = await ReportsService.getTeamStaffReport(req.user, req.scope, filters);
    sendSuccess(res, report, 'Team & Staff performance report generated successfully', 200);
  }

  public static async getFollowUpsActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    const filters = req.query as unknown as ReportQuery;
    const report = await ReportsService.getFollowUpsActivityReport(req.user, req.scope, filters);
    sendSuccess(res, report, 'Follow-ups & activity report generated successfully', 200);
  }

  public static async getClientsConversions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const filters = req.query as unknown as ReportQuery;
    const report = await ReportsService.getClientsConversionsReport(req.user, req.scope, filters);
    sendSuccess(res, report, 'Clients & conversions report generated successfully', 200);
  }

  public static async getSourceService(req: AuthenticatedRequest, res: Response): Promise<void> {
    const filters = req.query as unknown as ReportQuery;
    const report = await ReportsService.getSourceServiceReport(req.user, req.scope, filters);
    sendSuccess(res, report, 'Source & service performance report generated successfully', 200);
  }

  public static async getCommercialRevenue(req: AuthenticatedRequest, res: Response): Promise<void> {
    const filters = req.query as unknown as ReportQuery;
    const report = await ReportsService.getCommercialRevenueReport(req.user, req.scope, filters);
    sendSuccess(res, report, 'Commercial & revenue report generated successfully', 200);
  }
}
