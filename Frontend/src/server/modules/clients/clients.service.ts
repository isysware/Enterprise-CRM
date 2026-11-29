import { query, withTransaction } from '../../database/connection';
import { AuthUser, HierarchyScope } from '../../types';
import { AuditService } from '../../services/audit.service';
import { AppError } from '../../utils/AppError';
import {
  ConvertLeadToClientInput,
  UpdateClientInput,
  RevertClientInput,
  ListClientsQuery,
} from './clients.validator';

export interface ClientDbRow {
  id: string;
  originating_lead_id: string | null;
  business_name: string;
  contact_name: string;
  email: string | null;
  phone: string;
  city: string | null;
  services_snapshot: unknown[];
  source: string | null;
  pricing_model_id: string | null;
  pricing_model_name?: string | null;
  final_value_pkr: string;
  assigned_owner_id: string | null;
  assigned_owner_name?: string | null;
  closed_by_id: string | null;
  closed_by_name?: string | null;
  terms_details: string | null;
  converted_date: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const toUuidOrNull = (val?: string | null): string | null => {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed) ? trimmed : null;
};

export class ClientsService {
  public static async listClients(
    actor: AuthUser,
    scope: HierarchyScope,
    queryInput: ListClientsQuery
  ): Promise<{ items: ClientDbRow[]; total: number; page: number; limit: number; totalPages: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    // Scope check
    if (actor.role !== 'Super Admin' && actor.role !== 'Admin') {
      if (actor.role === 'Manager' || actor.role === 'Team Lead') {
        const allowedUsers = [actor.id, ...(scope.subordinateUserIds || [])];
        conditions.push(`c.assigned_owner_id = ANY($${idx++})`);
        params.push(allowedUsers);
      } else {
        conditions.push(`c.assigned_owner_id = $${idx++}`);
        params.push(actor.id);
      }
    }

    if (queryInput.status) {
      conditions.push(`c.status = $${idx++}`);
      params.push(queryInput.status);
    }
    if (queryInput.assignedOwnerId) {
      conditions.push(`c.assigned_owner_id = $${idx++}`);
      params.push(queryInput.assignedOwnerId);
    }
    if (queryInput.search) {
      conditions.push(
        `(c.business_name ILIKE $${idx} OR c.contact_name ILIKE $${idx} OR c.email ILIKE $${idx} OR c.phone ILIKE $${idx} OR c.city ILIKE $${idx})`
      );
      params.push(`%${queryInput.search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(c.id)::int as total FROM clients c ${whereClause}`;
    const countRes = await query<{ total: number }>(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    const page = queryInput.page;
    const limit = queryInput.limit;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT c.*,
             to_char(c.converted_date, 'YYYY-MM-DD') as converted_date,
             u.name as assigned_owner_name,
             cb.name as closed_by_name,
             pm.name as pricing_model_name
      FROM clients c
      LEFT JOIN users u ON c.assigned_owner_id = u.id
      LEFT JOIN users cb ON c.closed_by_id = cb.id
      LEFT JOIN pricing_models pm ON c.pricing_model_id = pm.id
      ${whereClause}
      ORDER BY c.converted_date DESC, c.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    params.push(limit, offset);
    const res = await query<ClientDbRow>(sql, params);

    return {
      items: res.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public static async getClientById(
    actor: AuthUser,
    scope: HierarchyScope,
    id: string
  ): Promise<ClientDbRow> {
    const sql = `
      SELECT c.*,
             to_char(c.converted_date, 'YYYY-MM-DD') as converted_date,
             u.name as assigned_owner_name,
             cb.name as closed_by_name,
             pm.name as pricing_model_name
      FROM clients c
      LEFT JOIN users u ON c.assigned_owner_id = u.id
      LEFT JOIN users cb ON c.closed_by_id = cb.id
      LEFT JOIN pricing_models pm ON c.pricing_model_id = pm.id
      WHERE c.id = $1
    `;
    const res = await query<ClientDbRow>(sql, [id]);
    if (res.rows.length === 0) {
      throw AppError.notFound(`Client '${id}' not found`);
    }

    const client = res.rows[0];
    this.verifyClientScope(actor, scope, client);
    return client;
  }

  public static verifyClientScope(actor: AuthUser, scope: HierarchyScope, client: ClientDbRow): void {
    if (actor.role === 'Super Admin' || actor.role === 'Admin') return;
    if (actor.role === 'Manager' || actor.role === 'Team Lead') {
      const allowedUsers = new Set([actor.id, ...(scope.subordinateUserIds || [])]);
      if (client.assigned_owner_id && allowedUsers.has(client.assigned_owner_id)) return;
      throw AppError.forbidden('Forbidden: Client is outside your authorized organizational scope');
    }
    if (client.assigned_owner_id !== actor.id) {
      throw AppError.forbidden('Forbidden: You can only access clients assigned to you');
    }
  }

  /**
   * Lead -> Client conversion workflow within an atomic transaction
   */
  public static async convertLeadToClient(
    actor: AuthUser,
    input: ConvertLeadToClientInput
  ): Promise<ClientDbRow> {
    return await withTransaction(async (client) => {
      // 1. Fetch and lock lead
      const leadRes = await client.query('SELECT * FROM leads WHERE id = $1 FOR UPDATE', [
        input.leadId,
      ]);
      if (leadRes.rows.length === 0) {
        throw AppError.notFound(`Lead '${input.leadId}' not found`);
      }
      const lead = leadRes.rows[0];

      if (lead.status === 'Converted') {
        throw AppError.badRequest('This lead has already been converted into a client');
      }

      // 2. Mark lead status as Converted
      await client.query(
        "UPDATE leads SET status = 'Converted', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [input.leadId]
      );

      // 3. Create client record
      const ownerId = toUuidOrNull(input.assignedOwnerId) || toUuidOrNull(lead.assigned_to_id) || actor.id;
      const effectiveSource = (input.source && input.source.trim() && input.source !== 'CSV Import')
        ? input.source.trim()
        : (lead.source || 'Direct');
      const pricingModelId = toUuidOrNull(input.pricingModelId) || toUuidOrNull((input as any).pricing_model_id) || toUuidOrNull(lead.pricing_model_id) || null;

      const clientSql = `
        INSERT INTO clients (
          originating_lead_id, business_name, contact_name, email,
          phone, city, services_snapshot, source, pricing_model_id,
          final_value_pkr, assigned_owner_id, closed_by_id, terms_details,
          converted_date, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_DATE, 'Active'
        ) RETURNING id
      `;

      const insertRes = await client.query<{ id: string }>(clientSql, [
        input.leadId,
        input.businessName.trim(),
        input.contactName.trim(),
        input.email?.trim() || null,
        input.phone.trim(),
        input.city?.trim() || null,
        JSON.stringify(input.servicesSnapshot || lead.service_snapshot || []),
        effectiveSource,
        pricingModelId,
        input.finalValuePKR || lead.value_pkr || 0,
        ownerId,
        actor.id,
        input.termsDetails || null,
      ]);
      const newClientId = insertRes.rows[0].id;

      const fullClientSql = `
        SELECT c.*,
               to_char(c.converted_date, 'YYYY-MM-DD') as converted_date,
               u.name as assigned_owner_name,
               cb.name as closed_by_name,
               pm.name as pricing_model_name
        FROM clients c
        LEFT JOIN users u ON c.assigned_owner_id = u.id
        LEFT JOIN users cb ON c.closed_by_id = cb.id
        LEFT JOIN pricing_models pm ON c.pricing_model_id = pm.id
        WHERE c.id = $1
      `;
      const fullRes = await client.query<ClientDbRow>(fullClientSql, [newClientId]);
      const createdClient = fullRes.rows[0];

      // 4. Record conversion activity in lead_activities
      await client.query(
        `INSERT INTO lead_activities (lead_id, type, title, notes, actor_id)
         VALUES ($1, 'Status Change', 'Converted to Client', $2, $3)`,
        [
          input.leadId,
          `Successfully converted to client account (${createdClient.business_name}) with final value of PKR ${createdClient.final_value_pkr}`,
          actor.id,
        ]
      );

      // 5. Audit action
      await AuditService.logFromRequest(
        actor,
        'CONVERT_LEAD_TO_CLIENT',
        'CLIENT',
        createdClient.id,
        createdClient.business_name,
        { leadId: input.leadId, finalValuePKR: createdClient.final_value_pkr },
        client
      );

      return createdClient;
    });
  }

  /**
   * Controlled Return/Reversal of Client back to Lead
   */
  public static async revertClient(
    actor: AuthUser,
    scope: HierarchyScope,
    clientId: string,
    input: RevertClientInput
  ): Promise<{ client: ClientDbRow; revertedLeadId: string | null }> {
    const existing = await this.getClientById(actor, scope, clientId);

    if (!existing.originating_lead_id) {
      throw AppError.badRequest('Client does not have an originating lead reference to revert to');
    }

    return await withTransaction(async (client) => {
      // 1. Update client status to Inactive/Suspended
      const updateClientSql = `
        UPDATE clients
        SET status = 'Inactive',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *, to_char(converted_date, 'YYYY-MM-DD') as converted_date
      `;
      const clientRes = await client.query<ClientDbRow>(updateClientSql, [clientId]);

      // 2. Revert originating lead status
      await client.query(
        'UPDATE leads SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [input.revertLeadStatusTo, existing.originating_lead_id]
      );

      // 3. Log activity on lead
      await client.query(
        `INSERT INTO lead_activities (lead_id, type, title, notes, actor_id)
         VALUES ($1, 'Status Change', 'Client Account Reverted', $2, $3)`,
        [
          existing.originating_lead_id,
          `Client account (${existing.business_name}) was reversed back to lead stage '${input.revertLeadStatusTo}'. Reason: ${input.reason}`,
          actor.id,
        ]
      );

      // 4. Audit
      await AuditService.logFromRequest(
        actor,
        'REVERT_CLIENT_TO_LEAD',
        'CLIENT',
        clientId,
        existing.business_name,
        { leadId: existing.originating_lead_id, reason: input.reason },
        client
      );

      return {
        client: clientRes.rows[0],
        revertedLeadId: existing.originating_lead_id,
      };
    });
  }

  public static async updateClient(
    actor: AuthUser,
    scope: HierarchyScope,
    id: string,
    input: UpdateClientInput
  ): Promise<ClientDbRow> {
    const existing = await this.getClientById(actor, scope, id);

    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (input.businessName !== undefined) {
      fields.push(`business_name = $${idx++}`);
      params.push(input.businessName.trim());
    }
    if (input.contactName !== undefined) {
      fields.push(`contact_name = $${idx++}`);
      params.push(input.contactName.trim());
    }
    if (input.email !== undefined) {
      fields.push(`email = $${idx++}`);
      params.push(input.email ? input.email.trim() : null);
    }
    if (input.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      params.push(input.phone.trim());
    }
    if (input.city !== undefined) {
      fields.push(`city = $${idx++}`);
      params.push(input.city ? input.city.trim() : null);
    }
    if (input.finalValuePKR !== undefined) {
      fields.push(`final_value_pkr = $${idx++}`);
      params.push(input.finalValuePKR);
    }
    if (input.assignedOwnerId !== undefined) {
      fields.push(`assigned_owner_id = $${idx++}`);
      params.push(input.assignedOwnerId);
    }
    if (input.status !== undefined) {
      fields.push(`status = $${idx++}`);
      params.push(input.status);
    }
    if (input.termsDetails !== undefined) {
      fields.push(`terms_details = $${idx++}`);
      params.push(input.termsDetails);
    }

    if (fields.length === 0) return existing;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const sql = `
      UPDATE clients
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *, to_char(converted_date, 'YYYY-MM-DD') as converted_date
    `;
    const res = await query<ClientDbRow>(sql, params);

    await AuditService.logFromRequest(actor, 'UPDATE_CLIENT', 'CLIENT', id, res.rows[0].business_name);
    return res.rows[0];
  }
}
