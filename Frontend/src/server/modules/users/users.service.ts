import { postgresUserRepository } from '../../repositories/postgres.user.repository';
import { AuthUser, UserRole, HierarchyScope } from '../../types';
import { PasswordService } from '../../services/password.service';
import { AuditService } from '../../services/audit.service';
import { RbacService } from '../../services/rbac.service';
import { AppError } from '../../utils/AppError';
import {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  ResetUserPasswordInput,
} from './users.validator';

export class UsersService {
  /**
   * List users filtered by actor's organizational scope
   */
  public static async listUsers(actor: AuthUser, scope: HierarchyScope): Promise<AuthUser[]> {
    const all = await postgresUserRepository.findAllUsers();

    if (actor.role === 'Super Admin' || actor.role === 'Admin') {
      return all;
    }

    if (actor.role === 'Manager') {
      const allowedUserIds = new Set([actor.id, ...(scope.subordinateUserIds || [])]);
      const allowedTeamIds = new Set(scope.managedTeamIds || []);
      return all.filter((u) => {
        if (allowedUserIds.has(u.id)) return true;
        if (u.teamId && allowedTeamIds.has(u.teamId)) return true;
        return false;
      });
    }

    if (actor.role === 'Team Lead') {
      const allowedUserIds = new Set([actor.id, ...(scope.subordinateUserIds || [])]);
      const allowedTeamIds = new Set(scope.managedTeamIds || []);
      return all.filter((u) => {
        if (allowedUserIds.has(u.id)) return true;
        if (u.teamId && allowedTeamIds.has(u.teamId) && u.role === 'Employee') return true;
        return false;
      });
    }

    // Employee scope = self only
    return all.filter((u) => u.id === actor.id);
  }

  /**
   * Get single user by ID within authorized scope
   */
  public static async getUserById(
    actor: AuthUser,
    scope: HierarchyScope,
    userId: string
  ): Promise<AuthUser> {
    const target = await postgresUserRepository.findById(userId);
    if (!target) {
      throw AppError.notFound(`User '${userId}' not found`);
    }

    // Verify object-level visibility
    if (actor.role !== 'Super Admin' && actor.role !== 'Admin') {
      if (actor.id !== target.id) {
        if (actor.role === 'Team Lead' && (target.role === 'Manager' || target.role === 'Admin' || target.role === 'Super Admin')) {
          throw AppError.forbidden('Forbidden: User is outside your authorized organizational scope');
        }
        const allowedIds = new Set(scope.subordinateUserIds || []);
        const allowedTeams = new Set(scope.managedTeamIds || []);
        const inScope =
          allowedIds.has(target.id) ||
          (target.teamId && allowedTeams.has(target.teamId) && target.role === 'Employee');

        if (!inScope) {
          throw AppError.forbidden('Forbidden: User is outside your authorized organizational scope');
        }
      }
    }

    return target;
  }

  /**
   * Create new user with protected role checks
   */
  public static async createUser(actor: AuthUser, input: CreateUserInput): Promise<AuthUser> {
    const targetRole = input.role as UserRole;

    // HARD SECURITY RULE: Admin CANNOT create Admin or Super Admin
    if (actor.role === 'Admin') {
      if (targetRole === 'Admin' || targetRole === 'Super Admin') {
        throw AppError.forbidden(
          'Security Invariant: Admin cannot create Admin or Super Admin accounts'
        );
      }
    }

    // Check if email already exists
    const existing = await postgresUserRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict(`User with email '${input.email}' already exists`);
    }

    const passwordHash = await PasswordService.hash(input.password);

    const created = await postgresUserRepository.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: targetRole,
      status: 'active',
      teamId: input.teamId || undefined,
      managerId: input.managerId || undefined,
      teamLeadId: input.teamLeadId || undefined,
      passwordHash,
    });

    await AuditService.logFromRequest(
      actor,
      'CREATE_USER',
      'USER',
      created.id,
      created.name,
      { email: created.email, role: created.role }
    );

    return created;
  }

  /**
   * Update user details with protected account invariants
   */
  public static async updateUser(
    actor: AuthUser,
    userId: string,
    input: UpdateUserInput
  ): Promise<AuthUser> {
    const target = await postgresUserRepository.findById(userId);
    if (!target) {
      throw AppError.notFound(`User '${userId}' not found`);
    }

    // HARD INVARIANT: Admin CANNOT edit Admin or Super Admin
    if (actor.role === 'Admin') {
      if (target.role === 'Admin' || target.role === 'Super Admin') {
        throw AppError.forbidden(
          'Security Invariant: Admin cannot modify Admin or Super Admin accounts'
        );
      }
      if (input.role && (input.role === 'Admin' || input.role === 'Super Admin')) {
        throw AppError.forbidden(
          'Security Invariant: Admin cannot promote any user to Admin or Super Admin'
        );
      }
    }

    // Lower roles cannot edit other accounts
    if (actor.role !== 'Super Admin' && actor.role !== 'Admin') {
      if (actor.id !== target.id) {
        throw AppError.forbidden('Forbidden: You can only edit your own profile');
      }
      // Employee cannot change their own role
      if (input.role && input.role !== target.role) {
        throw AppError.forbidden('Forbidden: You cannot change your own role');
      }
    }

    const updated = await postgresUserRepository.update(userId, {
      name: input.name,
      email: input.email,
      phone: input.phone || undefined,
      avatarUrl: input.avatarUrl || undefined,
      role: input.role as UserRole | undefined,
      teamId: input.teamId || undefined,
      managerId: input.managerId || undefined,
      teamLeadId: input.teamLeadId || undefined,
    });

    if (!updated) {
      throw AppError.notFound(`User '${userId}' not found`);
    }

    await AuditService.logFromRequest(
      actor,
      'UPDATE_USER',
      'USER',
      updated.id,
      updated.name,
      { updatedFields: Object.keys(input) }
    );

    return updated;
  }

  /**
   * Update user active/restricted/inactive status
   */
  public static async updateUserStatus(
    actor: AuthUser,
    userId: string,
    input: UpdateUserStatusInput
  ): Promise<AuthUser> {
    const target = await postgresUserRepository.findById(userId);
    if (!target) {
      throw AppError.notFound(`User '${userId}' not found`);
    }

    // HARD INVARIANT: Admin CANNOT deactivate/restrict Admin or Super Admin
    if (actor.role === 'Admin') {
      if (target.role === 'Admin' || target.role === 'Super Admin') {
        throw AppError.forbidden(
          'Security Invariant: Admin cannot change status of Admin or Super Admin accounts'
        );
      }
    }

    if (actor.id === target.id && input.status === 'inactive') {
      throw AppError.badRequest('You cannot deactivate your own logged-in account');
    }

    const updated = await postgresUserRepository.update(userId, {
      status: input.status,
    });

    if (!updated) {
      throw AppError.notFound(`User '${userId}' not found`);
    }

    // If deactivated, revoke session token version
    if (input.status === 'inactive') {
      await postgresUserRepository.incrementTokenVersion(userId);
    }

    await AuditService.logFromRequest(
      actor,
      'CHANGE_USER_STATUS',
      'USER',
      updated.id,
      updated.name,
      { previousStatus: target.status, newStatus: input.status }
    );

    return updated;
  }

  /**
   * Reset target user credentials (Admin/Super Admin only)
   */
  public static async resetPassword(
    actor: AuthUser,
    userId: string,
    input: ResetUserPasswordInput
  ): Promise<void> {
    const target = await postgresUserRepository.findById(userId);
    if (!target) {
      throw AppError.notFound(`User '${userId}' not found`);
    }

    // HARD INVARIANT: Admin cannot reset Admin or Super Admin
    if (actor.role === 'Admin') {
      if (target.role === 'Admin' || target.role === 'Super Admin') {
        throw AppError.forbidden(
          'Security Invariant: Admin cannot reset password of Admin or Super Admin accounts'
        );
      }
    }

    const newHash = await PasswordService.hash(input.newPassword);
    await postgresUserRepository.updatePassword(userId, newHash);
    await postgresUserRepository.incrementTokenVersion(userId);

    await AuditService.logFromRequest(
      actor,
      'RESET_USER_PASSWORD',
      'USER',
      target.id,
      target.name
    );
  }
}
