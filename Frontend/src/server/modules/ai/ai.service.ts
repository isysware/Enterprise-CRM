import { query } from '../../database/connection';
import { AuthUser, HierarchyScope } from '../../types';
import { AuditService } from '../../services/audit.service';
import { AppError } from '../../utils/AppError';
import { AiAssistantInput, AiAssistantResponse } from './ai.validator';
import { getAiProvider, ScopedCrmContext } from './ai.provider';

export class AiAssistantService {
  /**
   * Process an operational CRM inquiry through the internal CRM Copilot
   */
  public static async processRequest(
    actor: AuthUser,
    scope: HierarchyScope,
    input: AiAssistantInput
  ): Promise<AiAssistantResponse> {
    if (actor.status !== 'active') {
      throw AppError.forbidden('Forbidden: Inactive or suspended accounts cannot query the AI assistant');
    }

    // 1. Build Lead Scope Condition (identical to normal CRM APIs)
    const leadConditions: string[] = [];
    const leadParams: unknown[] = [];
    let idx = 1;

    if (actor.role === 'Super Admin' || actor.role === 'Admin') {
      // Organization-wide
    } else if (actor.role === 'Manager' || actor.role === 'Team Lead') {
      const allowedUsers = [actor.id, ...(scope.subordinateUserIds || [])];
      const allowedTeams = scope.managedTeamIds || [];
      leadConditions.push(
        `(l.assigned_to_id = ANY($${idx}::uuid[]) OR l.team_id = ANY($${idx + 1}::uuid[]))`
      );
      leadParams.push(allowedUsers, allowedTeams);
      idx += 2;
    } else {
      // Employee: strictly self only
      leadConditions.push(`l.assigned_to_id = $${idx++}`);
      leadParams.push(actor.id);
    }

    const leadWhere = leadConditions.length > 0 ? `WHERE ${leadConditions.join(' AND ')}` : '';

    // 2. Query Scoped Pipeline Summary
    const summarySql = `
      SELECT 
        COUNT(*)::int as total_leads,
        COALESCE(SUM(l.value_pkr), 0)::numeric as total_lead_value,
        COALESCE(SUM(CASE WHEN l.status NOT IN ('Won', 'Converted', 'Lost') THEN l.value_pkr ELSE 0 END), 0)::numeric as active_pipeline_value,
        COUNT(CASE WHEN l.status IN ('Won', 'Converted') THEN 1 END)::int as won_count,
        COUNT(CASE WHEN l.status = 'Lost' THEN 1 END)::int as lost_count,
        COUNT(CASE WHEN l.status IN ('New', 'Contacted', 'Follow-Up Required', 'Qualified') THEN 1 END)::int as open_count,
        COUNT(CASE WHEN l.status = 'New' THEN 1 END)::int as new_count,
        COUNT(CASE WHEN l.quality IN ('High', 'Hot') OR l.priority IN ('High', 'Urgent') THEN 1 END)::int as hot_urgent_count
      FROM leads l
      ${leadWhere}
    `;
    const summaryRes = await query<{
      total_leads: number;
      total_lead_value: string;
      active_pipeline_value: string;
      won_count: number;
      lost_count: number;
      open_count: number;
      new_count: number;
      hot_urgent_count: number;
    }>(summarySql, leadParams);
    const summaryRow = summaryRes.rows[0];

    // 3. Query Today's Scoped Leads
    const todaySql = `
      SELECT l.id, l.name, l.business_name, l.status, l.value_pkr, l.source, l.priority
      FROM leads l
      ${leadWhere ? leadWhere + ' AND l.created_at >= CURRENT_DATE' : 'WHERE l.created_at >= CURRENT_DATE'}
      ORDER BY l.created_at DESC
      LIMIT 10
    `;
    const todayRes = await query<{
      id: string;
      name: string;
      business_name: string | null;
      status: string;
      value_pkr: string;
      source: string;
      priority: string;
    }>(todaySql, leadParams);

    // 4. Query Scoped Follow-Ups (Missed, Today, Tomorrow)
    const fuConditions: string[] = [];
    const fuParams: unknown[] = [];
    let fuIdx = 1;

    if (actor.role === 'Super Admin' || actor.role === 'Admin') {
      // Organization-wide
    } else if (actor.role === 'Manager' || actor.role === 'Team Lead') {
      const allowedUsers = [actor.id, ...(scope.subordinateUserIds || [])];
      fuConditions.push(`fu.assigned_to_id = ANY($${fuIdx++}::uuid[])`);
      fuParams.push(allowedUsers);
    } else {
      // Employee: strictly self
      fuConditions.push(`fu.assigned_to_id = $${fuIdx++}`);
      fuParams.push(actor.id);
    }

    const fuBaseWhere = fuConditions.length > 0 ? `WHERE ${fuConditions.join(' AND ')}` : '';

    const missedSql = `
      SELECT fu.id, l.name as lead_name, fu.phone, to_char(fu.scheduled_date, 'YYYY-MM-DD') as scheduled_date,
             fu.scheduled_time::text as scheduled_time, fu.type
      FROM follow_ups fu
      LEFT JOIN leads l ON fu.lead_id = l.id
      ${fuBaseWhere ? fuBaseWhere + " AND fu.status = 'Scheduled' AND fu.scheduled_date < CURRENT_DATE" : "WHERE fu.status = 'Scheduled' AND fu.scheduled_date < CURRENT_DATE"}
      ORDER BY fu.scheduled_date ASC
      LIMIT 10
    `;
    const missedRes = await query(missedSql, fuParams);

    const todayFuSql = `
      SELECT fu.id, l.name as lead_name, fu.phone, to_char(fu.scheduled_date, 'YYYY-MM-DD') as scheduled_date,
             fu.scheduled_time::text as scheduled_time, fu.type
      FROM follow_ups fu
      LEFT JOIN leads l ON fu.lead_id = l.id
      ${fuBaseWhere ? fuBaseWhere + " AND fu.status = 'Scheduled' AND fu.scheduled_date = CURRENT_DATE" : "WHERE fu.status = 'Scheduled' AND fu.scheduled_date = CURRENT_DATE"}
      ORDER BY fu.scheduled_time ASC NULLS LAST
      LIMIT 10
    `;
    const todayFuRes = await query(todayFuSql, fuParams);

    const tomorrowFuSql = `
      SELECT fu.id, l.name as lead_name, fu.phone, to_char(fu.scheduled_date, 'YYYY-MM-DD') as scheduled_date,
             fu.scheduled_time::text as scheduled_time, fu.type
      FROM follow_ups fu
      LEFT JOIN leads l ON fu.lead_id = l.id
      ${fuBaseWhere ? fuBaseWhere + " AND fu.status = 'Scheduled' AND fu.scheduled_date = CURRENT_DATE + INTERVAL '1 day'" : "WHERE fu.status = 'Scheduled' AND fu.scheduled_date = CURRENT_DATE + INTERVAL '1 day'"}
      ORDER BY fu.scheduled_time ASC NULLS LAST
      LIMIT 10
    `;
    const tomorrowFuRes = await query(tomorrowFuSql, fuParams);

    // 5. Query Scoped Client Conversions
    const clientConditions: string[] = [];
    const clientParams: unknown[] = [];
    let cIdx = 1;

    if (actor.role === 'Super Admin' || actor.role === 'Admin') {
      // Organization-wide
    } else if (actor.role === 'Manager' || actor.role === 'Team Lead') {
      const allowedUsers = [actor.id, ...(scope.subordinateUserIds || [])];
      clientConditions.push(`c.assigned_owner_id = ANY($${cIdx++}::uuid[])`);
      clientParams.push(allowedUsers);
    } else {
      clientConditions.push(`c.assigned_owner_id = $${cIdx++}`);
      clientParams.push(actor.id);
    }

    const clientWhere = clientConditions.length > 0 ? `WHERE ${clientConditions.join(' AND ')}` : '';

    const clientSummarySql = `
      SELECT 
        COUNT(*)::int as total_clients,
        COALESCE(SUM(c.final_value_pkr), 0)::numeric as total_contract_value
      FROM clients c
      ${clientWhere}
    `;
    const clientSummaryRes = await query<{
      total_clients: number;
      total_contract_value: string;
    }>(clientSummarySql, clientParams);
    const clientSummaryRow = clientSummaryRes.rows[0];

    const fuSummarySql = `
      SELECT
        COUNT(CASE WHEN fu.status = 'Completed' THEN 1 END)::int as completed_count,
        COUNT(CASE WHEN fu.status IN ('Scheduled', 'Pending') THEN 1 END)::int as pending_count
      FROM follow_ups fu
      ${fuBaseWhere}
    `;
    const fuSummaryRes = await query<{
      completed_count: number;
      pending_count: number;
    }>(fuSummarySql, fuParams);
    const fuSummaryRow = fuSummaryRes.rows[0];

    const clientsSql = `
      SELECT c.business_name, c.contact_name, c.final_value_pkr, to_char(c.converted_date, 'YYYY-MM-DD') as converted_date
      FROM clients c
      ${clientWhere}
      ORDER BY c.converted_date DESC
      LIMIT 5
    `;
    const clientsRes = await query(clientsSql, clientParams);

    // 6. Query Lead Sources Breakdown
    const sourcesSql = `
      SELECT l.source, COUNT(*)::int as total_leads, COUNT(CASE WHEN l.status IN ('Won', 'Converted') THEN 1 END)::int as won_count
      FROM leads l
      ${leadWhere}
      GROUP BY l.source
      ORDER BY total_leads DESC
      LIMIT 5
    `;
    const sourcesRes = await query(sourcesSql, leadParams);

    // 7. Query Staff Performance (Only if actor has supervisory authority)
    let staffData: ScopedCrmContext['staffPerformance'] = undefined;
    if (actor.role !== 'Employee') {
      const staffSql = `
        SELECT u.name as user_name, u.role_name as role, COALESCE(t.name, 'Unassigned') as team_name,
               COUNT(l.id)::int as assigned_leads,
               COUNT(CASE WHEN l.status IN ('Won', 'Converted') THEN 1 END)::int as won_leads,
               COALESCE(SUM(l.value_pkr), 0)::numeric as pipeline_value
        FROM users u
        LEFT JOIN teams t ON u.team_id = t.id
        LEFT JOIN leads l ON u.id = l.assigned_to_id
        WHERE u.status = 'active'
          ${actor.role === 'Manager' || actor.role === 'Team Lead' ? 'AND u.id = ANY($1::uuid[])' : ''}
        GROUP BY u.id, u.name, u.role_name, t.name
        ORDER BY assigned_leads DESC
        LIMIT 10
      `;
      const staffParams =
        actor.role === 'Manager' || actor.role === 'Team Lead'
          ? [[actor.id, ...(scope.subordinateUserIds || [])]]
          : [];
      const staffRes = await query(staffSql, staffParams);
      staffData = staffRes.rows.map((r: any) => ({
        userName: r.user_name,
        role: r.role,
        teamName: r.team_name,
        assignedLeads: Number(r.assigned_leads),
        wonLeads: Number(r.won_leads),
        pipelineValuePKR: Number(r.pipeline_value),
      }));
    }

    // 8. Assemble Sanitized Operational Context
    const sanitizedContext: ScopedCrmContext = {
      actor: {
        id: actor.id,
        name: actor.name,
        role: actor.role,
      },
      summary: {
        totalLeads: Number(summaryRow?.total_leads) || 0,
        openLeadsCount: Number(summaryRow?.open_count) || 0,
        newLeadsCount: Number(summaryRow?.new_count) || 0,
        wonLeadsCount: Number(summaryRow?.won_count) || 0,
        lostLeadsCount: Number(summaryRow?.lost_count) || 0,
        conversionRate:
          (Number(summaryRow?.total_leads) || 0) > 0
            ? Number((((Number(summaryRow?.won_count) || 0) / (Number(summaryRow?.total_leads) || 1)) * 100).toFixed(2))
            : 0,
        totalLeadValuePKR: Number(summaryRow?.total_lead_value) || 0,
        activePipelineValuePKR: Number(summaryRow?.active_pipeline_value) || 0,
        hotUrgentLeadsCount: Number(summaryRow?.hot_urgent_count) || 0,
        totalClientsCount: Number(clientSummaryRow?.total_clients) || 0,
        convertedContractValuePKR: Number(clientSummaryRow?.total_contract_value) || 0,
        completedFollowUpsCount: Number(fuSummaryRow?.completed_count) || 0,
        pendingFollowUpsCount: Number(fuSummaryRow?.pending_count) || 0,
        pipelineValuePKR: Number(summaryRow?.active_pipeline_value) || 0,
        conversionsCount: Number(clientSummaryRow?.total_clients) || 0,
      },
      todayLeads: todayRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        businessName: r.business_name,
        status: r.status,
        valuePKR: Number(r.value_pkr),
        source: r.source,
        priority: r.priority,
      })),
      followUps: {
        missed: missedRes.rows.map((r: any) => ({
          id: r.id,
          leadName: r.lead_name,
          phone: r.phone,
          scheduledDate: r.scheduled_date,
          scheduledTime: r.scheduled_time,
          type: r.type,
        })),
        today: todayFuRes.rows.map((r: any) => ({
          id: r.id,
          leadName: r.lead_name,
          phone: r.phone,
          scheduledDate: r.scheduled_date,
          scheduledTime: r.scheduled_time,
          type: r.type,
        })),
        tomorrow: tomorrowFuRes.rows.map((r: any) => ({
          id: r.id,
          leadName: r.lead_name,
          phone: r.phone,
          scheduledDate: r.scheduled_date,
          scheduledTime: r.scheduled_time,
          type: r.type,
        })),
      },
      staffPerformance: staffData,
      recentConversions: clientsRes.rows.map((r: any) => ({
        clientName: r.contact_name,
        businessName: r.business_name,
        finalValuePKR: Number(r.final_value_pkr),
        convertedDate: r.converted_date,
      })),
      sourcesBreakdown: sourcesRes.rows.map((r: any) => ({
        source: r.source,
        totalLeads: Number(r.total_leads),
        wonLeads: Number(r.won_count),
      })),
    };

    // 9. Execute Response via AI Provider Abstraction
    const provider = getAiProvider();
    const response = await provider.generateResponse(input.prompt, sanitizedContext, input.history);

    // 10. Audit Log the Copilot Query
    await AuditService.logFromRequest(
      actor,
      'AI_ASSISTANT_QUERY',
      'AI_ASSISTANT',
      undefined,
      'Internal CRM Copilot operational query',
      { prompt: input.prompt.substring(0, 100), source: response.source }
    );

    return response;
  }
}
