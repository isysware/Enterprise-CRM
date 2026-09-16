import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Team } from '../types';

/**
 * Teams Database Service
 *
 * Architecture Note:
 * Adapts normalized database entities (public.teams, public.team_members, public.profiles)
 * to the frontend domain Team model.
 *
 * Current RLS Limitation:
 * Under Migration 002, Super Admins can view all organization teams and memberships.
 * Other roles can view teams to which they belong.
 *
 * Current Privilege Limitation:
 * Under Migration 003, authenticated users have SELECT-only access.
 * Team write operations (create, update, delete) are blocked until the secure write phase.
 */
export const teamsService = {
  /**
   * Fetches teams visible under current RLS and adapts them to the Team model.
   */
  async getAll(): Promise<{ data: Team[] | null; error: any }> {
    if (!isSupabaseConfigured) {
      return { data: null, error: new Error('Supabase not configured') };
    }

    // 1. Fetch teams
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .order('name', { ascending: true });

    if (teamsError) return { data: null, error: teamsError };
    if (!teamsData || teamsData.length === 0) return { data: [], error: null };

    // 2. Fetch team memberships for memberIds derivation
    const { data: memberships, error: membershipsError } = await supabase
      .from('team_members')
      .select('team_id, profile_id');

    if (membershipsError) return { data: null, error: membershipsError };

    const memberIdsByTeamId = new Map<string, string[]>();
    (memberships || []).forEach(m => {
      if (!memberIdsByTeamId.has(m.team_id)) {
        memberIdsByTeamId.set(m.team_id, []);
      }
      memberIdsByTeamId.get(m.team_id)!.push(m.profile_id);
    });

    // 3. Fetch manager & lead profile names
    const profileIdsToFetch = new Set<string>();
    teamsData.forEach(t => {
      if (t.manager_id) profileIdsToFetch.add(t.manager_id);
      if (t.team_lead_id) profileIdsToFetch.add(t.team_lead_id);
    });

    const profileNameById = new Map<string, string>();
    if (profileIdsToFetch.size > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(profileIdsToFetch));

      if (profilesError) return { data: null, error: profilesError };

      (profiles || []).forEach(p => {
        if (p.full_name) profileNameById.set(p.id, p.full_name);
      });
    }

    // 4. Adapt to Team domain model (code is optional and not stored in DB)
    const teams: Team[] = teamsData.map(row => ({
      id: row.id,
      name: row.name,
      code: undefined,
      description: row.description || '',
      managerId: row.manager_id || undefined,
      managerName: row.manager_id ? profileNameById.get(row.manager_id) : undefined,
      leaderId: row.team_lead_id || undefined,
      leaderName: row.team_lead_id ? profileNameById.get(row.team_lead_id) : undefined,
      memberIds: memberIdsByTeamId.get(row.id) || [],
      createdAt: row.created_at
    }));

    return { data: teams, error: null };
  },

  /**
   * Creates a new team (BLOCKED under current SELECT-only DB security).
   */
  async create(_team: Omit<Team, 'id' | 'createdAt'>): Promise<{ data: any; error: any }> {
    return {
      data: null,
      error: new Error('Team management writes are not enabled in the current database security phase.')
    };
  },

  /**
   * Updates an existing team (BLOCKED under current SELECT-only DB security).
   */
  async update(_id: string, _updates: Partial<Team>): Promise<{ data: any; error: any }> {
    return {
      data: null,
      error: new Error('Team management writes are not enabled in the current database security phase.')
    };
  },

  /**
   * Deletes a team (BLOCKED under current SELECT-only DB security).
   */
  async delete(_id: string): Promise<{ error: any }> {
    return {
      error: new Error('Team management writes are not enabled in the current database security phase.')
    };
  }
};
