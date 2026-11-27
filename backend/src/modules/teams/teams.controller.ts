import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils';
import { TeamsService } from './teams.service';
import { CreateTeamInput, UpdateTeamInput, AddTeamMemberInput } from './teams.validator';

export class TeamsController {
  public static async listTeams(req: AuthenticatedRequest, res: Response): Promise<void> {
    const teams = await TeamsService.listTeams();
    sendSuccess(res, teams, 'Teams retrieved successfully', 200);
  }

  public static async getTeamById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const team = await TeamsService.getTeamById(req.params.id as string);
    sendSuccess(res, team, 'Team retrieved successfully', 200);
  }

  public static async createTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as CreateTeamInput;
    const team = await TeamsService.createTeam(req.user, input);
    sendSuccess(res, team, 'Team created successfully', 201);
  }

  public static async updateTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as UpdateTeamInput;
    const team = await TeamsService.updateTeam(req.user, req.params.id as string, input);
    sendSuccess(res, team, 'Team updated successfully', 200);
  }

  public static async deleteTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    await TeamsService.deleteTeam(req.user, req.params.id as string);
    sendSuccess(res, null, 'Team deleted successfully', 200);
  }

  public static async addMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as AddTeamMemberInput;
    const membership = await TeamsService.addMember(req.user, req.params.id as string, input);
    sendSuccess(res, membership, 'Team member added successfully', 201);
  }

  public static async removeMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    await TeamsService.removeMember(req.user, req.params.id as string, req.params.userId as string);
    sendSuccess(res, null, 'Team member removed successfully', 200);
  }
}
