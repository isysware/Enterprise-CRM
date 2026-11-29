import { query } from '../database/connection';
import { AuthUser, UserRole, AccountStatus } from '../types';
import { IUserRepository, UserRecord } from './user.repository.interface';

interface UserDbRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  role_id: string;
  role_name: string;
  status: string;
  team_id: string | null;
  team_name: string | null;
  manager_id: string | null;
  manager_name?: string | null;
  team_lead_id: string | null;
  team_lead_name?: string | null;
  avatar_url: string | null;
  token_version: number;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * PostgreSQL Implementation of IUserRepository
 */
export class PostgresUserRepository implements IUserRepository {
  private mapRowToRecord(row: UserDbRow): UserRecord {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      passwordHash: row.password_hash,
      role: row.role_name as UserRole,
      status: row.status as AccountStatus,
      isActive: row.status === 'active',
      teamId: row.team_id || undefined,
      teamName: row.team_name || undefined,
      managerId: row.manager_id || undefined,
      managerName: row.manager_name || undefined,
      teamLeadId: row.team_lead_id || undefined,
      teamLeadName: row.team_lead_name || undefined,
      avatarUrl: row.avatar_url || undefined,
      tokenVersion: row.token_version,
      lastLogin: row.last_login ? row.last_login.toISOString() : undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  private mapRowToAuthUser(row: UserDbRow): AuthUser {
    const { passwordHash: _p, tokenVersion: _tv, ...safe } = this.mapRowToRecord(row);
    return safe;
  }

  public async findByEmail(email: string): Promise<UserRecord | null> {
    const sql = `
      SELECT u.*, t.name as team_name, m.name as manager_name, tl.name as team_lead_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN users m ON u.manager_id = m.id
      LEFT JOIN users tl ON u.team_lead_id = tl.id
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1
    `;
    const res = await query<UserDbRow>(sql, [email.trim()]);
    if (res.rows.length === 0) return null;
    return this.mapRowToRecord(res.rows[0]);
  }

  public async findUserWithCredentials(id: string): Promise<UserRecord | null> {
    const sql = `
      SELECT u.*, t.name as team_name, m.name as manager_name, tl.name as team_lead_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN users m ON u.manager_id = m.id
      LEFT JOIN users tl ON u.team_lead_id = tl.id
      WHERE u.id = $1
      LIMIT 1
    `;
    const res = await query<UserDbRow>(sql, [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToRecord(res.rows[0]);
  }

  public async findById(id: string): Promise<AuthUser | null> {
    const user = await this.findUserWithCredentials(id);
    if (!user) return null;
    const { passwordHash: _p, tokenVersion: _tv, ...safe } = user;
    return safe;
  }

  public async find(filter?: Record<string, unknown>): Promise<AuthUser[]> {
    let sql = `
      SELECT u.*, t.name as team_name, m.name as manager_name, tl.name as team_lead_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN users m ON u.manager_id = m.id
      LEFT JOIN users tl ON u.team_lead_id = tl.id
    `;
    const params: unknown[] = [];

    if (filter && Object.keys(filter).length > 0) {
      const conditions: string[] = [];
      let idx = 1;
      for (const [key, val] of Object.entries(filter)) {
        if (key === 'role') {
          conditions.push(`u.role_name = $${idx++}`);
          params.push(val);
        } else if (key === 'status') {
          conditions.push(`u.status = $${idx++}`);
          params.push(val);
        } else if (key === 'teamId') {
          conditions.push(`u.team_id = $${idx++}`);
          params.push(val);
        } else if (key === 'managerId') {
          conditions.push(`u.manager_id = $${idx++}`);
          params.push(val);
        }
      }
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    sql += ' ORDER BY u.created_at ASC';
    const res = await query<UserDbRow>(sql, params);
    return res.rows.map((r) => this.mapRowToAuthUser(r));
  }

  public async findAllUsers(): Promise<AuthUser[]> {
    return this.find();
  }

  public async create(
    data: Partial<AuthUser> & { passwordHash?: string }
  ): Promise<AuthUser> {
    const roleName = data.role || 'Employee';

    // Look up role_id from role name
    const roleRes = await query<{ id: string }>(
      'SELECT id FROM roles WHERE name = $1 LIMIT 1',
      [roleName]
    );

    if (roleRes.rows.length === 0) {
      throw new Error(`Role "${roleName}" not found in database`);
    }

    const roleId = roleRes.rows[0].id;
    const status = data.status || 'active';

    const insertSql = `
      INSERT INTO users (
        name, email, phone, password_hash, role_id, role_name,
        status, team_id, manager_id, team_lead_id, avatar_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const params = [
      data.name || 'User',
      data.email!.toLowerCase().trim(),
      data.phone || null,
      data.passwordHash || '',
      roleId,
      roleName,
      status,
      data.teamId || null,
      data.managerId || null,
      data.teamLeadId || null,
      data.avatarUrl || null,
    ];

    const res = await query<UserDbRow>(insertSql, params);
    return this.mapRowToAuthUser(res.rows[0]);
  }

  public async update(id: string, data: Partial<AuthUser>): Promise<AuthUser | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      params.push(data.name);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${idx++}`);
      params.push(data.email.toLowerCase().trim());
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      params.push(data.phone);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${idx++}`);
      params.push(data.status);
    }
    if (data.teamId !== undefined) {
      fields.push(`team_id = $${idx++}`);
      params.push(data.teamId || null);
    }
    if (data.managerId !== undefined) {
      fields.push(`manager_id = $${idx++}`);
      params.push(data.managerId || null);
    }
    if (data.teamLeadId !== undefined) {
      fields.push(`team_lead_id = $${idx++}`);
      params.push(data.teamLeadId || null);
    }
    if (data.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      params.push(data.avatarUrl || null);
    }

    if (data.role !== undefined) {
      const roleRes = await query<{ id: string }>(
        'SELECT id FROM roles WHERE name = $1 LIMIT 1',
        [data.role]
      );
      if (roleRes.rows.length > 0) {
        fields.push(`role_id = $${idx++}`);
        params.push(roleRes.rows[0].id);
        fields.push(`role_name = $${idx++}`);
        params.push(data.role);
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const updateSql = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;

    const res = await query<UserDbRow>(updateSql, params);
    if (res.rows.length === 0) return null;
    return this.mapRowToAuthUser(res.rows[0]);
  }

  public async delete(id: string): Promise<boolean> {
    const res = await query('DELETE FROM users WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  public async updateLastLogin(id: string): Promise<void> {
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }

  public async updatePassword(id: string, newPasswordHash: string): Promise<void> {
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, id]
    );
  }

  public async incrementTokenVersion(id: string): Promise<void> {
    await query(
      'UPDATE users SET token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }
}

export const postgresUserRepository = new PostgresUserRepository();
