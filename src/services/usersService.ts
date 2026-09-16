import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, UserRole } from '../types';

const VALID_USER_ROLES = new Set<string>(['Super Admin', 'Admin', 'Manager', 'Team Lead', 'Employee']);

function isValidUserRole(name: string): name is UserRole {
  return VALID_USER_ROLES.has(name);
}

/**
 * Users & Profiles Database Service
 *
 * Architecture Note:
 * Adapts normalized database entities (public.profiles, public.roles, public.teams, public.team_members)
 * to the frontend domain User model.
 *
 * Current RLS Limitation:
 * Under Migration 002, authenticated users can read their own profile, and Super Admins can read
 * all organization profiles. Reads are strictly scoped to rows permitted by current RLS.
 *
 * Current Privilege Limitation:
 * Under Migration 003, authenticated users have SELECT-only access.
 * Write operations (create, update, delete) are blocked until the secure write/Edge Function phase.
 */
export const usersService = {
  /**
   * Fetches user profiles visible under current RLS and adapts them to the User model.
   */
  async getAll(): Promise<{ data: User[] | null; error: any }> {
    if (!isSupabaseConfigured) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    // 1. Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (profilesError) return { data: null, error: profilesError };
    if (!profiles || profiles.length === 0) return { data: [], error: null };

    // 2. Fetch roles for role_id -> role name mapping
    const { data: roles, error: rolesError } = await supabase.from('roles').select('id, name');
    if (rolesError) return { data: null, error: rolesError };

    const roleNameById = new Map<string, string>();
    (roles || []).forEach(r => roleNameById.set(r.id, r.name));

    // Validate that all fetched profiles have a valid assigned role
    for (const p of profiles) {
      if (!p.role_id) {
        return { data: null, error: new Error(`Profile ${p.id} has no assigned role_id.`) };
      }
      const roleName = roleNameById.get(p.role_id);
      if (!roleName || !isValidUserRole(roleName)) {
        return {
          data: null,
          error: new Error(`Profile ${p.id} has unresolvable or unsupported role: '${roleName || 'undefined'}'`)
        };
      }
    }

    // 3. Fetch primary team memberships for team association
    const { data: teamMembers, error: teamMembersError } = await supabase
      .from('team_members')
      .select('team_id, profile_id, is_primary')
      .eq('is_primary', true);

    if (teamMembersError) return { data: null, error: teamMembersError };

    const primaryTeamIdByProfileId = new Map<string, string>();
    (teamMembers || []).forEach(tm => {
      primaryTeamIdByProfileId.set(tm.profile_id, tm.team_id);
    });

    // 4. Fetch teams for team details
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, team_lead_id');

    if (teamsError) return { data: null, error: teamsError };

    const teamById = new Map<string, { id: string; name: string; team_lead_id: string | null }>();
    (teams || []).forEach(t => teamById.set(t.id, t));

    // Profile lookup map for manager / team lead full_name resolution
    const profileNameById = new Map<string, string>();
    profiles.forEach(p => {
      if (p.full_name) profileNameById.set(p.id, p.full_name);
    });

    // 5. Adapt profiles to User domain models
    const users: User[] = profiles.map(p => {
      const roleName = roleNameById.get(p.role_id!) as UserRole;
      const teamId = primaryTeamIdByProfileId.get(p.id);
      const team = teamId ? teamById.get(teamId) : undefined;
      const teamName = team ? team.name : undefined;
      const managerName = p.manager_id ? profileNameById.get(p.manager_id) : undefined;
      const teamLeadId = team?.team_lead_id || undefined;
      const teamLeadName = teamLeadId ? profileNameById.get(teamLeadId) : undefined;

      return {
        id: p.id,
        name: p.full_name || '',
        email: p.email || '',
        role: roleName,
        teamId,
        teamName,
        managerId: p.manager_id || undefined,
        managerName,
        teamLeadId,
        teamLeadName,
        avatar: p.avatar_url || '',
        phone: p.phone || '',
        isActive: p.status === 'active',
        createdAt: p.created_at,
        lastLogin: undefined
      };
    });

    return { data: users, error: null };
  },

  /**
   * Fetches a single user profile by ID
   */
  async getById(id: string): Promise<{ data: User | null; error: any }> {
    if (!isSupabaseConfigured) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    const { data: p, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (pError) return { data: null, error: pError };
    if (!p) return { data: null, error: new Error(`Profile not found: ${id}`) };

    // Fetch and validate role name
    if (!p.role_id) {
      return { data: null, error: new Error(`Profile ${p.id} has no assigned role_id.`) };
    }

    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('name')
      .eq('id', p.role_id)
      .single();

    if (roleError) return { data: null, error: roleError };
    if (!role?.name || !isValidUserRole(role.name)) {
      return {
        data: null,
        error: new Error(`Profile ${p.id} has unresolvable or unsupported role: '${role?.name || 'undefined'}'`)
      };
    }
    const roleName: UserRole = role.name as UserRole;

    // Fetch primary team membership
    const { data: tm, error: tmError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('profile_id', p.id)
      .eq('is_primary', true)
      .maybeSingle();

    if (tmError) return { data: null, error: tmError };

    let teamId: string | undefined = undefined;
    let teamName: string | undefined = undefined;
    let teamLeadId: string | undefined = undefined;
    let teamLeadName: string | undefined = undefined;

    if (tm?.team_id) {
      teamId = tm.team_id;
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('name, team_lead_id')
        .eq('id', tm.team_id)
        .maybeSingle();

      if (teamError) return { data: null, error: teamError };

      if (team) {
        teamName = team.name;
        teamLeadId = team.team_lead_id || undefined;
        if (teamLeadId) {
          const { data: leadProfile, error: leadError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', teamLeadId)
            .maybeSingle();

          if (leadError) return { data: null, error: leadError };
          if (leadProfile?.full_name) {
            teamLeadName = leadProfile.full_name;
          }
        }
      }
    }

    let managerName: string | undefined = undefined;
    if (p.manager_id) {
      const { data: mgrProfile, error: mgrError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', p.manager_id)
        .maybeSingle();

      if (mgrError) return { data: null, error: mgrError };
      if (mgrProfile?.full_name) {
        managerName = mgrProfile.full_name;
      }
    }

    const user: User = {
      id: p.id,
      name: p.full_name || '',
      email: p.email || '',
      role: roleName,
      teamId,
      teamName,
      managerId: p.manager_id || undefined,
      managerName,
      teamLeadId,
      teamLeadName,
      avatar: p.avatar_url || '',
      phone: p.phone || '',
      isActive: p.status === 'active',
      createdAt: p.created_at,
      lastLogin: undefined
    };

    return { data: user, error: null };
  },

  /**
   * Creates a user profile (BLOCKED under current SELECT-only DB security).
   */
  async create(_user: Omit<User, 'id' | 'createdAt'>): Promise<{ data: User | null; error: any }> {
    return {
      data: null,
      error: new Error('User management writes are not enabled in the current database security phase.')
    };
  },

  /**
   * Updates an existing user profile (BLOCKED under current SELECT-only DB security).
   */
  async update(_id: string, _updates: Partial<User>): Promise<{ data: any; error: any }> {
    return {
      data: null,
      error: new Error('User management writes are not enabled in the current database security phase.')
    };
  },

  /**
   * Deletes a user profile (BLOCKED under current SELECT-only DB security).
   */
  async delete(_id: string): Promise<{ error: any }> {
    return {
      error: new Error('User management writes are not enabled in the current database security phase.')
    };
  }
};
