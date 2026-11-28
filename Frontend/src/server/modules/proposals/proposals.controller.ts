import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils';
import { ProposalsService } from './proposals.service';
import {
  CreateProposalInput,
  UpdateProposalInput,
  UpdateProposalStatusInput,
} from './proposals.validator';

export class ProposalsController {
  public static async listProposals(req: AuthenticatedRequest, res: Response): Promise<void> {
    const leadId = req.query.leadId as string | undefined;
    const proposals = await ProposalsService.listProposals(req.user, req.scope, leadId);
    sendSuccess(res, proposals, 'Proposals retrieved successfully', 200);
  }

  public static async getProposalById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const proposal = await ProposalsService.getProposalById(req.user, req.scope, req.params.id as string);
    sendSuccess(res, proposal, 'Proposal details retrieved', 200);
  }

  public static async createProposal(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as CreateProposalInput;
    const proposal = await ProposalsService.createProposal(req.user, input);
    sendSuccess(res, proposal, 'Proposal created successfully', 201);
  }

  public static async updateProposal(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as UpdateProposalInput;
    const proposal = await ProposalsService.updateProposal(req.user, req.scope, req.params.id as string, input);
    sendSuccess(res, proposal, 'Proposal updated successfully', 200);
  }

  public static async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as UpdateProposalStatusInput;
    const proposal = await ProposalsService.updateStatus(req.user, req.scope, req.params.id as string, input);
    sendSuccess(res, proposal, 'Proposal status updated successfully', 200);
  }
}
