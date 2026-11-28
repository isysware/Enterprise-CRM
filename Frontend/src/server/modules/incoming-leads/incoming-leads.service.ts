import { query, withTransaction } from '../../database/connection';
import { AuthUser } from '../../types';
import { AuditService } from '../../services/audit.service';
import { AppError } from '../../utils/AppError';
import { CreateIncomingLeadInput, AssignIncomingLeadInput } from './incoming-leads.validator';

export interface IncomingLeadDbRow {
  id: string;
  source: string;
  external_id: string;
  contact_data: Record<string, unknown>;
  campaign_data: Record<string, unknown>;
  interested_service: string | null;
  status: string;
  assigned_user_id: string | null;
  assigned_user_name?: string | null;
  converted_lead_id: string | null;
  received_at: Date;
  created_at: Date;
  updated_at: Date;
}

export class IncomingLeadsService {
  public static async listIncomingLeads(status?: string): Promise<IncomingLeadDbRow[]> {
    let sql = `
      SELECT il.*, u.name as assigned_user_name
      FROM incoming_leads il
      LEFT JOIN users u ON il.assigned_user_id = u.id
    `;
    const params: unknown[] = [];
    if (status) {
      sql += ' WHERE il.status = $1';
      params.push(status);
    }
    sql += ' ORDER BY il.received_at DESC';

    const res = await query<IncomingLeadDbRow>(sql, params);
    return res.rows;
  }

  public static async getIncomingLeadById(id: string): Promise<IncomingLeadDbRow> {
    const sql = `
      SELECT il.*, u.name as assigned_user_name
      FROM incoming_leads il
      LEFT JOIN users u ON il.assigned_user_id = u.id
      WHERE il.id = $1
    `;
    const res = await query<IncomingLeadDbRow>(sql, [id]);
    if (res.rows.length === 0) {
      throw AppError.notFound(`Incoming lead '${id}' not found`);
    }
    return res.rows[0];
  }

  /**
   * Ingest new incoming lead with PostgreSQL deduplication (source, external_id)
   */
  public static async ingestLead(input: CreateIncomingLeadInput): Promise<IncomingLeadDbRow> {
    const existing = await query(
      'SELECT id FROM incoming_leads WHERE source = $1 AND external_id = $2',
      [input.source, input.externalId]
    );

    if (existing.rows.length > 0) {
      throw AppError.conflict(
        `Incoming lead already exists for source '${input.source}' with external ID '${input.externalId}'`
      );
    }

    const sql = `
      INSERT INTO incoming_leads (
        source, external_id, contact_data, campaign_data, interested_service, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const res = await query<IncomingLeadDbRow>(sql, [
      input.source,
      input.externalId,
      JSON.stringify(input.contactData || {}),
      JSON.stringify(input.campaignData || {}),
      input.interestedService || null,
      input.status || 'Pending',
    ]);

    return res.rows[0];
  }

  /**
   * Convert incoming lead into a full CRM lead inside an atomic transaction
   */
  public static async assignAndConvertToLead(
    actor: AuthUser,
    incomingLeadId: string,
    input: AssignIncomingLeadInput
  ): Promise<{ incomingLead: IncomingLeadDbRow; leadId: string }> {
    const incoming = await this.getIncomingLeadById(incomingLeadId);

    if (incoming.status === 'Converted') {
      throw AppError.badRequest('This incoming lead has already been converted into a CRM lead');
    }

    return await withTransaction(async (client) => {
      // 1. Create the lead in CRM
      const leadSql = `
        INSERT INTO leads (
          name, phone, email, city, value_pkr, status,
          source, assigned_to_id, team_id, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, 'New', $6, $7, $8, $9, $10)
        RETURNING *
      `;
      const leadRes = await client.query(leadSql, [
        input.leadName.trim(),
        input.phone.trim(),
        input.email?.trim() || null,
        input.city?.trim() || null,
        input.valuePKR || 0,
        incoming.source,
        input.assignedUserId,
        input.teamId || null,
        input.notes || `Converted from incoming ${incoming.source} lead (${incoming.external_id})`,
        actor.id,
      ]);
      const createdLead = leadRes.rows[0];

      // 2. Update incoming lead status and converted reference
      const updateIncomingSql = `
        UPDATE incoming_leads
        SET status = 'Converted',
            assigned_user_id = $1,
            converted_lead_id = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
      const incRes = await client.query<IncomingLeadDbRow>(updateIncomingSql, [
        input.assignedUserId,
        createdLead.id,
        incomingLeadId,
      ]);

      // 3. Record initial activity in lead_activities
      await client.query(
        `INSERT INTO lead_activities (lead_id, type, title, notes, actor_id)
         VALUES ($1, 'Status Change', 'Converted from Incoming Lead', $2, $3)`,
        [
          createdLead.id,
          `Ingested from ${incoming.source} (External ID: ${incoming.external_id}) and assigned to rep`,
          actor.id,
        ]
      );

      // 4. Audit action
      await AuditService.logFromRequest(
        actor,
        'CONVERT_INCOMING_LEAD',
        'INCOMING_LEAD',
        incomingLeadId,
        createdLead.name,
        {
          convertedLeadId: createdLead.id,
          assignedUserId: input.assignedUserId,
          source: incoming.source,
        },
        client
      );

      return {
        incomingLead: incRes.rows[0],
        leadId: createdLead.id,
      };
    });
  }
}
