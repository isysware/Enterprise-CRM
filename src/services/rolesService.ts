import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { RolePermission, UserRole } from '../types';

const VALID_USER_ROLES = new Set<string>(['Super Admin', 'Admin', 'Manager', 'Team Lead', 'Employee']);

function isValidUserRole(name: string): name is UserRole {
  return VALID_USER_ROLES.has(name);
}

/**
 * Role Permissions & Capabilities Database Service
 *
 * Architecture Note:
 * Reads from normalized tables (public.roles, public.role_permissions, public.permissions)
 * and adapts them to the frontend RolePermission model.
 *
 * Current RLS & Privilege Limitation:
 * Under Migration 003, authenticated users have SELECT-only access on RBAC tables.
 * Mutation methods (update, saveAll) are intentionally blocked until the secure write phase.
 */
export const rolesService = {
  /**
   * Fetches all roles and builds the 18-capability matrix for each role.
   */
  async getAll(): Promise<{ data: RolePermission[] | null; error: any }> {
    if (!isSupabaseConfigured) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    // 1. Fetch roles ordered by hierarchy level
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .order('hierarchy_level', { ascending: true });

    if (rolesError) return { data: null, error: rolesError };
    if (!rolesData || rolesData.length === 0) return { data: [], error: null };

    // Validate that all roles have supported names
    for (const role of rolesData) {
      if (!isValidUserRole(role.name)) {
        return {
          data: null,
          error: new Error(`Encountered unsupported database role name: '${role.name}'`)
        };
      }
    }

    // 2. Fetch permissions catalog
    const { data: permsData, error: permsError } = await supabase
      .from('permissions')
      .select('*');

    if (permsError) return { data: null, error: permsError };

    // Map permission ID to canonical permission code
    const permCodeById = new Map<string, string>();
    (permsData || []).forEach(p => {
      permCodeById.set(p.id, p.code);
    });

    // 3. Fetch role_permissions mappings
    const { data: rolePermsData, error: rolePermsError } = await supabase
      .from('role_permissions')
      .select('*');

    if (rolePermsError) return { data: null, error: rolePermsError };

    // Group enabled permission codes by role_id
    const enabledCodesByRoleId = new Map<string, Set<string>>();
    (rolePermsData || []).forEach(rp => {
      if (rp.enabled) {
        if (!enabledCodesByRoleId.has(rp.role_id)) {
          enabledCodesByRoleId.set(rp.role_id, new Set());
        }
        const code = permCodeById.get(rp.permission_id);
        if (code) {
          enabledCodesByRoleId.get(rp.role_id)!.add(code);
        }
      }
    });

    // 4. Adapt each role into RolePermission
    const result: RolePermission[] = rolesData.map(role => {
      const enabledSet = enabledCodesByRoleId.get(role.id) || new Set<string>();

      return {
        role: role.name as UserRole,
        description: role.description || '',
        canViewAllLeads: enabledSet.has('leads.view_all'),
        canViewTeamLeads: enabledSet.has('leads.view_team'),
        canViewAssignedLeads: enabledSet.has('leads.view_assigned'),
        canCreateLeads: enabledSet.has('leads.create'),
        canEditAllLeads: enabledSet.has('leads.edit_scoped'),
        canDeleteLeads: enabledSet.has('leads.delete'),
        canReassignLeads: enabledSet.has('leads.reassign'),
        canGenerateProposals: enabledSet.has('proposals.generate'),
        canBulkImportExport: enabledSet.has('leads.bulk_import_export'),
        canViewClients: enabledSet.has('clients.view'),
        canViewReports: enabledSet.has('reports.view'),
        canManageTeams: enabledSet.has('teams.manage'),
        canManageServices: enabledSet.has('services.manage'),
        canManageUsers: enabledSet.has('users.manage'),
        canManageSuperAdmin: enabledSet.has('users.manage_super_admin'),
        canManageRoles: enabledSet.has('roles.manage'),
        canViewAuditLogs: enabledSet.has('audit_logs.view'),
        canAccessSettings: enabledSet.has('settings.manage'),
        canViewIncomingLeads: enabledSet.has('integrations.view_incoming'),
        canAssignIncomingLeads: enabledSet.has('integrations.assign_incoming'),
        canManageIntegrations: enabledSet.has('integrations.manage')
      };
    });

    return { data: result, error: null };
  },

  /**
   * Updates an existing role permission matrix (BLOCKED under current SELECT-only DB security).
   */
  async update(_rolePerm: RolePermission): Promise<{ data: any; error: any }> {
    return {
      data: null,
      error: new Error('Role permission writes are not enabled in the current database security phase.')
    };
  },

  /**
   * Saves all role permissions in bulk (BLOCKED under current SELECT-only DB security).
   */
  async saveAll(_permissionsList: RolePermission[]): Promise<{ data: any; error: any }> {
    return {
      data: null,
      error: new Error('Role permission writes are not enabled in the current database security phase.')
    };
  }
};
