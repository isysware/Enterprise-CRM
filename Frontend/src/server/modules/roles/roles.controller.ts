import { Response } from 'express';
import { AuthenticatedRequest, UserRole } from '../../types';
import { sendSuccess } from '../../utils';
import { RolesService } from './roles.service';
import { UpdateRolePermissionInput } from './roles.validator';

export class RolesController {
  public static async getRoles(req: AuthenticatedRequest, res: Response): Promise<void> {
    const roles = await RolesService.getRoles();
    sendSuccess(res, roles, 'Canonical roles retrieved', 200);
  }

  public static async getAllMatrices(req: AuthenticatedRequest, res: Response): Promise<void> {
    const matrices = await RolesService.getAllMatrices();
    sendSuccess(res, matrices, 'Dynamic role permission matrices retrieved', 200);
  }

  public static async updateCapability(req: AuthenticatedRequest, res: Response): Promise<void> {
    const roleName = req.params.role as string as UserRole;
    const input = req.body as UpdateRolePermissionInput;
    const updated = await RolesService.updateCapability(req.user, roleName, input);
    sendSuccess(res, updated, `Capability '${input.capability}' updated for role '${roleName}'`, 200);
  }

  public static async resetToDefaults(req: AuthenticatedRequest, res: Response): Promise<void> {
    const matrices = await RolesService.resetToDefaults(req.user);
    sendSuccess(res, matrices, 'Role permissions reset to default matrices', 200);
  }
}
