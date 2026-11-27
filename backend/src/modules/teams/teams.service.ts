import { query } from '../../database/connection';
import { postgresTeamRepository, TeamDbRow, TeamMembershipDbRow } from '../../repositories/postgres.team.repository';
import { AuthUser } from '../../types';
import { AuditService } from '../../services/audit.service';
import { AppError } from '../../utils/AppError';
import { CreateTeamInput, UpdateTeamInput, AddTeamMemberInput } from './teams.validator';

export interface TeamWithDetails extends TeamDbRow {
  manager_name?: string;
  team_lead_name?: string;
  member_count?: number;
}

export class TeamsService {
  public static async listTeams(): Promise<TeamWithDetails[]> {
    const sql = `
      SELECT t.*,
             m.name as manager_name,
             tl.name as team_lead_name,
             COUNT(tm.id)::int as member_count
      FROM teams t
      LEFT JOIN users m ON t.manager_id = m.id
      LEFT JOIN users tl ON t.team_lead_id = tl.id
      LEFT JOIN team_memberships tm ON t.id = tm.team_id AND tm.status = 'active'
      GROUP BY t.id, m.name, tl.name
      ORDER BY t.created_at ASC
    `;
    const res = await query<TeamWithDetails>(sql);
    return res.rows;
  }

  public static async getTeamById(id: string): Promise<TeamWithDetails & { members: unknown[] }> {
    const team = await postgresTeamRepository.findTeamById(id);
    if (!team) {
      throw AppError.notFound(`Team '${id}' not found`);
    }

    const membersSql = `
      SELECT tm.id as membership_id, tm.is_primary, tm.status, tm.joined_at,
             u.id as user_id, u.name, u.email, u.role_name as role, u.avatar_url
      FROM team_memberships tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1
      ORDER BY tm.is_primary DESC, u.name ASC
    `;
    const membersRes = await query(membersSql, [id]);

    return {
      ...team,
      members: membersRes.rows,
    };
  }

  public static async createTeam(actor: AuthUser, input: CreateTeamInput): Promise<TeamDbRow> {
    const existing = await query('SELECT id FROM teams WHERE name = $1 OR code = $2', [
      input.name,
      input.code,
    ]);
    if (existing.rows.length > 0) {
      throw AppError.conflict('Team with this name or code already exists');
    }

    const created = await postgresTeamRepository.createTeam({
      name: input.name,
      code: input.code,
      description: input.description,
      managerId: input.managerId || undefined,
      teamLeadId: input.teamLeadId || undefined,
    });

    await AuditService.logFromRequest(actor, 'CREATE_TEAM', 'TEAM', created.id, created.name);
    return created;
  }

  public static async updateTeam(
    actor: AuthUser,
    id: string,
    input: UpdateTeamInput
  ): Promise<TeamDbRow> {
    const team = await postgresTeamRepository.findTeamById(id);
    if (!team) {
      throw AppError.notFound(`Team '${id}' not found`);
    }

    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${idx++}`);
      params.push(input.name);
    }
    if (input.code !== undefined) {
      fields.push(`code = $${idx++}`);
      params.push(input.code);
    }
    if (input.description !== undefined) {
      fields.push(`description = $${idx++}`);
      params.push(input.description);
    }
    if (input.managerId !== undefined) {
      fields.push(`manager_id = $${idx++}`);
      params.push(input.managerId);
    }
    if (input.teamLeadId !== undefined) {
      fields.push(`team_lead_id = $${idx++}`);
      params.push(input.teamLeadId);
    }
    if (input.status !== undefined) {
      fields.push(`status = $${idx++}`);
      params.push(input.status);
    }

    if (fields.length === 0) return team;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const updateSql = `UPDATE teams SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await query<TeamDbRow>(updateSql, params);

    await AuditService.logFromRequest(actor, 'UPDATE_TEAM', 'TEAM', id, res.rows[0].name);
    return res.rows[0];
  }

  public static async deleteTeam(actor: AuthUser, id: string): Promise<void> {
    const team = await postgresTeamRepository.findTeamById(id);
    if (!team) {
      throw AppError.notFound(`Team '${id}' not found`);
    }

    await query('DELETE FROM teams WHERE id = $1', [id]);
    await AuditService.logFromRequest(actor, 'DELETE_TEAM', 'TEAM', id, team.name);
  }

  public static async addMember(
    actor: AuthUser,
    teamId: string,
    input: AddTeamMemberInput
  ): Promise<TeamMembershipDbRow> {
    const team = await postgresTeamRepository.findTeamById(teamId);
    if (!team) {
      throw AppError.notFound(`Team '${teamId}' not found`);
    }

    const membership = await postgresTeamRepository.addTeamMember({
      teamId,
      userId: input.userId,
      isPrimary: input.isPrimary,
      status: 'active',
      createdBy: actor.id,
    });

    // If primary, update user's primary team_id on users table
    if (input.isPrimary) {
      await query('UPDATE users SET team_id = $1 WHERE id = $2', [teamId, input.userId]);
    }

    await AuditService.logFromRequest(
      actor,
      'ADD_TEAM_MEMBER',
      'TEAM_MEMBERSHIP',
      membership.id,
      team.name,
      { userId: input.userId, isPrimary: input.isPrimary }
    );

    return membership;
  }

  public static async removeMember(actor: AuthUser, teamId: string, userId: string): Promise<void> {
    const res = await query(
      'DELETE FROM team_memberships WHERE team_id = $1 AND user_id = $2 RETURNING id, is_primary',
      [teamId, userId]
    );

    if (res.rows.length === 0) {
      throw AppError.notFound('Team membership not found');
    }

    // If removed membership was primary, clear primary team on users table
    if (res.rows[0].is_primary) {
      await query('UPDATE users SET team_id = NULL WHERE id = $1 AND team_id = $2', [userId, teamId]);
    }

    await AuditService.logFromRequest(actor, 'REMOVE_TEAM_MEMBER', 'TEAM_MEMBERSHIP', teamId, undefined, {
      removedUserId: userId,
    });
  }
}
