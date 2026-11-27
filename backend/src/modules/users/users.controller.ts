import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils';
import { UsersService } from './users.service';
import {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  ResetUserPasswordInput,
} from './users.validator';

export class UsersController {
  public static async listUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const users = await UsersService.listUsers(req.user, req.scope);
    sendSuccess(res, users, 'Users retrieved successfully', 200);
  }

  public static async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = await UsersService.getUserById(req.user, req.scope, req.params.id as string);
    sendSuccess(res, user, 'User details retrieved', 200);
  }

  public static async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as CreateUserInput;
    const user = await UsersService.createUser(req.user, input);
    sendSuccess(res, user, 'User created successfully', 201);
  }

  public static async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as UpdateUserInput;
    const user = await UsersService.updateUser(req.user, req.params.id as string, input);
    sendSuccess(res, user, 'User updated successfully', 200);
  }

  public static async updateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as UpdateUserStatusInput;
    const user = await UsersService.updateUserStatus(req.user, req.params.id as string, input);
    sendSuccess(res, user, 'User status updated successfully', 200);
  }

  public static async resetPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const input = req.body as ResetUserPasswordInput;
    await UsersService.resetPassword(req.user, req.params.id as string, input);
    sendSuccess(res, null, 'User password reset successfully', 200);
  }
}
