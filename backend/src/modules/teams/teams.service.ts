import { query, withTransaction } from '../../database/connection';
import { postgresTeamRepository, TeamDbRow, TeamMembershipDbRow } from '../../repositories/postgres.team.repository';
import { AuthUser } from '../../types';
import { AuditService } from '../../services/audit.service';
import { AppError } from '../../utils/AppError';
import { CreateTeamInput, UpdateTeamInput, AddTeamMemberInput } from './teams.validator';

export interface TeamWithDetails extends TeamDbRow {
  manager_name?: string;
  team_lead_name?: string;
  member_count?: number;
  member_ids?: string[];
}

export class TeamsService {
  /**
   * Lists all teams with aggregated manager name, lead name, member count and active member IDs
   */
  public static async listTeams(): Promise<TeamWithDetails[]> {
    const sql = `
      SELECT t.*,
             m.name as manager_name,
             tl.name as team_lead_name,
             COUNT(DISTINCT tm.user_id)::int as member_count,
             COALESCE(
               array_agg(DISTINCT tm.user_id::text) FILTER (WHERE tm.user_id IS NOT NULL AND tm.status = 'active'),
               '{}'
             ) as member_ids
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

  /**
   * Retrieves single team by ID with active members and leadership details
   */
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
      WHERE tm.team_id = $1 AND tm.status = 'active'
      ORDER BY tm.is_primary DESC, u.name ASC
    `;
    const membersRes = await query(membersSql, [id]);

    const detailsSql = `
      SELECT m.name as manager_name, tl.name as team_lead_name
      FROM teams t
      LEFT JOIN users m ON t.manager_id = m.id
      LEFT JOIN users tl ON t.team_lead_id = tl.id
      WHERE t.id = $1
    `;
    const detailsRes = await query<{ manager_name?: string; team_lead_name?: string }>(detailsSql, [id]);

    const activeMemberIds = membersRes.rows.map((r: any) => r.user_id as string);

    return {
      ...team,
      manager_name: detailsRes.rows[0]?.manager_name,
      team_lead_name: detailsRes.rows[0]?.team_lead_name,
      member_count: activeMemberIds.length,
      member_ids: activeMemberIds,
      members: membersRes.rows,
    };
  }

  /**
   * Atomically creates a team and syncs leadership, memberships, and user hierarchy in PostgreSQL
   */
  public static async createTeam(actor: AuthUser, input: CreateTeamInput): Promise<TeamWithDetails> {
    return await withTransaction(async (client) => {
      const existing = await client.query('SELECT id FROM teams WHERE name = $1 OR code = $2', [
        input.name,
        input.code,
      ]);
      if (existing.rows.length > 0) {
        throw AppError.conflict('Team with this name or code already exists');
      }

      const teamInsertSql = `
        INSERT INTO teams (name, code, description, manager_id, team_lead_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const teamRes = await client.query<TeamDbRow>(teamInsertSql, [
        input.name,
        input.code,
        input.description || null,
        input.managerId || null,
        input.teamLeadId || null,
      ]);
      const created = teamRes.rows[0];

      const managerId = input.managerId || null;
      const teamLeadId = input.teamLeadId || null;
      const explicitMemberIds = input.memberIds || [];

      // Combine explicit members + manager + lead into team memberships
      const allTargetMemberIds = Array.from(
        new Set([
          ...explicitMemberIds,
          ...(managerId ? [managerId] : []),
          ...(teamLeadId ? [teamLeadId] : []),
        ])
      );

      // Upsert active team memberships
      for (const mId of allTargetMemberIds) {
        await client.query(
          `INSERT INTO team_memberships (team_id, user_id, is_primary, status, created_by)
           VALUES ($1, $2, true, 'active', $3)
           ON CONFLICT (team_id, user_id) DO UPDATE
           SET is_primary = true, status = 'active', left_at = NULL, updated_at = CURRENT_TIMESTAMP`,
          [created.id, mId, actor.id]
        );
      }

      // Sync user hierarchy in users table
      if (managerId) {
        await client.query(
          'UPDATE users SET team_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [created.id, managerId]
        );
      }
      if (teamLeadId) {
        await client.query(
          'UPDATE users SET team_id = $1, manager_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [created.id, managerId, teamLeadId]
        );
      }
      const regularMemberIds = allTargetMemberIds.filter(
        (uid) => uid !== managerId && uid !== teamLeadId
      );
      if (regularMemberIds.length > 0) {
        await client.query(
          `UPDATE users
           SET team_id = $1, manager_id = $2, team_lead_id = $3, updated_at = CURRENT_TIMESTAMP
           WHERE id = ANY($4::uuid[])`,
          [created.id, managerId, teamLeadId, regularMemberIds]
        );
      }

      await AuditService.logFromRequest(actor, 'CREATE_TEAM', 'TEAM', created.id, created.name, {
        managerId,
        teamLeadId,
        memberCount: allTargetMemberIds.length,
      });

      return {
        ...created,
        member_count: allTargetMemberIds.length,
        member_ids: allTargetMemberIds,
      };
    });
  }

  /**
   * Atomically updates a team and syncs leadership, memberships, and user hierarchy in PostgreSQL
   */
  public static async updateTeam(
    actor: AuthUser,
    id: string,
    input: UpdateTeamInput
  ): Promise<TeamWithDetails> {
    return await withTransaction(async (client) => {
      const lockRes = await client.query<TeamDbRow>('SELECT * FROM teams WHERE id = $1 FOR UPDATE', [id]);
      if (lockRes.rows.length === 0) {
        throw AppError.notFound(`Team '${id}' not found`);
      }
      const currentTeam = lockRes.rows[0];

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

      let updatedTeam = currentTeam;
      if (fields.length > 0) {
        fields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);
        const updateSql = `UPDATE teams SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
        const res = await client.query<TeamDbRow>(updateSql, params);
        updatedTeam = res.rows[0];
      }

      const effectiveManagerId =
        input.managerId !== undefined ? input.managerId : updatedTeam.manager_id;
      const effectiveTeamLeadId =
        input.teamLeadId !== undefined ? input.teamLeadId : updatedTeam.team_lead_id;

      let activeMemberIds: string[] = [];

      if (input.memberIds !== undefined) {
        const targetMemberIds = Array.from(
          new Set([
            ...input.memberIds,
            ...(effectiveManagerId ? [effectiveManagerId] : []),
            ...(effectiveTeamLeadId ? [effectiveTeamLeadId] : []),
          ])
        );
        activeMemberIds = targetMemberIds;

        // 1. Inactivate memberships and clear user hierarchy for removed members
        if (targetMemberIds.length > 0) {
          await client.query(
            `UPDATE team_memberships
             SET status = 'inactive', is_primary = false, left_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE team_id = $1 AND user_id != ALL($2::uuid[])`,
            [id, targetMemberIds]
          );
          await client.query(
            `UPDATE users
             SET team_id = NULL, manager_id = NULL, team_lead_id = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE team_id = $1 AND id != ALL($2::uuid[])`,
            [id, targetMemberIds]
          );
        } else {
          await client.query(
            `UPDATE team_memberships
             SET status = 'inactive', is_primary = false, left_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE team_id = $1`,
            [id]
          );
          await client.query(
            `UPDATE users
             SET team_id = NULL, manager_id = NULL, team_lead_id = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE team_id = $1`,
            [id]
          );
        }

        // 2. Upsert active memberships for targetMemberIds
        for (const mId of targetMemberIds) {
          await client.query(
            `INSERT INTO team_memberships (team_id, user_id, is_primary, status, created_by)
             VALUES ($1, $2, true, 'active', $3)
             ON CONFLICT (team_id, user_id) DO UPDATE
             SET is_primary = true, status = 'active', left_at = NULL, updated_at = CURRENT_TIMESTAMP`,
            [id, mId, actor.id]
          );
        }

        // 3. Sync user hierarchy in users table
        if (effectiveManagerId) {
          await client.query(
            'UPDATE users SET team_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [id, effectiveManagerId]
          );
        }
        if (effectiveTeamLeadId) {
          await client.query(
            'UPDATE users SET team_id = $1, manager_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [id, effectiveManagerId || null, effectiveTeamLeadId]
          );
        }
        const regularMemberIds = targetMemberIds.filter(
          (uid) => uid !== effectiveManagerId && uid !== effectiveTeamLeadId
        );
        if (regularMemberIds.length > 0) {
          await client.query(
            `UPDATE users
             SET team_id = $1, manager_id = $2, team_lead_id = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = ANY($4::uuid[])`,
            [id, effectiveManagerId || null, effectiveTeamLeadId || null, regularMemberIds]
          );
        }
      } else if (input.managerId !== undefined || input.teamLeadId !== undefined) {
        // If leadership changed but memberIds was not passed, update existing team members' manager/lead
        if (effectiveManagerId) {
          await client.query(
            'UPDATE users SET team_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [id, effectiveManagerId]
          );
        }
        if (effectiveTeamLeadId) {
          await client.query(
            'UPDATE users SET team_id = $1, manager_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [id, effectiveManagerId || null, effectiveTeamLeadId]
          );
        }
        await client.query(
          `UPDATE users
           SET manager_id = $1, team_lead_id = $2, updated_at = CURRENT_TIMESTAMP
           WHERE team_id = $3
             AND ($1 IS NULL OR id != $1)
             AND ($2 IS NULL OR id != $2)`,
          [effectiveManagerId || null, effectiveTeamLeadId || null, id]
        );

        const currentMembersRes = await client.query<{ user_id: string }>(
          "SELECT user_id FROM team_memberships WHERE team_id = $1 AND status = 'active'",
          [id]
        );
        activeMemberIds = currentMembersRes.rows.map((r) => r.user_id);
      } else {
        const currentMembersRes = await client.query<{ user_id: string }>(
          "SELECT user_id FROM team_memberships WHERE team_id = $1 AND status = 'active'",
          [id]
        );
        activeMemberIds = currentMembersRes.rows.map((r) => r.user_id);
      }

      await AuditService.logFromRequest(actor, 'UPDATE_TEAM', 'TEAM', id, updatedTeam.name, {
        managerId: effectiveManagerId,
        teamLeadId: effectiveTeamLeadId,
        memberCount: activeMemberIds.length,
      });

      return {
        ...updatedTeam,
        member_count: activeMemberIds.length,
        member_ids: activeMemberIds,
      };
    });
  }

  /**
   * Atomically deletes a team and resets user team assignments
   */
  public static async deleteTeam(actor: AuthUser, id: string): Promise<void> {
    await withTransaction(async (client) => {
      const lockRes = await client.query<TeamDbRow>('SELECT * FROM teams WHERE id = $1 FOR UPDATE', [id]);
      if (lockRes.rows.length === 0) {
        throw AppError.notFound(`Team '${id}' not found`);
      }
      const team = lockRes.rows[0];

      // Reset team_id and reporting lines for users in this team
      await client.query(
        'UPDATE users SET team_id = NULL, manager_id = NULL, team_lead_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE team_id = $1',
        [id]
      );

      // Remove memberships
      await client.query('DELETE FROM team_memberships WHERE team_id = $1', [id]);

      // Remove team
      await client.query('DELETE FROM teams WHERE id = $1', [id]);

      await AuditService.logFromRequest(actor, 'DELETE_TEAM', 'TEAM', id, team.name);
    });
  }

  public static async addMember(
    actor: AuthUser,
    teamId: string,
    input: AddTeamMemberInput
  ): Promise<TeamMembershipDbRow> {
    return await withTransaction(async (client) => {
      const teamRes = await client.query<TeamDbRow>('SELECT * FROM teams WHERE id = $1', [teamId]);
      if (teamRes.rows.length === 0) {
        throw AppError.notFound(`Team '${teamId}' not found`);
      }
      const team = teamRes.rows[0];

      const membership = await postgresTeamRepository.addTeamMember({
        teamId,
        userId: input.userId,
        isPrimary: input.isPrimary,
        status: 'active',
        createdBy: actor.id,
      });

      // Update primary team and reporting hierarchy on users table
      if (input.isPrimary) {
        await client.query(
          'UPDATE users SET team_id = $1, manager_id = $2, team_lead_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
          [teamId, team.manager_id || null, team.team_lead_id || null, input.userId]
        );
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
    });
  }

  public static async removeMember(actor: AuthUser, teamId: string, userId: string): Promise<void> {
    await withTransaction(async (client) => {
      const res = await client.query(
        'DELETE FROM team_memberships WHERE team_id = $1 AND user_id = $2 RETURNING id, is_primary',
        [teamId, userId]
      );

      if (res.rows.length === 0) {
        throw AppError.notFound('Team membership not found');
      }

      // If removed membership was primary, clear primary team on users table
      if (res.rows[0].is_primary) {
        await client.query(
          'UPDATE users SET team_id = NULL, manager_id = NULL, team_lead_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND team_id = $2',
          [userId, teamId]
        );
      }

      await AuditService.logFromRequest(actor, 'REMOVE_TEAM_MEMBER', 'TEAM_MEMBERSHIP', teamId, undefined, {
        removedUserId: userId,
      });
    });
  }
}
