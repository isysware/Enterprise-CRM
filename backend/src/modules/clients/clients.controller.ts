import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils';
import { ClientsService } from './clients.service';
import {
  ConvertLeadToClientInput,
  UpdateClientInput,
  RevertClientInput,
  ListClientsQuery,
} from './clients.validator';

export class ClientsController {
  public static async listClients(req: AuthenticatedRequest, res: Response): Promise<void> {
    const queryInput = req.query as unknown as ListClientsQuery;
    const result = await ClientsService.listClients(req.user, req.scope, queryInput);
    sendSuccess(res, result, 'Clients retrieved successfully', 200);
  }

  public static async getClientById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const client = await ClientsService.getClientById(req.user, req.scope, req.params.id as string);
    sendSuccess(res, client, 'Client details retrieved', 200);
  }

  public static async convertLead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as ConvertLeadToClientInput;
    const client = await ClientsService.convertLeadToClient(req.user, input);
    sendSuccess(res, client, 'Lead converted to client successfully', 201);
  }

  public static async revertClient(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as RevertClientInput;
    const result = await ClientsService.revertClient(req.user, req.scope, req.params.id as string, input);
    sendSuccess(res, result, 'Client account reverted to lead stage', 200);
  }

  public static async updateClient(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as UpdateClientInput;
    const client = await ClientsService.updateClient(req.user, req.scope, req.params.id as string, input);
    sendSuccess(res, client, 'Client updated successfully', 200);
  }
}
