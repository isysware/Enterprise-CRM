import { query, withTransaction } from '../../database/connection';
import { AuthUser, HierarchyScope } from '../../types';
import { AuditService } from '../../services/audit.service';
import { AppError } from '../../utils/AppError';
import {
  CreateFollowUpInput,
  UpdateFollowUpInput,
  CompleteFollowUpInput,
  RescheduleFollowUpInput,
  ListFollowUpsQuery,
} from './follow-ups.validator';

export interface FollowUpDbRow {
  id: string;
  lead_id: string;
  lead_name?: string;
  client_business_snapshot: string | null;
  phone: string | null;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string | null;
  type: string;
  status: string;
  assigned_to_id: string;
  assigned_to_name?: string;
  notes: string | null;
  result_outcome: string | null;
  completed_at: Date | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export class FollowUpsService {
  public static async listFollowUps(
    actor: AuthUser,
    scope: HierarchyScope,
    queryInput: ListFollowUpsQuery
  ): Promise<FollowUpDbRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    // Scope check
    if (actor.role !== 'Super Admin' && actor.role !== 'Admin') {
      if (actor.role === 'Manager' || actor.role === 'Team Lead') {
        const allowedUsers = [actor.id, ...(scope.subordinateUserIds || [])];
        conditions.push(`fu.assigned_to_id = ANY($${idx++})`);
        params.push(allowedUsers);
      } else {
        // Employee
        conditions.push(`fu.assigned_to_id = $${idx++}`);
        params.push(actor.id);
      }
    }

    // Classification filter
    if (queryInput.classification) {
      if (queryInput.classification === 'today') {
        conditions.push(`fu.scheduled_date = CURRENT_DATE AND fu.status = 'Scheduled'`);
      } else if (queryInput.classification === 'upcoming') {
        conditions.push(`fu.scheduled_date > CURRENT_DATE AND fu.status = 'Scheduled'`);
      } else if (queryInput.classification === 'missed') {
        conditions.push(`fu.scheduled_date < CURRENT_DATE AND fu.status = 'Scheduled'`);
      } else if (queryInput.classification === 'completed') {
        conditions.push(`fu.status = 'Completed'`);
      }
    }

    if (queryInput.leadId) {
      conditions.push(`fu.lead_id = $${idx++}`);
      params.push(queryInput.leadId);
    }
    if (queryInput.assignedToId) {
      conditions.push(`fu.assigned_to_id = $${idx++}`);
      params.push(queryInput.assignedToId);
    }
    if (queryInput.date) {
      conditions.push(`fu.scheduled_date = $${idx++}`);
      params.push(queryInput.date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT fu.*,
             to_char(fu.scheduled_date, 'YYYY-MM-DD') as scheduled_date,
             l.name as lead_name,
             u.name as assigned_to_name
      FROM follow_ups fu
      LEFT JOIN leads l ON fu.lead_id = l.id
      LEFT JOIN users u ON fu.assigned_to_id = u.id
      ${whereClause}
      ORDER BY fu.scheduled_date ASC, fu.scheduled_time ASC NULLS LAST
    `;

    const res = await query<FollowUpDbRow>(sql, params);
    return res.rows;
  }

  public static async getFollowUpById(
    actor: AuthUser,
    scope: HierarchyScope,
    id: string
  ): Promise<FollowUpDbRow> {
    const sql = `
      SELECT fu.*,
             to_char(fu.scheduled_date, 'YYYY-MM-DD') as scheduled_date,
             l.name as lead_name,
             u.name as assigned_to_name
      FROM follow_ups fu
      LEFT JOIN leads l ON fu.lead_id = l.id
      LEFT JOIN users u ON fu.assigned_to_id = u.id
      WHERE fu.id = $1
    `;
    const res = await query<FollowUpDbRow>(sql, [id]);
    if (res.rows.length === 0) {
      throw AppError.notFound(`Follow-up '${id}' not found`);
    }

    const fu = res.rows[0];
    this.verifyFollowUpScope(actor, scope, fu);
    return fu;
  }

  public static verifyFollowUpScope(actor: AuthUser, scope: HierarchyScope, fu: FollowUpDbRow): void {
    if (actor.role === 'Super Admin' || actor.role === 'Admin') return;
    if (actor.role === 'Manager' || actor.role === 'Team Lead') {
      const allowedUsers = new Set([actor.id, ...(scope.subordinateUserIds || [])]);
      if (allowedUsers.has(fu.assigned_to_id)) return;
      throw AppError.forbidden('Forbidden: Follow-up is outside your authorized organizational scope');
    }
    if (fu.assigned_to_id !== actor.id) {
      throw AppError.forbidden('Forbidden: You can only access follow-ups assigned to you');
    }
  }

  /**
   * Create follow-up and sync next follow-up date on lead
   */
  public static async createFollowUp(
    actor: AuthUser,
    input: CreateFollowUpInput
  ): Promise<FollowUpDbRow> {
    const assignedId = input.assignedToId || actor.id;

    return await withTransaction(async (client) => {
      // Fetch lead to get snapshot
      const leadRes = await client.query('SELECT name, business_name, phone FROM leads WHERE id = $1', [
        input.leadId,
      ]);
      if (leadRes.rows.length === 0) {
        throw AppError.notFound(`Lead '${input.leadId}' not found`);
      }
      const lead = leadRes.rows[0];
      const snapshot = input.clientBusinessSnapshot || lead.business_name || lead.name;
      const phone = input.phone || lead.phone;

      const sql = `
        INSERT INTO follow_ups (
          lead_id, client_business_snapshot, phone, scheduled_date,
          scheduled_time, type, status, assigned_to_id, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, 'Scheduled', $7, $8, $9)
        RETURNING *, to_char(scheduled_date, 'YYYY-MM-DD') as scheduled_date
      `;

      const res = await client.query<FollowUpDbRow>(sql, [
        input.leadId,
        snapshot,
        phone,
        input.scheduledDate,
        input.scheduledTime || null,
        input.type || 'Call',
        assignedId,
        input.notes || null,
        actor.id,
      ]);

      // Update lead's next follow-up date/time
      await client.query(
        `UPDATE leads 
         SET next_follow_up_date = $1, next_follow_up_time = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        [input.scheduledDate, input.scheduledTime || null, input.leadId]
      );

      await AuditService.logFromRequest(
        actor,
        'SCHEDULE_FOLLOW_UP',
        'FOLLOW_UP',
        res.rows[0].id,
        lead.name,
        { scheduledDate: input.scheduledDate, type: input.type },
        client
      );

      return res.rows[0];
    });
  }

  /**
   * Complete follow-up, record outcome, and append activity log
   */
  public static async completeFollowUp(
    actor: AuthUser,
    scope: HierarchyScope,
    id: string,
    input: CompleteFollowUpInput
  ): Promise<FollowUpDbRow> {
    const fu = await this.getFollowUpById(actor, scope, id);

    return await withTransaction(async (client) => {
      const sql = `
        UPDATE follow_ups
        SET status = 'Completed',
            result_outcome = $1,
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *, to_char(scheduled_date, 'YYYY-MM-DD') as scheduled_date
      `;
      const res = await client.query<FollowUpDbRow>(sql, [input.resultOutcome, id]);

      // Log in lead activities
      await client.query(
        `INSERT INTO lead_activities (lead_id, type, title, notes, outcome, actor_id)
         VALUES ($1, $2, 'Follow-up Completed', $3, $4, $5)`,
        [fu.lead_id, fu.type, fu.notes || null, input.resultOutcome, actor.id]
      );

      // If next follow-up provided, update lead's next date
      if (input.nextFollowUpDate !== undefined) {
        await client.query(
          `UPDATE leads 
           SET next_follow_up_date = $1, next_follow_up_time = $2, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $3`,
          [input.nextFollowUpDate, input.nextFollowUpTime || null, fu.lead_id]
        );
      }

      await AuditService.logFromRequest(
        actor,
        'COMPLETE_FOLLOW_UP',
        'FOLLOW_UP',
        id,
        fu.lead_name,
        { outcome: input.resultOutcome },
        client
      );

      return res.rows[0];
    });
  }

  /**
   * Reschedule follow-up
   */
  public static async rescheduleFollowUp(
    actor: AuthUser,
    scope: HierarchyScope,
    id: string,
    input: RescheduleFollowUpInput
  ): Promise<FollowUpDbRow> {
    const fu = await this.getFollowUpById(actor, scope, id);

    return await withTransaction(async (client) => {
      const sql = `
        UPDATE follow_ups
        SET scheduled_date = $1,
            scheduled_time = $2,
            status = 'Scheduled',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *, to_char(scheduled_date, 'YYYY-MM-DD') as scheduled_date
      `;
      const res = await client.query<FollowUpDbRow>(sql, [
        input.scheduledDate,
        input.scheduledTime || null,
        id,
      ]);

      // Update lead
      await client.query(
        `UPDATE leads 
         SET next_follow_up_date = $1, next_follow_up_time = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        [input.scheduledDate, input.scheduledTime || null, fu.lead_id]
      );

      await client.query(
        `INSERT INTO lead_activities (lead_id, type, title, notes, actor_id)
         VALUES ($1, $2, 'Follow-up Rescheduled', $3, $4)`,
        [
          fu.lead_id,
          fu.type,
          `Rescheduled from ${fu.scheduled_date} to ${input.scheduledDate}. Reason: ${input.reason || 'None'}`,
          actor.id,
        ]
      );

      await AuditService.logFromRequest(
        actor,
        'RESCHEDULE_FOLLOW_UP',
        'FOLLOW_UP',
        id,
        fu.lead_name,
        { from: fu.scheduled_date, to: input.scheduledDate },
        client
      );

      return res.rows[0];
    });
  }

  public static async deleteFollowUp(
    actor: AuthUser,
    scope: HierarchyScope,
    id: string
  ): Promise<void> {
    const fu = await this.getFollowUpById(actor, scope, id);
    await query('DELETE FROM follow_ups WHERE id = $1', [id]);
    await AuditService.logFromRequest(actor, 'DELETE_FOLLOW_UP', 'FOLLOW_UP', id, fu.lead_name);
  }
}
