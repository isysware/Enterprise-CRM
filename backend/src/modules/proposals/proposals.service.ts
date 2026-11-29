import { query } from '../../database/connection';
import { AuthUser, HierarchyScope } from '../../types';
import { AuditService } from '../../services/audit.service';
import { AppError } from '../../utils/AppError';
import {
  CreateProposalInput,
  UpdateProposalInput,
  UpdateProposalStatusInput,
} from './proposals.validator';

export interface ProposalDbRow {
  id: string;
  lead_id: string | null;
  proposal_number: string;
  issue_date: string;
  expiry_date: string | null;
  client_snapshot: Record<string, unknown>;
  assigned_rep_id: string | null;
  assigned_rep_name?: string | null;
  created_by_name?: string | null;
  scope_deliverables: string | null;
  line_items: unknown[];
  discount_pkr: string;
  tax_pkr: string;
  total_pkr: string;
  milestones: unknown[];
  terms: string | null;
  letterhead_snapshot: Record<string, unknown>;
  status: string;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export class ProposalsService {
  public static async listProposals(
    actor: AuthUser,
    scope: HierarchyScope,
    leadId?: string
  ): Promise<ProposalDbRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    // Scope check
    if (actor.role !== 'Super Admin' && actor.role !== 'Admin') {
      if (actor.role === 'Manager' || actor.role === 'Team Lead') {
        const allowedUsers = [actor.id, ...(scope.subordinateUserIds || [])];
        conditions.push(`p.assigned_rep_id = ANY($${idx++})`);
        params.push(allowedUsers);
      } else {
        conditions.push(`p.assigned_rep_id = $${idx++}`);
        params.push(actor.id);
      }
    }

    if (leadId) {
      conditions.push(`p.lead_id = $${idx++}`);
      params.push(leadId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT p.*,
             to_char(p.issue_date, 'YYYY-MM-DD') as issue_date,
             to_char(p.expiry_date, 'YYYY-MM-DD') as expiry_date,
             u.name as assigned_rep_name,
             cb.name as created_by_name
      FROM proposals p
      LEFT JOIN users u ON p.assigned_rep_id = u.id
      LEFT JOIN users cb ON p.created_by = cb.id
      ${whereClause}
      ORDER BY p.created_at DESC
    `;

    const res = await query<ProposalDbRow>(sql, params);
    return res.rows;
  }

  public static async getProposalById(
    actor: AuthUser,
    scope: HierarchyScope,
    id: string
  ): Promise<ProposalDbRow> {
    const sql = `
      SELECT p.*,
             to_char(p.issue_date, 'YYYY-MM-DD') as issue_date,
             to_char(p.expiry_date, 'YYYY-MM-DD') as expiry_date,
             u.name as assigned_rep_name,
             cb.name as created_by_name
      FROM proposals p
      LEFT JOIN users u ON p.assigned_rep_id = u.id
      LEFT JOIN users cb ON p.created_by = cb.id
      WHERE p.id = $1
    `;
    const res = await query<ProposalDbRow>(sql, [id]);
    if (res.rows.length === 0) {
      throw AppError.notFound(`Proposal '${id}' not found`);
    }

    const prop = res.rows[0];
    this.verifyProposalScope(actor, scope, prop);
    return prop;
  }

  public static verifyProposalScope(actor: AuthUser, scope: HierarchyScope, prop: ProposalDbRow): void {
    if (actor.role === 'Super Admin' || actor.role === 'Admin') return;
    if (actor.role === 'Manager' || actor.role === 'Team Lead') {
      const allowedUsers = new Set([actor.id, ...(scope.subordinateUserIds || [])]);
      if (prop.assigned_rep_id && allowedUsers.has(prop.assigned_rep_id)) return;
      throw AppError.forbidden('Forbidden: Proposal is outside your authorized organizational scope');
    }
    if (prop.assigned_rep_id !== actor.id) {
      throw AppError.forbidden('Forbidden: You can only access proposals assigned to you');
    }
  }

  public static async createProposal(
    actor: AuthUser,
    input: CreateProposalInput
  ): Promise<ProposalDbRow> {
    const propNumber =
      input.proposalNumber?.trim() ||
      `PROP-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    const existing = await query('SELECT id FROM proposals WHERE proposal_number = $1', [
      propNumber,
    ]);
    if (existing.rows.length > 0) {
      throw AppError.conflict(`Proposal number '${propNumber}' already exists`);
    }

    const toUuidOrNull = (id?: string | null): string | null =>
      Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) ? id! : null;

    const validLeadId = toUuidOrNull(input.leadId);
    let repId = toUuidOrNull(input.assignedRepId);
    if (!repId && validLeadId) {
      const leadRes = await query<{ assigned_to_id: string | null }>(
        'SELECT assigned_to_id FROM leads WHERE id = $1',
        [validLeadId]
      );
      if (leadRes.rows.length > 0 && leadRes.rows[0].assigned_to_id) {
        repId = toUuidOrNull(leadRes.rows[0].assigned_to_id);
      }
    }
    if (!repId) {
      repId = toUuidOrNull(actor.id);
    }
    const validCreatedBy = toUuidOrNull(actor.id);

    const sql = `
      INSERT INTO proposals (
        lead_id, proposal_number, issue_date, expiry_date,
        client_snapshot, assigned_rep_id, scope_deliverables,
        line_items, discount_pkr, tax_pkr, total_pkr,
        milestones, terms, letterhead_snapshot, status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING id
    `;

    const res = await query<{ id: string }>(sql, [
      validLeadId,
      propNumber,
      input.issueDate,
      input.expiryDate || null,
      JSON.stringify(input.clientSnapshot || {}),
      repId,
      input.scopeDeliverables || null,
      JSON.stringify(input.lineItems || []),
      input.discountPKR || 0,
      input.taxPKR || 0,
      input.totalPKR || 0,
      JSON.stringify(input.milestones || []),
      input.terms || null,
      JSON.stringify(input.letterheadSnapshot || {}),
      input.status || 'Draft',
      validCreatedBy,
    ]);

    const createdId = res.rows[0].id;
    const fullRes = await query<ProposalDbRow>(`
      SELECT p.*,
             to_char(p.issue_date, 'YYYY-MM-DD') as issue_date,
             to_char(p.expiry_date, 'YYYY-MM-DD') as expiry_date,
             u.name as assigned_rep_name,
             cb.name as created_by_name
      FROM proposals p
      LEFT JOIN users u ON p.assigned_rep_id = u.id
      LEFT JOIN users cb ON p.created_by = cb.id
      WHERE p.id = $1
    `, [createdId]);
    const createdProposal = fullRes.rows[0];

    await AuditService.logFromRequest(
      actor,
      'CREATE_PROPOSAL',
      'PROPOSAL',
      createdProposal.id,
      createdProposal.proposal_number,
      { totalPKR: createdProposal.total_pkr, leadId: input.leadId }
    );

    return createdProposal;
  }

  public static async updateProposal(
    actor: AuthUser,
    scope: HierarchyScope,
    id: string,
    input: UpdateProposalInput
  ): Promise<ProposalDbRow> {
    const existing = await this.getProposalById(actor, scope, id);

    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (input.expiryDate !== undefined) {
      fields.push(`expiry_date = $${idx++}`);
      params.push(input.expiryDate);
    }
    if (input.clientSnapshot !== undefined) {
      fields.push(`client_snapshot = $${idx++}`);
      params.push(JSON.stringify(input.clientSnapshot));
    }
    if (input.assignedRepId !== undefined) {
      fields.push(`assigned_rep_id = $${idx++}`);
      params.push(input.assignedRepId);
    }
    if (input.scopeDeliverables !== undefined) {
      fields.push(`scope_deliverables = $${idx++}`);
      params.push(input.scopeDeliverables);
    }
    if (input.lineItems !== undefined) {
      fields.push(`line_items = $${idx++}`);
      params.push(JSON.stringify(input.lineItems));
    }
    if (input.discountPKR !== undefined) {
      fields.push(`discount_pkr = $${idx++}`);
      params.push(input.discountPKR);
    }
    if (input.taxPKR !== undefined) {
      fields.push(`tax_pkr = $${idx++}`);
      params.push(input.taxPKR);
    }
    if (input.totalPKR !== undefined) {
      fields.push(`total_pkr = $${idx++}`);
      params.push(input.totalPKR);
    }
    if (input.milestones !== undefined) {
      fields.push(`milestones = $${idx++}`);
      params.push(JSON.stringify(input.milestones));
    }
    if (input.terms !== undefined) {
      fields.push(`terms = $${idx++}`);
      params.push(input.terms);
    }
    if (input.letterheadSnapshot !== undefined) {
      fields.push(`letterhead_snapshot = $${idx++}`);
      params.push(JSON.stringify(input.letterheadSnapshot));
    }
    if (input.status !== undefined) {
      fields.push(`status = $${idx++}`);
      params.push(input.status);
    }

    if (fields.length === 0) return existing;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const sql = `
      UPDATE proposals
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *,
        to_char(issue_date, 'YYYY-MM-DD') as issue_date,
        to_char(expiry_date, 'YYYY-MM-DD') as expiry_date
    `;
    const res = await query<ProposalDbRow>(sql, params);

    await AuditService.logFromRequest(
      actor,
      'UPDATE_PROPOSAL',
      'PROPOSAL',
      id,
      res.rows[0].proposal_number
    );

    return res.rows[0];
  }

  public static async updateStatus(
    actor: AuthUser,
    scope: HierarchyScope,
    id: string,
    input: UpdateProposalStatusInput
  ): Promise<ProposalDbRow> {
    const existing = await this.getProposalById(actor, scope, id);

    const sql = `
      UPDATE proposals
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *,
        to_char(issue_date, 'YYYY-MM-DD') as issue_date,
        to_char(expiry_date, 'YYYY-MM-DD') as expiry_date
    `;
    const res = await query<ProposalDbRow>(sql, [input.status, id]);

    await AuditService.logFromRequest(
      actor,
      'CHANGE_PROPOSAL_STATUS',
      'PROPOSAL',
      id,
      existing.proposal_number,
      { previousStatus: existing.status, newStatus: input.status }
    );

    return res.rows[0];
  }
}
