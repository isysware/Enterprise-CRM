import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { AUTH_COOKIES } from '../../constants';
import { runtimeUserRepository } from '../../repositories';
import { TokenService } from '../../services';
import { sendSuccess, AppError } from '../../utils';
import { AuthService } from './auth.service';
import { LoginInput, ChangePasswordInput, ResetPasswordInput } from './auth.validator';

export class AuthController {
  /**
   * POST /api/v1/auth/login
   */
  public static async login(req: Request, res: Response): Promise<void> {
    const credentials = req.body as LoginInput;
    const { user, tokens } = await AuthService.login(credentials, runtimeUserRepository);

    // Attach secure HttpOnly cookies
    TokenService.setAuthCookies(res, tokens);

    sendSuccess(
      res,
      {
        user,
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
      'Authentication successful',
      200
    );
  }

  /**
   * POST /api/v1/auth/refresh
   */
  public static async refresh(req: Request, res: Response): Promise<void> {
    const token =
      (req.cookies && req.cookies[AUTH_COOKIES.REFRESH_TOKEN]) ||
      req.body.refreshToken;

    if (!token) {
      throw AppError.unauthorized('Refresh token is required');
    }

    const { user, tokens } = await AuthService.refreshToken(token, runtimeUserRepository);

    TokenService.setAuthCookies(res, tokens);

    sendSuccess(
      res,
      {
        user,
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
      'Tokens refreshed successfully',
      200
    );
  }

  /**
   * POST /api/v1/auth/logout
   */
  public static async logout(req: Request, res: Response): Promise<void> {
    const authReq = req as unknown as AuthenticatedRequest;
    if (authReq.user?.id) {
      await AuthService.logout(authReq.user.id, runtimeUserRepository);
    }

    TokenService.clearAuthCookies(res);

    sendSuccess(res, null, 'Successfully logged out', 200);
  }

  /**
   * GET /api/v1/auth/me
   */
  public static async getMe(req: Request, res: Response): Promise<void> {
    const authReq = req as unknown as AuthenticatedRequest;
    sendSuccess(
      res,
      {
        user: authReq.user,
        permissions: authReq.permissions,
        scope: authReq.scope,
      },
      'Authenticated session resolved',
      200
    );
  }

  /**
   * POST /api/v1/auth/change-password
   */
  public static async changePassword(req: Request, res: Response): Promise<void> {
    const authReq = req as unknown as AuthenticatedRequest;
    const input = req.body as ChangePasswordInput;

    await AuthService.changePassword(authReq.user.id, input, runtimeUserRepository);
    TokenService.clearAuthCookies(res);

    sendSuccess(
      res,
      null,
      'Password changed successfully. Please log in again with your new credentials.',
      200
    );
  }

  /**
   * POST /api/v1/auth/reset-password (Super Admin / Admin only)
   */
  public static async resetPassword(req: Request, res: Response): Promise<void> {
    const authReq = req as unknown as AuthenticatedRequest;
    const input = req.body as ResetPasswordInput;

    await AuthService.resetPassword(authReq.user, input, runtimeUserRepository);

    sendSuccess(
      res,
      { targetUserId: input.targetUserId },
      'User password reset successfully',
      200
    );
  }
}
