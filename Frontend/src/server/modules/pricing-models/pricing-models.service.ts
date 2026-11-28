import { query } from '../../database/connection';
import { AuthUser } from '../../types';
import { AuditService } from '../../services/audit.service';
import { AppError } from '../../utils/AppError';
import { CreatePricingModelInput, UpdatePricingModelInput } from './pricing-models.validator';

export interface PricingModelDbRow {
  id: string;
  name: string;
  billing_type: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  default_values: Record<string, unknown>;
  field_schema: unknown[];
  created_at: Date;
  updated_at: Date;
}

export class PricingModelsService {
  public static mapRow(row: PricingModelDbRow): any {
    const defaultValues = typeof row.default_values === 'string'
      ? JSON.parse(row.default_values)
      : (row.default_values || {});
    const fieldSchema = typeof row.field_schema === 'string'
      ? JSON.parse(row.field_schema)
      : (row.field_schema || []);

    return {
      id: row.id,
      name: row.name,
      billingType: row.billing_type,
      description: row.description,
      isActive: row.is_active,
      isDefault: row.is_default,
      defaultValues,
      fieldSchema,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      billing_type: row.billing_type,
      is_active: row.is_active,
      is_default: row.is_default,
      default_values: defaultValues,
      field_schema: fieldSchema,
    };
  }

  public static async listPricingModels(): Promise<any[]> {
    const res = await query<PricingModelDbRow>(
      'SELECT * FROM pricing_models ORDER BY is_default DESC, name ASC'
    );
    return res.rows.map((r) => this.mapRow(r));
  }

  public static async getPricingModelById(id: string): Promise<any> {
    const res = await query<PricingModelDbRow>('SELECT * FROM pricing_models WHERE id = $1', [id]);
    if (res.rows.length === 0) {
      throw AppError.notFound(`Pricing model '${id}' not found`);
    }
    return this.mapRow(res.rows[0]);
  }

  public static async createPricingModel(
    actor: AuthUser,
    input: CreatePricingModelInput
  ): Promise<any> {
    const existing = await query('SELECT id FROM pricing_models WHERE LOWER(name) = LOWER($1)', [
      input.name.trim(),
    ]);
    if (existing.rows.length > 0) {
      throw AppError.conflict(`Pricing model '${input.name}' already exists`);
    }

    if (input.isDefault) {
      // Unset previous default
      await query('UPDATE pricing_models SET is_default = false WHERE is_default = true');
    }

    const sql = `
      INSERT INTO pricing_models (
        name, billing_type, description, is_active, is_default, default_values, field_schema
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const res = await query<PricingModelDbRow>(sql, [
      input.name.trim(),
      input.billingType.trim(),
      input.description || null,
      input.isActive ?? true,
      input.isDefault ?? false,
      JSON.stringify(input.defaultValues || {}),
      JSON.stringify(input.fieldSchema || []),
    ]);

    await AuditService.logFromRequest(
      actor,
      'CREATE_PRICING_MODEL',
      'PRICING_MODEL',
      res.rows[0].id,
      res.rows[0].name
    );

    return this.mapRow(res.rows[0]);
  }

  public static async updatePricingModel(
    actor: AuthUser,
    id: string,
    input: UpdatePricingModelInput
  ): Promise<any> {
    const existing = await this.getPricingModelById(id);

    if (input.isDefault) {
      await query('UPDATE pricing_models SET is_default = false WHERE id != $1', [id]);
    }

    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${idx++}`);
      params.push(input.name.trim());
    }
    if (input.billingType !== undefined) {
      fields.push(`billing_type = $${idx++}`);
      params.push(input.billingType.trim());
    }
    if (input.description !== undefined) {
      fields.push(`description = $${idx++}`);
      params.push(input.description);
    }
    if (input.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      params.push(input.isActive);
    }
    if (input.isDefault !== undefined) {
      fields.push(`is_default = $${idx++}`);
      params.push(input.isDefault);
    }
    if (input.defaultValues !== undefined) {
      fields.push(`default_values = $${idx++}`);
      params.push(JSON.stringify(input.defaultValues));
    }
    if (input.fieldSchema !== undefined) {
      fields.push(`field_schema = $${idx++}`);
      params.push(JSON.stringify(input.fieldSchema));
    }

    if (fields.length === 0) return existing;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const updateSql = `UPDATE pricing_models SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await query<PricingModelDbRow>(updateSql, params);

    await AuditService.logFromRequest(
      actor,
      'UPDATE_PRICING_MODEL',
      'PRICING_MODEL',
      id,
      res.rows[0].name
    );

    return this.mapRow(res.rows[0]);
  }

  public static async deletePricingModel(actor: AuthUser, id: string): Promise<void> {
    const existing = await this.getPricingModelById(id);
    await query('DELETE FROM pricing_models WHERE id = $1', [id]);
    await AuditService.logFromRequest(actor, 'DELETE_PRICING_MODEL', 'PRICING_MODEL', id, existing.name);
  }
}
