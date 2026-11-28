import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils';
import { TokenService } from '../../services';
import { postgresUserRepository } from '../../repositories';
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
    const targetUserId = req.params.id as string;
    await UsersService.resetPassword(req.user, targetUserId, input);

    // If the caller reset their own password (e.g. Super Admin editing self), refresh session tokens
    if (req.user.id === targetUserId) {
      const freshUser = await postgresUserRepository.findUserWithCredentials(targetUserId);
      if (freshUser) {
        const tokens = TokenService.generateAuthTokens(
          {
            userId: freshUser.id,
            email: freshUser.email,
            role: freshUser.role,
            status: freshUser.status,
            teamId: freshUser.teamId,
          },
          freshUser.tokenVersion
        );
        TokenService.setAuthCookies(res, tokens);
        sendSuccess(
          res,
          { accessToken: tokens.accessToken, user: freshUser },
          'Your password was reset successfully. Session credentials updated.',
          200
        );
        return;
      }
    }

    sendSuccess(res, null, 'User password reset successfully', 200);
  }
}
