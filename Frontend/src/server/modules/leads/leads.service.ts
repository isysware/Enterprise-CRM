import { query, withTransaction } from '../../database/connection';
import { AuthUser, HierarchyScope } from '../../types';
import { AuditService } from '../../services/audit.service';
import { AppError } from '../../utils/AppError';
import {
  CreateLeadInput,
  UpdateLeadInput,
  ChangeLeadStatusInput,
  ReassignLeadInput,
  AddLeadActivityInput,
  ListLeadsQuery,
} from './leads.validator';

export interface LeadDbRow {
  id: string;
  name: string;
  business_name: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  service_ids: string[];
  service_snapshot: unknown[];
  value_pkr: string;
  status: string;
  quality: string;
  priority: string;
  source: string;
  source_id: string | null;
  assigned_to_id: string | null;
  assigned_to_name?: string | null;
  team_id: string | null;
  team_name?: string | null;
  pricing_model_id: string | null;
  pricing_model_name?: string | null;
  budget_details: Record<string, unknown>;
  notes: string | null;
  tags: string[];
  next_follow_up_date: string | null;
  next_follow_up_time: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const toUuidOrNull = (id?: string | null): string | null =>
  id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;

// PostgreSQL TIME may include seconds while HTML time inputs use HH:mm.
const comparableTime = (value?: string | null): string | null => {
  if (!value) return null;
  return /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value.replace(/\.0+$/, '');
};

export class LeadsService {
  private static buildScopeCondition(
    actor: AuthUser,
    scope: HierarchyScope,
    paramOffset: number
  ): { clause: string; params: unknown[] } {
    if (actor.role === 'Super Admin' || actor.role === 'Admin') {
      return { clause: '', params: [] };
    }
    if (actor.role === 'Manager' || actor.role === 'Team Lead') {
      const allowedUsers = [actor.id, ...(scope.subordinateUserIds || [])];
      const allowedTeams = scope.managedTeamIds || [];
      return {
        clause: `(l.assigned_to_id = ANY($${paramOffset}) OR (l.team_id IS NOT NULL AND l.team_id = ANY($${paramOffset + 1})))`,
        params: [allowedUsers, allowedTeams],
      };
    }
    return { clause: `l.assigned_to_id = $${paramOffset}`, params: [actor.id] };
  }

  public static async listLeads(
    actor: AuthUser,
    scope: HierarchyScope,
    queryInput: ListLeadsQuery
  ): Promise<{ items: LeadDbRow[]; total: number; page: number; limit: number; totalPages: number }> {
    const whereConditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    const scopeCond = this.buildScopeCondition(actor, scope, idx);
    if (scopeCond.clause) {
      whereConditions.push(scopeCond.clause);
      params.push(...scopeCond.params);
      idx += scopeCond.params.length;
    }
    if (queryInput.status) {
      whereConditions.push(`l.status = $${idx++}`);
      params.push(queryInput.status);
    }
    if (queryInput.assignedToId) {
      whereConditions.push(`l.assigned_to_id = $${idx++}`);
      params.push(queryInput.assignedToId);
    }
    if (queryInput.source) {
      whereConditions.push(`l.source_id = $${idx++}`);
      params.push(queryInput.source);
    }
    if (queryInput.priority) {
      whereConditions.push(`l.priority = $${idx++}`);
      params.push(queryInput.priority);
    }
    if (queryInput.search) {
      whereConditions.push(`(l.name ILIKE $${idx} OR l.business_name ILIKE $${idx} OR l.phone ILIKE $${idx} OR l.email ILIKE $${idx})`);
      params.push(`%${queryInput.search}%`);
      idx++;
    }
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const countRes = await query<{ total: number }>(`
      SELECT COUNT(*) as total FROM leads l
      LEFT JOIN users u ON l.assigned_to_id = u.id
      LEFT JOIN teams t ON l.team_id = t.id
      ${whereClause}
    `, params);
    const total = countRes.rows[0]?.total || 0;
    const page = queryInput.page;
    const limit = queryInput.limit;
    const offset = (page - 1) * limit;
    const allowedSortFields = ['created_at', 'name', 'status', 'value_pkr', 'priority', 'next_follow_up_date'];
    const sortBy = allowedSortFields.includes(queryInput.sortBy) ? queryInput.sortBy : 'created_at';
    const sortOrder = queryInput.sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const selectSql = `
      SELECT l.*, to_char(l.next_follow_up_date, 'YYYY-MM-DD') as next_follow_up_date,
             pm.name as pricing_model_name, u.name as assigned_to_name, t.name as team_name
      FROM leads l
      LEFT JOIN pricing_models pm ON l.pricing_model_id = pm.id
      LEFT JOIN users u ON l.assigned_to_id = u.id
      LEFT JOIN teams t ON l.team_id = t.id
      ${whereClause}
      ORDER BY l.${sortBy} ${sortOrder}
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limit, offset);
    const res = await query<LeadDbRow>(selectSql, params);
    return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  public static async getLeadById(
    actor: AuthUser, scope: HierarchyScope, id: string
  ): Promise<LeadDbRow & { activities: unknown[]; followUps: unknown[] }> {
    const res = await query<LeadDbRow>(`
      SELECT l.*, to_char(l.next_follow_up_date, 'YYYY-MM-DD') as next_follow_up_date,
             pm.name as pricing_model_name, u.name as assigned_to_name, t.name as team_name
      FROM leads l
      LEFT JOIN pricing_models pm ON l.pricing_model_id = pm.id
      LEFT JOIN users u ON l.assigned_to_id = u.id
      LEFT JOIN teams t ON l.team_id = t.id
      WHERE l.id = $1
    `, [id]);
    if (res.rows.length === 0) throw AppError.notFound(`Lead '${id}' not found`);
    const lead = res.rows[0];
    this.verifyLeadScope(actor, scope, lead);
    const actRes = await query(`SELECT la.*, u.name as actor_name FROM lead_activities la
      LEFT JOIN users u ON la.actor_id = u.id WHERE la.lead_id = $1 ORDER BY la.timestamp DESC`, [id]);
    const fuRes = await query(`SELECT fu.*, to_char(fu.scheduled_date, 'YYYY-MM-DD') as scheduled_date,
      u.name as assigned_to_name FROM follow_ups fu LEFT JOIN users u ON fu.assigned_to_id = u.id
      WHERE fu.lead_id = $1 ORDER BY fu.scheduled_date DESC`, [id]);
    return { ...lead, activities: actRes.rows, followUps: fuRes.rows };
  }

  public static verifyLeadScope(actor: AuthUser, scope: HierarchyScope, lead: LeadDbRow): void {
    if (actor.role === 'Super Admin' || actor.role === 'Admin') return;
    if (actor.role === 'Manager' || actor.role === 'Team Lead') {
      const allowedUsers = new Set([actor.id, ...(scope.subordinateUserIds || [])]);
      const allowedTeams = new Set(scope.managedTeamIds || []);
      if (lead.assigned_to_id && allowedUsers.has(lead.assigned_to_id)) return;
      if (lead.team_id && allowedTeams.has(lead.team_id)) return;
      throw AppError.forbidden('Forbidden: Lead is outside your authorized organizational scope');
    }
    if (lead.assigned_to_id !== actor.id) throw AppError.forbidden('Forbidden: You can only access leads assigned to you');
  }

  public static async createLead(actor: AuthUser, input: CreateLeadInput): Promise<LeadDbRow> {
    const assignedId = toUuidOrNull(input.assignedToId || actor.id);
    const actorId = toUuidOrNull(actor.id);
    return await withTransaction(async (client) => {
      const sql = `INSERT INTO leads (
          name, business_name, phone, email, city, service_ids, service_snapshot, value_pkr, status,
          quality, priority, source, source_id, assigned_to_id, team_id, pricing_model_id, budget_details,
          notes, tags, next_follow_up_date, next_follow_up_time, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING *`;
      const params = [input.name.trim(), input.businessName?.trim() || null, input.phone.trim(),
      input.email?.trim() || null, input.city?.trim() || null, JSON.stringify(input.serviceIds || []),
      JSON.stringify(input.serviceSnapshot || []), input.valuePKR || 0, input.status || 'New',
      input.quality || 'Normal', input.priority || 'Medium', input.source, toUuidOrNull(input.sourceId),
        assignedId, toUuidOrNull(input.teamId), toUuidOrNull(input.pricingModelId || input.pricing_model_id),
      JSON.stringify(input.budgetDetails || input.budget_details || {}), input.notes || null,
      JSON.stringify(input.tags || []), input.nextFollowUpDate || null, input.nextFollowUpTime || null, actorId];
      const res = await client.query<LeadDbRow>(sql, params);
      const lead = res.rows[0];
      await client.query(`INSERT INTO lead_activities (lead_id, type, title, notes, actor_id)
        VALUES ($1, 'Status Change', 'Lead Created', 'Lead entered into CRM', $2)`, [lead.id, actorId]);
      if (input.nextFollowUpDate) {
        await client.query(`INSERT INTO follow_ups (lead_id, client_business_snapshot, phone, scheduled_date,
          scheduled_time, type, status, assigned_to_id, notes, created_by)
          VALUES ($1,$2,$3,$4,$5,'Call','Scheduled',$6,$7,$8)`,
          [lead.id, lead.business_name || lead.name, lead.phone, input.nextFollowUpDate,
          input.nextFollowUpTime || '11:00', assignedId || actorId,
          input.notes ? `Follow-up scheduled: ${input.notes}` : 'Initial follow-up scheduled with lead', actorId]);
      }
      await AuditService.logFromRequest(actor, 'CREATE_LEAD', 'LEAD', lead.id, lead.name,
        { status: lead.status, source: lead.source, valuePKR: lead.value_pkr }, client);
      const createdRes = await client.query<LeadDbRow>(`SELECT l.*, to_char(l.next_follow_up_date, 'YYYY-MM-DD') as next_follow_up_date,
        pm.name as pricing_model_name, u.name as assigned_to_name, t.name as team_name FROM leads l
        LEFT JOIN pricing_models pm ON l.pricing_model_id = pm.id LEFT JOIN users u ON l.assigned_to_id = u.id
        LEFT JOIN teams t ON l.team_id = t.id WHERE l.id = $1`, [lead.id]);
      return createdRes.rows[0] || lead;
    });
  }

  public static async updateLead(actor: AuthUser, scope: HierarchyScope, id: string, input: UpdateLeadInput): Promise<LeadDbRow> {
    // Lock the lead before comparing schedules so concurrent lead edits cannot both create a follow-up.
    return await withTransaction(async (client) => {
      const existing = await client.query<LeadDbRow>(`SELECT l.*, to_char(l.next_follow_up_date, 'YYYY-MM-DD') as next_follow_up_date
        FROM leads l WHERE l.id = $1 FOR UPDATE`, [id]);
      if (!existing.rows.length) throw AppError.notFound(`Lead '${id}' not found`);
      const lead = existing.rows[0];
      this.verifyLeadScope(actor, scope, lead);
      const previousDate = lead.next_follow_up_date || null;
      const previousTime = lead.next_follow_up_time || null;
      const requestedDate = input.nextFollowUpDate !== undefined ? input.nextFollowUpDate || null : previousDate;
      const requestedTime = input.nextFollowUpTime !== undefined ? input.nextFollowUpTime || null : previousTime;
      const scheduleChanged = previousDate !== requestedDate || comparableTime(previousTime) !== comparableTime(requestedTime);
      const fields: string[] = [];
      const params: unknown[] = [];
      let idx = 1;
      if (input.name !== undefined) { fields.push(`name = $${idx++}`); params.push(input.name.trim()); }
      if (input.businessName !== undefined) { fields.push(`business_name = $${idx++}`); params.push(input.businessName?.trim() || null); }
      if (input.phone !== undefined) { fields.push(`phone = $${idx++}`); params.push(input.phone.trim()); }
      if (input.email !== undefined) { fields.push(`email = $${idx++}`); params.push(input.email?.trim() || null); }
      if (input.city !== undefined) { fields.push(`city = $${idx++}`); params.push(input.city?.trim() || null); }
      if (input.valuePKR !== undefined) { fields.push(`value_pkr = $${idx++}`); params.push(input.valuePKR); }
      if (input.priority !== undefined) { fields.push(`priority = $${idx++}`); params.push(input.priority); }
      if (input.quality !== undefined) { fields.push(`quality = $${idx++}`); params.push(input.quality); }
      if (input.notes !== undefined) { fields.push(`notes = $${idx++}`); params.push(input.notes); }
      if (input.serviceIds !== undefined) { fields.push(`service_ids = $${idx++}`); params.push(JSON.stringify(input.serviceIds)); }
      if (input.tags !== undefined) { fields.push(`tags = $${idx++}`); params.push(JSON.stringify(input.tags)); }
      const pmId = input.pricingModelId !== undefined ? input.pricingModelId : input.pricing_model_id;
      if (pmId !== undefined) { fields.push(`pricing_model_id = $${idx++}`); params.push(toUuidOrNull(pmId)); }
      const bd = input.budgetDetails !== undefined ? input.budgetDetails : input.budget_details;
      if (bd !== undefined) { fields.push(`budget_details = $${idx++}`); params.push(JSON.stringify(bd)); }
      if (input.assignedToId !== undefined) { fields.push(`assigned_to_id = $${idx++}`); params.push(toUuidOrNull(input.assignedToId)); }
      if (input.teamId !== undefined) { fields.push(`team_id = $${idx++}`); params.push(toUuidOrNull(input.teamId)); }
      if (input.nextFollowUpDate !== undefined) { fields.push(`next_follow_up_date = $${idx++}`); params.push(requestedDate); }
      if (input.nextFollowUpTime !== undefined) { fields.push(`next_follow_up_time = $${idx++}`); params.push(requestedTime); }
      if (!fields.length) return lead;
      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);
      const res = await client.query<LeadDbRow>(`UPDATE leads SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, params);
      const updatedLead = res.rows[0];

      // Only a genuine schedule change may insert, update or remove a scheduled follow-up.
      // A full PUT payload containing an unchanged date/time is not a scheduling request.
      if (scheduleChanged) {
        if (requestedDate) {
          const existingFuRes = await client.query(`SELECT id FROM follow_ups WHERE lead_id = $1 AND status = 'Scheduled'
            ORDER BY scheduled_date ASC, scheduled_time ASC, id ASC LIMIT 1 FOR UPDATE`, [id]);
          if (existingFuRes.rows.length > 0) {
            await client.query(`UPDATE follow_ups SET scheduled_date = $1, scheduled_time = $2,
              assigned_to_id = COALESCE($3, assigned_to_id), client_business_snapshot = $4, phone = $5,
              updated_at = CURRENT_TIMESTAMP WHERE id = $6 AND status = 'Scheduled'`,
              [requestedDate, requestedTime || '11:00', toUuidOrNull(input.assignedToId),
                updatedLead.business_name || updatedLead.name, updatedLead.phone, existingFuRes.rows[0].id]);
          } else {
            await client.query(`INSERT INTO follow_ups (lead_id, client_business_snapshot, phone, scheduled_date,
              scheduled_time, type, status, assigned_to_id, notes, created_by)
              VALUES ($1,$2,$3,$4,$5,'Call','Scheduled',$6,$7,$8)`,
              [id, updatedLead.business_name || updatedLead.name, updatedLead.phone, requestedDate,
                requestedTime || '11:00', updatedLead.assigned_to_id || toUuidOrNull(actor.id),
                'Follow-up updated with lead schedule', toUuidOrNull(actor.id)]);
          }
        } else if (previousDate && input.nextFollowUpDate === null) {
          // Preserve completed history. Retain existing explicit schedule-clearing behavior.
          await client.query(`DELETE FROM follow_ups WHERE lead_id = $1 AND status = 'Scheduled'`, [id]);
        }
      } else if (input.assignedToId && updatedLead.assigned_to_id !== lead.assigned_to_id) {
        await client.query(`UPDATE follow_ups SET assigned_to_id = $1, updated_at = CURRENT_TIMESTAMP
          WHERE lead_id = $2 AND status = 'Scheduled'`, [toUuidOrNull(input.assignedToId), id]);
      }
      await AuditService.logFromRequest(actor, 'UPDATE_LEAD', 'LEAD', id, lead.name,
        { updatedFields: Object.keys(input) }, client);
      const updatedRes = await client.query<LeadDbRow>(`SELECT l.*, to_char(l.next_follow_up_date, 'YYYY-MM-DD') as next_follow_up_date,
        pm.name as pricing_model_name, u.name as assigned_to_name, t.name as team_name FROM leads l
        LEFT JOIN pricing_models pm ON l.pricing_model_id = pm.id LEFT JOIN users u ON l.assigned_to_id = u.id
        LEFT JOIN teams t ON l.team_id = t.id WHERE l.id = $1`, [id]);
      return updatedRes.rows[0] || updatedLead;
    });
  }

  public static async changeStatus(actor: AuthUser, scope: HierarchyScope, id: string, input: ChangeLeadStatusInput): Promise<LeadDbRow> {
    const lead = await this.getLeadById(actor, scope, id);
    const actorId = toUuidOrNull(actor.id);
    return await withTransaction(async (client) => {
      const res = await client.query<LeadDbRow>(`UPDATE leads SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`, [input.status, id]);
      await client.query(`INSERT INTO lead_activities (lead_id, type, title, notes, actor_id) VALUES ($1, 'Status Change', $2, $3, $4)`,
        [id, `Status changed to ${input.status}`, input.notes || `Lead status updated to ${input.status}`, actorId]);
      await AuditService.logFromRequest(actor, 'CHANGE_LEAD_STATUS', 'LEAD', id, lead.name, { from: lead.status, to: input.status }, client);
      return res.rows[0];
    });
  }

  public static async reassignLead(actor: AuthUser, scope: HierarchyScope, id: string, input: ReassignLeadInput): Promise<LeadDbRow> {
    const lead = await this.getLeadById(actor, scope, id);
    const actorId = toUuidOrNull(actor.id);
    const newAssigneeId = toUuidOrNull(input.assignedToId);
    return await withTransaction(async (client) => {
      const res = await client.query<LeadDbRow>(`UPDATE leads SET assigned_to_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`, [newAssigneeId, id]);
      if (newAssigneeId) {
        await client.query(`UPDATE follow_ups SET assigned_to_id = $1, updated_at = CURRENT_TIMESTAMP WHERE lead_id = $2 AND status = 'Scheduled'`, [newAssigneeId, id]);
      }
      await client.query(`INSERT INTO lead_activities (lead_id, type, title, notes, actor_id) VALUES ($1, 'Reassignment', 'Lead Reassigned', $2, $3)`,
        [id, input.reason || `Lead reassigned to user ${input.assignedToId}`, actorId]);
      await AuditService.logFromRequest(actor, 'REASSIGN_LEAD', 'LEAD', id, lead.name, { previousAssignee: lead.assigned_to_id, newAssignee: input.assignedToId }, client);
      return res.rows[0];
    });
  }

  public static async addActivity(actor: AuthUser, scope: HierarchyScope, leadId: string, input: AddLeadActivityInput): Promise<unknown> {
    await this.getLeadById(actor, scope, leadId);
    const actorId = toUuidOrNull(actor.id);
    const res = await query(`INSERT INTO lead_activities (lead_id, type, title, notes, outcome, duration_minutes, actor_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [leadId, input.type, input.title, input.notes || null, input.outcome || null, input.durationMinutes || null, actorId]);
    return res.rows[0];
  }

  public static async deleteLead(actor: AuthUser, scope: HierarchyScope, id: string): Promise<void> {
    const lead = await this.getLeadById(actor, scope, id);
    if (actor.role !== 'Super Admin' && actor.role !== 'Admin') throw AppError.forbidden('Only Super Admin and Admin can delete leads');
    await query('DELETE FROM leads WHERE id = $1', [id]);
    await AuditService.logFromRequest(actor, 'DELETE_LEAD', 'LEAD', id, lead.name, { status: lead.status });
  }
}
