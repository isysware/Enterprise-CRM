import { query } from '../../database/connection';
import { AuthUser } from '../../types';
import { AuditService } from '../../services/audit.service';
import { AppError } from '../../utils/AppError';
import { CreateLeadSourceInput, UpdateLeadSourceInput } from './lead-sources.validator';

export interface LeadSourceDbRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class LeadSourcesService {
  public static async listSources(activeOnly = false): Promise<LeadSourceDbRow[]> {
    let sql = 'SELECT * FROM lead_sources';
    if (activeOnly) {
      sql += ' WHERE is_active = true';
    }
    sql += ' ORDER BY name ASC';
    const res = await query<LeadSourceDbRow>(sql);
    return res.rows;
  }

  public static async getSourceById(id: string): Promise<LeadSourceDbRow> {
    const res = await query<LeadSourceDbRow>('SELECT * FROM lead_sources WHERE id = $1', [id]);
    if (res.rows.length === 0) {
      throw AppError.notFound(`Lead source '${id}' not found`);
    }
    return res.rows[0];
  }

  public static async createSource(actor: AuthUser, input: CreateLeadSourceInput): Promise<LeadSourceDbRow> {
    const existing = await query('SELECT id FROM lead_sources WHERE LOWER(name) = LOWER($1)', [
      input.name.trim(),
    ]);
    if (existing.rows.length > 0) {
      throw AppError.conflict(`Lead source '${input.name}' already exists`);
    }

    const sql = `
      INSERT INTO lead_sources (name, description, is_active)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const res = await query<LeadSourceDbRow>(sql, [
      input.name.trim(),
      input.description || null,
      input.isActive ?? true,
    ]);

    await AuditService.logFromRequest(actor, 'CREATE_LEAD_SOURCE', 'LEAD_SOURCE', res.rows[0].id, res.rows[0].name);
    return res.rows[0];
  }

  public static async updateSource(
    actor: AuthUser,
    id: string,
    input: UpdateLeadSourceInput
  ): Promise<LeadSourceDbRow> {
    const existing = await this.getSourceById(id);

    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${idx++}`);
      params.push(input.name.trim());
    }
    if (input.description !== undefined) {
      fields.push(`description = $${idx++}`);
      params.push(input.description);
    }
    if (input.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      params.push(input.isActive);
    }

    if (fields.length === 0) return existing;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const updateSql = `UPDATE lead_sources SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await query<LeadSourceDbRow>(updateSql, params);

    await AuditService.logFromRequest(actor, 'UPDATE_LEAD_SOURCE', 'LEAD_SOURCE', id, res.rows[0].name);
    return res.rows[0];
  }

  public static async deleteSource(actor: AuthUser, id: string): Promise<void> {
    const existing = await this.getSourceById(id);
    await query('DELETE FROM lead_sources WHERE id = $1', [id]);
    await AuditService.logFromRequest(actor, 'DELETE_LEAD_SOURCE', 'LEAD_SOURCE', id, existing.name);
  }
}
