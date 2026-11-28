import { postgresRolePermissionRepository } from '../../repositories';
import { query } from '../../database/connection';
import { UserRole, CapabilityKey, RolePermission, AuthUser } from '../../types';
import { DEFAULT_ROLE_PERMISSIONS, CANONICAL_CAPABILITIES } from '../../constants';
import { AuditService } from '../../services/audit.service';
import { AppError } from '../../utils/AppError';
import { UpdateRolePermissionInput } from './roles.validator';

export class RolesService {
  /**
   * Get all registered canonical roles
   */
  public static async getRoles(): Promise<{ id: string; name: string; description: string; isProtected: boolean }[]> {
    const res = await query<{
      id: string;
      name: string;
      description: string;
      is_protected: boolean;
    }>('SELECT id, name, description, is_protected FROM roles ORDER BY created_at ASC');

    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isProtected: r.is_protected,
    }));
  }

  /**
   * Get 21-capability matrices for all roles (Super Admin only)
   */
  public static async getAllMatrices(): Promise<RolePermission[]> {
    return postgresRolePermissionRepository.getAllRolePermissions();
  }

  /**
   * Update a specific capability in the dynamic matrix
   */
  public static async updateCapability(
    actor: AuthUser,
    roleName: UserRole,
    input: UpdateRolePermissionInput
  ): Promise<RolePermission> {
    const updated = await postgresRolePermissionRepository.updateRoleCapability(
      roleName,
      input.capability as CapabilityKey,
      input.isGranted,
      actor.id
    );

    await AuditService.logFromRequest(
      actor,
      'UPDATE_ROLE_PERMISSION',
      'ROLE_PERMISSION',
      roleName,
      input.capability,
      { isGranted: input.isGranted }
    );

    return updated;
  }

  /**
   * Reset all role matrices to system canonical defaults
   */
  public static async resetToDefaults(actor: AuthUser): Promise<RolePermission[]> {
    if (actor.role !== 'Super Admin') {
      throw AppError.forbidden('Forbidden: Only Super Admin can reset the permission matrices');
    }

    const isUuid = (str?: string | null): boolean =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
    const validActorId = isUuid(actor.id) ? actor.id : null;

    for (const roleDef of DEFAULT_ROLE_PERMISSIONS) {
      if (roleDef.role === 'Super Admin') continue;

      const roleRes = await query<{ id: string }>('SELECT id FROM roles WHERE name = $1', [
        roleDef.role,
      ]);
      if (roleRes.rows.length === 0) continue;
      const roleId = roleRes.rows[0].id;

      for (const cap of CANONICAL_CAPABILITIES) {
        const isGranted = Boolean((roleDef as unknown as Record<string, unknown>)[cap]);
        await query(
          `UPDATE role_permissions 
           SET is_granted = $1, changed_by = $2, changed_at = CURRENT_TIMESTAMP
           WHERE role_id = $3 AND capability = $4`,
          [isGranted, validActorId, roleId, cap]
        );
      }
    }

    await AuditService.logFromRequest(
      actor,
      'RESET_ROLE_PERMISSIONS',
      'ROLE_PERMISSION',
      'ALL_ROLES',
      'Reset all dynamic permissions to defaults'
    );

    return postgresRolePermissionRepository.getAllRolePermissions();
  }
}
