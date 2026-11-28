import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils';
import { LeadsService } from './leads.service';
import {
  CreateLeadInput,
  UpdateLeadInput,
  ChangeLeadStatusInput,
  ReassignLeadInput,
  AddLeadActivityInput,
  ListLeadsQuery,
} from './leads.validator';

export class LeadsController {
  public static async listLeads(req: AuthenticatedRequest, res: Response): Promise<void> {
    const queryInput = req.query as unknown as ListLeadsQuery;
    const result = await LeadsService.listLeads(req.user, req.scope, queryInput);
    sendSuccess(res, result, 'Leads retrieved successfully', 200);
  }

  public static async getLeadById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const lead = await LeadsService.getLeadById(req.user, req.scope, req.params.id as string);
    sendSuccess(res, lead, 'Lead details retrieved', 200);
  }

  public static async createLead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as CreateLeadInput;
    const lead = await LeadsService.createLead(req.user, input);
    sendSuccess(res, lead, 'Lead created successfully', 201);
  }

  public static async updateLead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as UpdateLeadInput;
    const lead = await LeadsService.updateLead(req.user, req.scope, req.params.id as string, input);
    sendSuccess(res, lead, 'Lead updated successfully', 200);
  }

  public static async changeStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as ChangeLeadStatusInput;
    const lead = await LeadsService.changeStatus(req.user, req.scope, req.params.id as string, input);
    sendSuccess(res, lead, 'Lead status updated successfully', 200);
  }

  public static async reassignLead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as ReassignLeadInput;
    const lead = await LeadsService.reassignLead(req.user, req.scope, req.params.id as string, input);
    sendSuccess(res, lead, 'Lead reassigned successfully', 200);
  }

  public static async addActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as AddLeadActivityInput;
    const activity = await LeadsService.addActivity(req.user, req.scope, req.params.id as string, input);
    sendSuccess(res, activity, 'Activity recorded successfully', 201);
  }

  public static async deleteLead(req: AuthenticatedRequest, res: Response): Promise<void> {
    await LeadsService.deleteLead(req.user, req.scope, req.params.id as string);
    sendSuccess(res, null, 'Lead deleted successfully', 200);
  }
}
