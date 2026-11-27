import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils';
import { IncomingLeadsService } from './incoming-leads.service';
import { CreateIncomingLeadInput, AssignIncomingLeadInput } from './incoming-leads.validator';

export class IncomingLeadsController {
  public static async listIncomingLeads(req: AuthenticatedRequest, res: Response): Promise<void> {
    const status = req.query.status as string | undefined;
    const leads = await IncomingLeadsService.listIncomingLeads(status);
    sendSuccess(res, leads, 'Incoming leads retrieved successfully', 200);
  }

  public static async getIncomingLeadById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const lead = await IncomingLeadsService.getIncomingLeadById(req.params.id as string);
    sendSuccess(res, lead, 'Incoming lead details retrieved', 200);
  }

  public static async ingestLead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as CreateIncomingLeadInput;
    const lead = await IncomingLeadsService.ingestLead(input);
    sendSuccess(res, lead, 'Incoming lead ingested successfully', 201);
  }

  public static async assignAndConvertToLead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as AssignIncomingLeadInput;
    const result = await IncomingLeadsService.assignAndConvertToLead(req.user, req.params.id as string, input);
    sendSuccess(res, result, 'Incoming lead converted to CRM lead successfully', 201);
  }
}
