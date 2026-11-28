import { query } from '../database/connection';
import { UserRole, CapabilityKey, RolePermission } from '../types';
import { CANONICAL_CAPABILITIES } from '../constants/rbac.constants';
import { AppError } from '../utils/AppError';

export class PostgresRolePermissionRepository {
  /**
   * Fetch all 21 capabilities for a specific canonical role
   */
  public async getRolePermissions(roleName: UserRole): Promise<RolePermission> {
    const sql = `
      SELECT r.name as role, r.description, rp.capability, rp.is_granted
      FROM roles r
      JOIN role_permissions rp ON r.id = rp.role_id
      WHERE r.name = $1
    `;

    const res = await query<{
      role: string;
      description: string;
      capability: string;
      is_granted: boolean;
    }>(sql, [roleName]);

    if (res.rows.length === 0) {
      throw AppError.notFound(`Role "${roleName}" permissions not found`);
    }

    const first = res.rows[0];
    const perm: Partial<RolePermission> = {
      role: first.role as UserRole,
      description: first.description,
    };

    for (const cap of CANONICAL_CAPABILITIES) {
      const match = res.rows.find((r) => r.capability === cap);
      (perm as Record<string, unknown>)[cap] = match ? match.is_granted : false;
    }

    return perm as RolePermission;
  }

  /**
   * Fetch permission matrix for all 5 canonical roles
   */
  public async getAllRolePermissions(): Promise<RolePermission[]> {
    const rolesSql = 'SELECT name FROM roles ORDER BY created_at ASC';
    const rolesRes = await query<{ name: string }>(rolesSql);

    const matrices: RolePermission[] = [];
    for (const r of rolesRes.rows) {
      const perm = await this.getRolePermissions(r.name as UserRole);
      matrices.push(perm);
    }

    return matrices;
  }

  /**
   * Update a specific capability for a role in the database
   * Enforces hard security invariants at repository level.
   */
  public async updateRoleCapability(
    roleName: UserRole,
    capability: CapabilityKey,
    isGranted: boolean,
    changedByUserId?: string
  ): Promise<RolePermission> {
    // HARD IMMUTABLE RULES
    if (roleName === 'Super Admin') {
      throw AppError.badRequest('Super Admin permissions are permanently locked to full access');
    }

    if (capability === 'canManageRoles' || capability === 'canManageSuperAdmin') {
      if (isGranted) {
        throw AppError.forbidden(
          `Security Invariant: "${capability}" can NEVER be granted to ${roleName}`
        );
      }
    }

    if (
      roleName === 'Employee' &&
      (capability === 'canViewIncomingLeads' || capability === 'canAssignIncomingLeads')
    ) {
      if (isGranted) {
        throw AppError.forbidden(
          `Security Invariant: Employee cannot access Incoming Leads`
        );
      }
    }

    // Lookup role_id
    const roleRes = await query<{ id: string }>('SELECT id FROM roles WHERE name = $1 LIMIT 1', [
      roleName,
    ]);
    if (roleRes.rows.length === 0) {
      throw AppError.notFound(`Role "${roleName}" not found`);
    }
    const roleId = roleRes.rows[0].id;

    const validChangedBy =
      changedByUserId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(changedByUserId)
        ? changedByUserId
        : null;

    // Update or insert into role_permissions
    await query(
      `INSERT INTO role_permissions (role_id, capability, is_granted, changed_by, changed_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (role_id, capability) DO UPDATE
       SET is_granted = EXCLUDED.is_granted,
           changed_by = EXCLUDED.changed_by,
           changed_at = CURRENT_TIMESTAMP`,
      [roleId, capability, isGranted, validChangedBy]
    );

    return this.getRolePermissions(roleName);
  }
}

export const postgresRolePermissionRepository = new PostgresRolePermissionRepository();
