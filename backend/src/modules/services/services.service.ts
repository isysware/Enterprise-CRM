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
  default_price_pkr: string | number;
  defaultPricePKR?: number;
  pricing_model_id: string | null;
  pricing_model_name?: string | null;
  pricingModelId?: string | null;
  pricingModelName?: string | null;
  is_active: boolean;
  isActive?: boolean;
  created_at: Date;
  updated_at: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ServicesService {
  private static mapRow(row: any): ServiceDbRow {
    if (!row) return row;
    const priceNum = parseFloat(row.default_price_pkr) || 0;
    return {
      ...row,
      defaultPricePKR: priceNum,
      default_price_pkr: priceNum,
      pricingModelId: row.pricing_model_id || null,
      pricing_model_id: row.pricing_model_id || null,
      pricingModelName: row.pricing_model_name || null,
      pricing_model_name: row.pricing_model_name || null,
      isActive: row.is_active !== false,
      is_active: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

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

    const res = await query<any>(sql);
    return res.rows.map(this.mapRow);
  }

  public static async getServiceById(id: string): Promise<ServiceDbRow> {
    const sql = `
      SELECT s.*, pm.name as pricing_model_name
      FROM services s
      LEFT JOIN pricing_models pm ON s.pricing_model_id = pm.id
      WHERE s.id = $1
    `;
    const res = await query<any>(sql, [id]);
    if (res.rows.length === 0) {
      throw AppError.notFound(`Service '${id}' not found`);
    }
    return this.mapRow(res.rows[0]);
  }

  public static async createService(actor: AuthUser, input: CreateServiceInput): Promise<ServiceDbRow> {
    const existing = await query('SELECT id FROM services WHERE LOWER(name) = LOWER($1)', [
      input.name.trim(),
    ]);
    if (existing.rows.length > 0) {
      throw AppError.conflict(`Service with name '${input.name}' already exists`);
    }

    const pmId = input.pricingModelId !== undefined 
      ? input.pricingModelId 
      : ((input as any).pricing_model_id !== undefined ? (input as any).pricing_model_id : null);

    const sql = `
      INSERT INTO services (name, category, description, default_price_pkr, pricing_model_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name
    `;
    const res = await query<any>(sql, [
      input.name.trim(),
      input.category.trim(),
      input.description || null,
      input.defaultPricePKR,
      pmId || null,
      input.isActive ?? true,
    ]);

    await AuditService.logFromRequest(actor, 'CREATE_SERVICE', 'SERVICE', res.rows[0].id, res.rows[0].name);
    return this.getServiceById(res.rows[0].id);
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
    const pmId = input.pricingModelId !== undefined 
      ? input.pricingModelId 
      : ((input as any).pricing_model_id !== undefined ? (input as any).pricing_model_id : undefined);

    if (pmId !== undefined) {
      fields.push(`pricing_model_id = $${idx++}`);
      params.push(pmId || null);
    }
    if (input.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      params.push(input.isActive);
    }

    if (fields.length === 0) return existing;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const updateSql = `UPDATE services SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name`;
    const res = await query<any>(updateSql, params);

    await AuditService.logFromRequest(actor, 'UPDATE_SERVICE', 'SERVICE', id, res.rows[0]?.name || existing.name);
    return this.getServiceById(id);
  }

  public static async deleteService(actor: AuthUser, id: string): Promise<void> {
    const existing = await this.getServiceById(id);
    await query('DELETE FROM services WHERE id = $1', [id]);
    await AuditService.logFromRequest(actor, 'DELETE_SERVICE', 'SERVICE', id, existing.name);
  }
}
