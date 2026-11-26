import {
  AuthUser,
  UserRole,
  RolePermission,
  HierarchyScope,
  CapabilityKey,
} from '../types';
import { DEFAULT_ROLE_PERMISSIONS } from '../constants';

export class RbacService {
  /**
   * Resolves effective permissions by combining the role baseline defaults with dynamic matrix overrides.
   *
   * PERMISSION SEMANTICS:
   * 1. Default role permissions are DEFAULTS only, not permanent ceilings.
   * 2. The 21-capability Roles & Permissions Matrix is dynamically editable by Super Admin.
   * 3. Super Admin may enable or disable normal capabilities (e.g. canViewReports, canGenerateProposals)
   *    for Manager, Team Lead, and Employee.
   * 4. Dynamic permissions must NEVER override HARD IMMUTABLE SECURITY & SCOPE RULES.
   *
   * HARD IMMUTABLE RULES:
   * - canManageRoles is strictly Super Admin only.
   * - canManageSuperAdmin is strictly Super Admin only.
   * - Employee incoming lead capabilities (canViewIncomingLeads, canAssignIncomingLeads) remain hard-locked to false.
   * - Capabilities grant action authority ONLY inside the actor's hard organizational scope ceiling.
   */
  public static getEffectivePermissions(
    role: UserRole,
    dynamicMatrix?: RolePermission[]
  ): RolePermission {
    const base =
      DEFAULT_ROLE_PERMISSIONS.find((r) => r.role === role) ||
      DEFAULT_ROLE_PERMISSIONS.find((r) => r.role === 'Employee')!;

    // Start with default role baseline
    const effective: RolePermission = { ...base };

    // Apply dynamic overrides configured by Super Admin
    if (dynamicMatrix) {
      const override = dynamicMatrix.find((r) => r.role === role);
      if (override) {
        for (const key of Object.keys(base) as (keyof RolePermission)[]) {
          if (key === 'role' || key === 'description') continue;
          if (override[key] !== undefined) {
            (effective as unknown as Record<string, boolean>)[key] = Boolean(override[key]);
          }
        }
      }
    }

    // =========================================================================
    // HARD IMMUTABLE SECURITY INVARIANTS (Cannot be overridden by dynamic matrix)
    // =========================================================================

    // Rule 1: canManageRoles & canManageSuperAdmin are strictly reserved for Super Admin
    if (role !== 'Super Admin') {
      effective.canManageRoles = false;
      effective.canManageSuperAdmin = false;
    } else {
      effective.canManageRoles = true;
      effective.canManageSuperAdmin = true;
    }

    // Rule 2: Employee Incoming Lead restrictions remain hard-locked to false
    if (role === 'Employee') {
      effective.canViewIncomingLeads = false;
      effective.canAssignIncomingLeads = false;
    }

    return effective;
  }

  /**
   * Validates if actor can access and modify Roles & Permissions matrix.
   * Strict Hard Rule: Super Admin only.
   */
  public static canManageRolesMatrix(actor: AuthUser): boolean {
    return actor.role === 'Super Admin' && actor.status === 'active';
  }

  /**
   * Resolves the allowed target roles an actor can create.
   *
   * Hard Rules:
   * - Super Admin: Admin, Manager, Team Lead, Employee
   * - Admin: Manager, Team Lead, Employee (Admin can NEVER create Admin or Super Admin)
   * - Lower roles: [] (no creation authority)
   */
  public static getAllowedTargetRoles(actor: AuthUser): readonly UserRole[] {
    if (actor.status !== 'active') return [];
    if (actor.role === 'Super Admin') {
      return ['Admin', 'Manager', 'Team Lead', 'Employee'] as const;
    }
    if (actor.role === 'Admin') {
      return ['Manager', 'Team Lead', 'Employee'] as const;
    }
    return [] as const;
  }

  /**
   * Validates if actor can create an account with the specified role
   */
  public static canCreateRole(actor: AuthUser, targetRole: UserRole): boolean {
    const allowed = this.getAllowedTargetRoles(actor);
    return allowed.includes(targetRole);
  }

  /**
   * Validates if actor can manage (edit, delete, deactivate, or reset password) of a target user.
   *
   * Hard Authority Rules:
   * 1. Target is Super Admin: ONLY Super Admin can manage. Admin can NEVER manage a Super Admin.
   * 2. Target is Admin: ONLY Super Admin can manage. Admin CANNOT manage, edit, delete, or reset another Admin!
   * 3. Target is Manager, Team Lead, Employee: Super Admin and Admin have management authority.
   * 4. Manager, Team Lead, Employee: Cannot manage other accounts.
   */
  public static canManageTargetUser(
    actor: AuthUser,
    targetUser: { id: string; role: UserRole }
  ): boolean {
    if (actor.status !== 'active') return false;

    // Actor managing self (profile/own password change is handled via own endpoints)
    if (actor.id === targetUser.id) return true;

    // Super Admin has master authority across all roles
    if (actor.role === 'Super Admin') return true;

    // Admin Authority Constraints:
    if (actor.role === 'Admin') {
      // Admin can NEVER manage Super Admin
      if (targetUser.role === 'Super Admin') return false;
      // Admin can NEVER manage another Admin or any Admin account!
      if (targetUser.role === 'Admin') return false;
      // Admin can manage operational roles
      return targetUser.role === 'Manager' || targetUser.role === 'Team Lead' || targetUser.role === 'Employee';
    }

    // Lower roles cannot manage user accounts
    return false;
  }

  /**
   * Validates if actor can transition target user's role from currentRole to newRole
   */
  public static canTransitionUserRole(
    actor: AuthUser,
    currentRole: UserRole,
    newRole: UserRole
  ): boolean {
    if (actor.status !== 'active') return false;
    if (currentRole === newRole) return true;

    if (actor.role === 'Super Admin') {
      // Super Admin can transition between operational roles and Admin
      return newRole !== 'Super Admin';
    }

    if (actor.role === 'Admin') {
      // Admin cannot touch Admin or Super Admin
      if (currentRole === 'Super Admin' || currentRole === 'Admin') return false;
      if (newRole === 'Super Admin' || newRole === 'Admin') return false;
      return true;
    }

    return false;
  }

  /**
   * Resolves hard organizational hierarchy scope.
   *
   * Hard Invariant:
   * - Super Admin / Admin: Organization-wide
   * - Manager: Managed department hierarchy (primary team managerId or teamId)
   * - Team Lead: Led team hierarchy (primary team leaderId or teamId)
   * - Employee: Strictly self-only
   * - SECONDARY TEAM MEMBERSHIP: Must NEVER grant supervisory authority.
   */
  public static getHierarchyScope(
    actor: AuthUser,
    allUsers: AuthUser[],
    allTeams: { id: string; managerId?: string; leaderId?: string; memberIds?: string[] }[]
  ): HierarchyScope {
    const role = actor.role;

    // 1. Super Admin: Organization-wide
    if (role === 'Super Admin') {
      return {
        managedTeamIds: allTeams.map((t) => t.id),
        subordinateUserIds: allUsers.map((u) => u.id),
        scopedTeamIds: allTeams.map((t) => t.id),
        assignableUserIds: allUsers.filter((u) => u.isActive).map((u) => u.id),
      };
    }

    // 2. Admin: Organization-wide (Super Admin excluded from subordinate operational targets)
    if (role === 'Admin') {
      return {
        managedTeamIds: allTeams.map((t) => t.id),
        subordinateUserIds: allUsers.filter((u) => u.role !== 'Super Admin').map((u) => u.id),
        scopedTeamIds: allTeams.map((t) => t.id),
        assignableUserIds: allUsers
          .filter((u) => u.isActive && u.role !== 'Super Admin')
          .map((u) => u.id),
      };
    }

    // 3. Manager: Operational hierarchy strictly for primary managed teams
    if (role === 'Manager') {
      // Hard Invariant: Secondary team membership does not grant supervisory authority
      const managedTeams = allTeams.filter(
        (t) => t.managerId === actor.id || t.id === actor.teamId
      );
      const managedTeamIds = managedTeams.map((t) => t.id);

      const subUsers = allUsers.filter(
        (u) =>
          u.id === actor.id ||
          (u.teamId && managedTeamIds.includes(u.teamId)) ||
          u.managerId === actor.id
      );
      const subordinateUserIds = subUsers.map((u) => u.id);

      const assignableUserIds = subUsers
        .filter(
          (u) =>
            u.isActive &&
            u.role !== 'Super Admin' &&
            u.role !== 'Admin' &&
            (u.id === actor.id || u.role === 'Team Lead' || u.role === 'Employee')
        )
        .map((u) => u.id);

      return {
        managedTeamIds,
        subordinateUserIds,
        scopedTeamIds: managedTeamIds,
        assignableUserIds,
      };
    }

    // 4. Team Lead: Sub-team hierarchy strictly for primary led team
    if (role === 'Team Lead') {
      // Hard Invariant: Secondary team membership does not grant supervisory authority
      const ledTeams = allTeams.filter(
        (t) => t.leaderId === actor.id || t.id === actor.teamId
      );
      const ledTeamIds = ledTeams.map((t) => t.id);

      const subUsers = allUsers.filter(
        (u) =>
          u.id === actor.id ||
          (u.teamId && ledTeamIds.includes(u.teamId) && u.role === 'Employee') ||
          u.teamLeadId === actor.id
      );
      const subordinateUserIds = subUsers.map((u) => u.id);

      const assignableUserIds = subUsers
        .filter(
          (u) =>
            u.isActive &&
            u.role !== 'Super Admin' &&
            u.role !== 'Admin' &&
            u.role !== 'Manager' &&
            (u.id === actor.id || u.role === 'Employee')
        )
        .map((u) => u.id);

      return {
        managedTeamIds: ledTeamIds,
        subordinateUserIds,
        scopedTeamIds: ledTeamIds,
        assignableUserIds,
      };
    }

    // 5. Employee: Strictly self-only; no subordinate hierarchy; no cross-user assignment
    return {
      managedTeamIds: actor.teamId ? [actor.teamId] : [],
      subordinateUserIds: [actor.id],
      scopedTeamIds: actor.teamId ? [actor.teamId] : [],
      assignableUserIds: actor.isActive ? [actor.id] : [],
    };
  }

  /**
   * Enforces hard organizational scope ceiling on records (leads, reports, metrics).
   *
   * HARD SCOPE RULE:
   * Dynamic capabilities grant actions STRICTLY inside the actor's hard data scope.
   * Example: If Super Admin enables canViewReports for Employee, Employee may see reports
   * only for their own authorized data, never organization-wide data.
   */
  public static getHardScopedLeadIds(
    actor: AuthUser,
    leads: { id: string; assignedToId?: string; teamId?: string }[],
    hierarchy: HierarchyScope
  ): string[] {
    if (actor.role === 'Super Admin' || actor.role === 'Admin') {
      return leads.map((l) => l.id);
    }

    if (actor.role === 'Manager' || actor.role === 'Team Lead') {
      return leads
        .filter(
          (l) =>
            l.assignedToId === actor.id ||
            (l.assignedToId && hierarchy.subordinateUserIds.includes(l.assignedToId)) ||
            (l.teamId && hierarchy.managedTeamIds.includes(l.teamId))
        )
        .map((l) => l.id);
    }

    // Employee: Hard scope ceiling is STRICTLY records assigned to themselves
    return leads.filter((l) => l.assignedToId === actor.id).map((l) => l.id);
  }

  /**
   * Filters operational records (e.g. leads, reports, conversions) by evaluating
   * dynamic capability within the actor's hard organizational scope ceiling.
   */
  public static getScopedRecordIds<T extends { id: string; assignedToId?: string; teamId?: string }>(
    actor: AuthUser,
    records: T[],
    hierarchy: HierarchyScope,
    hasCapability: boolean
  ): string[] {
    if (!hasCapability) return [];

    // Apply hard organizational ceiling first
    const ceilingIds = this.getHardScopedLeadIds(actor, records, hierarchy);
    return ceilingIds;
  }
}
