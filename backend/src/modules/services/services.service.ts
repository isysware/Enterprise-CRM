import { query } from '../../database/connection';
import { AuthUser } from '../../types';
import { AuditService } from '../../services/audit.service';
import { AppError } from '../../utils/AppError';
import { CreateServiceInput, UpdateServiceInput } from './services.validator';

export interface ServiceDbRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  default_price_pkr: string; // returned as string from numeric column
  pricing_model_id: string | null;
  pricing_model_name?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class ServicesService {
  public static async listServices(activeOnly = false): Promise<ServiceDbRow[]> {
    let sql = `
      SELECT s.*, pm.name as pricing_model_name
      FROM services s
      LEFT JOIN pricing_models pm ON s.pricing_model_id = pm.id
    `;
    if (activeOnly) {
      sql += ' WHERE s.is_active = true';
    }
    sql += ' ORDER BY s.name ASC';

    const res = await query<ServiceDbRow>(sql);
    return res.rows;
  }

  public static async getServiceById(id: string): Promise<ServiceDbRow> {
    const sql = `
      SELECT s.*, pm.name as pricing_model_name
      FROM services s
      LEFT JOIN pricing_models pm ON s.pricing_model_id = pm.id
      WHERE s.id = $1
    `;
    const res = await query<ServiceDbRow>(sql, [id]);
    if (res.rows.length === 0) {
      throw AppError.notFound(`Service '${id}' not found`);
    }
    return res.rows[0];
  }

  public static async createService(actor: AuthUser, input: CreateServiceInput): Promise<ServiceDbRow> {
    const existing = await query('SELECT id FROM services WHERE LOWER(name) = LOWER($1)', [
      input.name.trim(),
    ]);
    if (existing.rows.length > 0) {
      throw AppError.conflict(`Service with name '${input.name}' already exists`);
    }

    const sql = `
      INSERT INTO services (name, category, description, default_price_pkr, pricing_model_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const res = await query<ServiceDbRow>(sql, [
      input.name.trim(),
      input.category.trim(),
      input.description || null,
      input.defaultPricePKR,
      input.pricingModelId || null,
      input.isActive ?? true,
    ]);

    await AuditService.logFromRequest(actor, 'CREATE_SERVICE', 'SERVICE', res.rows[0].id, res.rows[0].name);
    return res.rows[0];
  }

  public static async updateService(
    actor: AuthUser,
    id: string,
    input: UpdateServiceInput
  ): Promise<ServiceDbRow> {
    const existing = await this.getServiceById(id);

    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${idx++}`);
      params.push(input.name.trim());
    }
    if (input.category !== undefined) {
      fields.push(`category = $${idx++}`);
      params.push(input.category.trim());
    }
    if (input.description !== undefined) {
      fields.push(`description = $${idx++}`);
      params.push(input.description);
    }
    if (input.defaultPricePKR !== undefined) {
      fields.push(`default_price_pkr = $${idx++}`);
      params.push(input.defaultPricePKR);
    }
    if (input.pricingModelId !== undefined) {
      fields.push(`pricing_model_id = $${idx++}`);
      params.push(input.pricingModelId);
    }
    if (input.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      params.push(input.isActive);
    }

    if (fields.length === 0) return existing;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const updateSql = `UPDATE services SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await query<ServiceDbRow>(updateSql, params);

    await AuditService.logFromRequest(actor, 'UPDATE_SERVICE', 'SERVICE', id, res.rows[0].name);
    return res.rows[0];
  }

  public static async deleteService(actor: AuthUser, id: string): Promise<void> {
    const existing = await this.getServiceById(id);
    await query('DELETE FROM services WHERE id = $1', [id]);
    await AuditService.logFromRequest(actor, 'DELETE_SERVICE', 'SERVICE', id, existing.name);
  }
}
