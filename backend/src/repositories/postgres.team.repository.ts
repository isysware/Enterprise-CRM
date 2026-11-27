import { query, withTransaction } from '../database/connection';
import { AppError } from '../utils/AppError';

export interface TeamDbRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  manager_id: string | null;
  team_lead_id: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: Date;
  updated_at: Date;
}

export interface TeamMembershipDbRow {
  id: string;
  team_id: string;
  user_id: string;
  is_primary: boolean;
  joined_at: Date;
  left_at: Date | null;
  status: 'active' | 'inactive';
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export class PostgresTeamRepository {
  public async createTeam(data: {
    name: string;
    code: string;
    description?: string;
    managerId?: string;
    teamLeadId?: string;
  }): Promise<TeamDbRow> {
    const sql = `
      INSERT INTO teams (name, code, description, manager_id, team_lead_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const res = await query<TeamDbRow>(sql, [
      data.name,
      data.code,
      data.description || null,
      data.managerId || null,
      data.teamLeadId || null,
    ]);
    return res.rows[0];
  }

  public async findTeamById(id: string): Promise<TeamDbRow | null> {
    const res = await query<TeamDbRow>('SELECT * FROM teams WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  public async addTeamMember(data: {
    teamId: string;
    userId: string;
    isPrimary?: boolean;
    status?: 'active' | 'inactive';
    createdBy?: string;
  }): Promise<TeamMembershipDbRow> {
    const isPrimary = data.isPrimary ?? false;
    const status = data.status ?? 'active';
    const isUuid = (str?: string | null): boolean =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
    const validCreatedBy = isUuid(data.createdBy) ? data.createdBy : null;

    const sql = `
      INSERT INTO team_memberships (team_id, user_id, is_primary, status, created_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (team_id, user_id) DO UPDATE
      SET is_primary = EXCLUDED.is_primary,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    try {
      const res = await query<TeamMembershipDbRow>(sql, [
        data.teamId,
        data.userId,
        isPrimary,
        status,
        validCreatedBy,
      ]);
      return res.rows[0];
    } catch (err: unknown) {
      // Catch unique index violation (idx_user_active_primary_team)
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
        throw AppError.badRequest(
          'User already has an active primary team membership. Only one active primary membership is permitted.'
        );
      }
      throw err;
    }
  }

  public async getUserMemberships(userId: string): Promise<TeamMembershipDbRow[]> {
    const res = await query<TeamMembershipDbRow>(
      'SELECT * FROM team_memberships WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC',
      [userId]
    );
    return res.rows;
  }
}

export const postgresTeamRepository = new PostgresTeamRepository();
