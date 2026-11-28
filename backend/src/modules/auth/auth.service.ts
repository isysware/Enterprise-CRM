import {
  AuthUser,
  AuthTokens,
  UserRole,
} from '../../types';
import { IUserRepository, UserRecord } from '../../repositories';
import { TokenService, PasswordService, RbacService } from '../../services';
import { AppError } from '../../utils';
import { LoginInput, ChangePasswordInput, ResetPasswordInput } from './auth.validator';

export class AuthService {
  /**
   * Authenticates user credentials, validates account status, and generates JWT tokens
   */
  public static async login(
    input: LoginInput,
    userRepo: IUserRepository
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const userWithCreds = await userRepo.findByEmail(input.email);

    if (!userWithCreds) {
      throw AppError.unauthorized('Invalid email or password');
    }

    // Verify account active status
    if (userWithCreds.status === 'inactive' || !userWithCreds.isActive) {
      throw AppError.unauthorized('Your account is deactivated. Please contact an administrator.');
    }

    // Verify password hash
    const isValid = await PasswordService.verify(input.password, userWithCreds.passwordHash);
    if (!isValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    // Update last login
    await userRepo.updateLastLogin(userWithCreds.id);

    // Issue JWT tokens
    const tokens = TokenService.generateAuthTokens(
      {
        userId: userWithCreds.id,
        email: userWithCreds.email,
        role: userWithCreds.role,
        status: userWithCreds.status,
        teamId: userWithCreds.teamId,
      },
      userWithCreds.tokenVersion
    );

    const { passwordHash: _p, tokenVersion: _tv, ...safeUser } = userWithCreds;

    return {
      user: safeUser,
      tokens,
    };
  }

  /**
   * Refreshes access token using a valid refresh token and current user tokenVersion
   */
  public static async refreshToken(
    refreshToken: string,
    userRepo: IUserRepository
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const decoded = TokenService.verifyRefreshToken(refreshToken);

    const userWithCreds = await userRepo.findUserWithCredentials(decoded.userId);
    if (!userWithCreds) {
      throw AppError.unauthorized('User not found');
    }

    if (userWithCreds.status === 'inactive') {
      throw AppError.unauthorized('Account has been deactivated');
    }

    // Token version check (revokes stolen or invalidated refresh tokens)
    if (decoded.tokenVersion !== userWithCreds.tokenVersion) {
      throw AppError.unauthorized('Refresh token has been revoked. Please log in again.');
    }

    const tokens = TokenService.generateAuthTokens(
      {
        userId: userWithCreds.id,
        email: userWithCreds.email,
        role: userWithCreds.role,
        status: userWithCreds.status,
        teamId: userWithCreds.teamId,
      },
      userWithCreds.tokenVersion
    );

    const { passwordHash: _p, tokenVersion: _tv, ...safeUser } = userWithCreds;

    return {
      user: safeUser,
      tokens,
    };
  }

  /**
   * Invalidates existing sessions by incrementing token version
   */
  public static async logout(userId: string, userRepo: IUserRepository): Promise<void> {
    await userRepo.incrementTokenVersion(userId);
  }

  /**
   * Updates user's own password
   */
  public static async changePassword(
    userId: string,
    input: ChangePasswordInput,
    userRepo: IUserRepository
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const userWithCreds = await userRepo.findUserWithCredentials(userId);
    if (!userWithCreds) {
      throw AppError.notFound('User not found');
    }

    const isCurrentValid = await PasswordService.verify(
      input.currentPassword,
      userWithCreds.passwordHash
    );
    if (!isCurrentValid) {
      throw AppError.badRequest('Current password is incorrect');
    }

    if (input.currentPassword === input.newPassword) {
      throw AppError.badRequest('New password cannot be the same as current password');
    }

    const newHash = await PasswordService.hash(input.newPassword);
    await userRepo.updatePassword(userId, newHash);
    await userRepo.incrementTokenVersion(userId);

    const freshUser = await userRepo.findUserWithCredentials(userId);
    if (!freshUser) {
      throw AppError.notFound('User not found after update');
    }

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

    const { passwordHash: _p, tokenVersion: _tv, ...safeUser } = freshUser;

    return {
      user: safeUser,
      tokens,
    };
  }

  /**
   * Resets another user's password with strict hierarchical authority checks
   */
  public static async resetPassword(
    actor: AuthUser,
    input: ResetPasswordInput,
    userRepo: IUserRepository
  ): Promise<void> {
    const targetUser = await userRepo.findById(input.targetUserId);
    if (!targetUser) {
      throw AppError.notFound('Target user not found');
    }

    // Enforce canonical authority hierarchy:
    // - Only Super Admin can manage Admin accounts.
    // - Admin cannot reset Admin or Super Admin.
    const canManage = RbacService.canManageTargetUser(actor, {
      id: targetUser.id,
      role: targetUser.role,
    });

    if (!canManage) {
      throw AppError.forbidden(
        `Forbidden: Role '${actor.role}' lacks administrative authority to reset password of '${targetUser.role}' accounts`
      );
    }

    const newHash = await PasswordService.hash(input.newPassword);
    await userRepo.updatePassword(targetUser.id, newHash);
    await userRepo.incrementTokenVersion(targetUser.id);
  }
}
