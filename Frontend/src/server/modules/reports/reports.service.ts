import { query } from '../../database/connection';
import { AuthUser, HierarchyScope } from '../../types';
import { ReportQuery } from './reports.validator';

export class ReportsService {
  /**
   * Builds the SQL condition for user's organizational scope and report query filters
   */
  private static buildLeadsScopeAndFilters(
    actor: AuthUser,
    scope: HierarchyScope,
    filters: ReportQuery,
    alias = 'l'
  ): { clause: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    // 1. Organizational Scope Ceiling
    if (actor.role === 'Super Admin' || actor.role === 'Admin') {
      // Organization-wide
    } else if (actor.role === 'Manager' || actor.role === 'Team Lead') {
      const allowedUsers = [actor.id, ...(scope.subordinateUserIds || [])];
      const allowedTeams = scope.managedTeamIds || [];
      conditions.push(
        `(${alias}.assigned_to_id = ANY($${idx}::uuid[]) OR (${alias}.assigned_to_id IS NULL AND ${alias}.team_id = ANY($${idx + 1}::uuid[])))`
      );
      params.push(allowedUsers, allowedTeams);
      idx += 2;
    } else {
      // Employee: strictly self only
      conditions.push(`${alias}.assigned_to_id = $${idx++}`);
      params.push(actor.id);
    }

    // 2. Report User/Date/Status/Source Filters
    if (filters.fromDate) {
      conditions.push(`${alias}.created_at >= $${idx++}::date`);
      params.push(filters.fromDate);
    }
    if (filters.toDate) {
      conditions.push(`${alias}.created_at <= ($${idx++}::date + INTERVAL '1 day')`);
      params.push(filters.toDate);
    }
    if (filters.teamId && filters.teamId !== 'All') {
      conditions.push(`${alias}.team_id = $${idx++}`);
      params.push(filters.teamId);
    }
    if (filters.userId && filters.userId !== 'All') {
      conditions.push(`${alias}.assigned_to_id = $${idx++}`);
      params.push(filters.userId);
    }
    if (filters.source && filters.source !== 'All') {
      conditions.push(`${alias}.source = $${idx++}`);
      params.push(filters.source);
    }
    if (filters.status && filters.status !== 'All') {
      conditions.push(`${alias}.status = $${idx++}`);
      params.push(filters.status);
    }

    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { clause, params };
  }

  /**
   * 1. Sales & Pipeline Report
   */
  public static async getSalesPipelineReport(
    actor: AuthUser,
    scope: HierarchyScope,
    filters: ReportQuery
  ) {
    const { clause, params } = this.buildLeadsScopeAndFilters(actor, scope, filters, 'l');

    const sql = `
      SELECT 
        COUNT(*)::int as total_leads,
        COALESCE(SUM(l.value_pkr), 0)::numeric as total_pipeline_value,
        COALESCE(AVG(l.value_pkr), 0)::numeric as average_deal_value,
        COUNT(CASE WHEN l.status IN ('Won', 'Converted') THEN 1 END)::int as won_count,
        COUNT(CASE WHEN l.status = 'Lost' THEN 1 END)::int as lost_count,
        COUNT(CASE WHEN l.status = 'New' THEN 1 END)::int as new_count,
        COUNT(CASE WHEN l.status = 'Contacted' THEN 1 END)::int as contacted_count,
        COUNT(CASE WHEN l.status = 'Follow-Up Required' THEN 1 END)::int as follow_up_required_count,
        COUNT(CASE WHEN l.status = 'Qualified' THEN 1 END)::int as qualified_count,
        COUNT(CASE WHEN l.status = 'Hold' THEN 1 END)::int as hold_count,
        COUNT(CASE WHEN l.status = 'Cold' THEN 1 END)::int as cold_count,
        COUNT(CASE WHEN l.status = 'Returned' THEN 1 END)::int as returned_count,
        COUNT(CASE WHEN l.priority = 'Urgent' THEN 1 END)::int as urgent_priority_count,
        COUNT(CASE WHEN l.priority = 'High' THEN 1 END)::int as high_priority_count,
        COUNT(CASE WHEN l.priority = 'Medium' THEN 1 END)::int as medium_priority_count,
        COUNT(CASE WHEN l.priority = 'Low' THEN 1 END)::int as low_priority_count,
        COUNT(CASE WHEN l.quality = 'High' THEN 1 END)::int as high_quality_count,
        COUNT(CASE WHEN l.quality = 'Normal' THEN 1 END)::int as normal_quality_count,
        COUNT(CASE WHEN l.quality = 'Low' THEN 1 END)::int as low_quality_count
      FROM leads l
      ${clause}
    `;

    const res = await query(sql, params);
    const summary = res.rows[0];
    const totalLeads = Number(summary.total_leads) || 0;
    const wonCount = Number(summary.won_count) || 0;
    const conversionRate = totalLeads > 0 ? Number(((wonCount / totalLeads) * 100).toFixed(1)) : 0;

    // Stage distribution
    const stageSql = `
      SELECT l.status, COUNT(*)::int as count, COALESCE(SUM(l.value_pkr), 0)::numeric as total_value
      FROM leads l
      ${clause}
      GROUP BY l.status
      ORDER BY count DESC
    `;
    const stageRes = await query(stageSql, params);

    return {
      summary: {
        totalLeads,
        totalPipelineValuePKR: Number(summary.total_pipeline_value),
        averageDealValuePKR: Math.round(Number(summary.average_deal_value)),
        wonCount,
        lostCount: Number(summary.lost_count),
        conversionRate,
      },
      stages: stageRes.rows.map((r: any) => ({
        status: r.status,
        count: Number(r.count),
        totalValuePKR: Number(r.total_value),
      })),
      priorityBreakdown: {
        urgent: Number(summary.urgent_priority_count),
        high: Number(summary.high_priority_count),
        medium: Number(summary.medium_priority_count),
        low: Number(summary.low_priority_count),
      },
      qualityBreakdown: {
        high: Number(summary.high_quality_count),
        normal: Number(summary.normal_quality_count),
        low: Number(summary.low_quality_count),
      },
    };
  }

  /**
   * 2. Team & Staff Performance Report
   */
  public static async getTeamStaffReport(
    actor: AuthUser,
    scope: HierarchyScope,
    filters: ReportQuery
  ) {
    const { clause, params } = this.buildLeadsScopeAndFilters(actor, scope, filters, 'l');

    const staffSql = `
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.role_name as role,
        t.name as team_name,
        COUNT(l.id)::int as assigned_leads,
        COUNT(CASE WHEN l.status IN ('Won', 'Converted') THEN 1 END)::int as won_leads,
        COALESCE(SUM(l.value_pkr), 0)::numeric as total_pipeline_value,
        COALESCE(SUM(CASE WHEN l.status IN ('Won', 'Converted') THEN l.value_pkr ELSE 0 END), 0)::numeric as won_value
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN leads l ON u.id = l.assigned_to_id
      ${clause ? clause.replace(/WHERE\s+l\./g, 'AND l.').replace(/WHERE\s+\(l\./g, 'AND (l.') : ''}
      WHERE u.status = 'active'
        ${actor.role === 'Employee' ? 'AND u.id = $' + (params.length + 1) : actor.role === 'Manager' || actor.role === 'Team Lead' ? 'AND u.id = ANY($' + (params.length + 1) + '::uuid[])' : ''}
      GROUP BY u.id, u.name, u.role_name, t.name
      ORDER BY assigned_leads DESC, won_leads DESC
    `;

    const staffParams =
      actor.role === 'Employee'
        ? [...params, actor.id]
        : actor.role === 'Manager' || actor.role === 'Team Lead'
        ? [...params, [actor.id, ...(scope.subordinateUserIds || [])]]
        : params;
    const res = await query(staffSql, staffParams);

    return {
      staff: res.rows.map((r: any) => {
        const assigned = Number(r.assigned_leads) || 0;
        const won = Number(r.won_leads) || 0;
        const rate = assigned > 0 ? Number(((won / assigned) * 100).toFixed(1)) : 0;
        return {
          userId: r.user_id,
          userName: r.user_name,
          role: r.role,
          teamName: r.team_name || 'Unassigned',
          assignedLeads: assigned,
          wonLeads: won,
          conversionRate: rate,
          totalPipelineValuePKR: Number(r.total_pipeline_value),
          wonValuePKR: Number(r.won_value),
        };
      }),
    };
  }

  /**
   * 3. Follow-Ups & Activity Report
   */
  public static async getFollowUpsActivityReport(
    actor: AuthUser,
    scope: HierarchyScope,
    filters: ReportQuery
  ) {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (actor.role === 'Super Admin' || actor.role === 'Admin') {
      // Organization scope
    } else if (actor.role === 'Manager' || actor.role === 'Team Lead') {
      const allowedUsers = [actor.id, ...(scope.subordinateUserIds || [])];
      conditions.push(`fu.assigned_to_id = ANY($${idx++}::uuid[])`);
      params.push(allowedUsers);
    } else {
      conditions.push(`fu.assigned_to_id = $${idx++}`);
      params.push(actor.id);
    }

    if (filters.fromDate) {
      conditions.push(`fu.scheduled_date >= $${idx++}::date`);
      params.push(filters.fromDate);
    }
    if (filters.toDate) {
      conditions.push(`fu.scheduled_date <= $${idx++}::date`);
      params.push(filters.toDate);
    }
    if (filters.userId && filters.userId !== 'All') {
      conditions.push(`fu.assigned_to_id = $${idx++}`);
      params.push(filters.userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        COUNT(*)::int as total_follow_ups,
        COUNT(CASE WHEN fu.status = 'Completed' THEN 1 END)::int as completed_count,
        COUNT(CASE WHEN fu.status = 'Scheduled' AND fu.scheduled_date < CURRENT_DATE THEN 1 END)::int as missed_count,
        COUNT(CASE WHEN fu.status = 'Scheduled' AND fu.scheduled_date >= CURRENT_DATE THEN 1 END)::int as upcoming_count,
        COUNT(CASE WHEN fu.type = 'Call' THEN 1 END)::int as call_count,
        COUNT(CASE WHEN fu.type = 'Meeting' THEN 1 END)::int as meeting_count,
        COUNT(CASE WHEN fu.type = 'WhatsApp' THEN 1 END)::int as whatsapp_count,
        COUNT(CASE WHEN fu.type = 'Email' THEN 1 END)::int as email_count,
        COUNT(CASE WHEN fu.type = 'Demo' THEN 1 END)::int as demo_count,
        COUNT(CASE WHEN fu.type = 'Visit' THEN 1 END)::int as visit_count
      FROM follow_ups fu
      ${whereClause}
    `;

    const res = await query(sql, params);
    const r = res.rows[0];
    const total = Number(r.total_follow_ups) || 0;
    const completed = Number(r.completed_count) || 0;
    const completionRate = total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0;

    return {
      totalFollowUps: total,
      completedCount: completed,
      missedCount: Number(r.missed_count),
      upcomingCount: Number(r.upcoming_count),
      completionRate,
      byType: {
        call: Number(r.call_count),
        meeting: Number(r.meeting_count),
        whatsapp: Number(r.whatsapp_count),
        email: Number(r.email_count),
        demo: Number(r.demo_count),
        visit: Number(r.visit_count),
      },
    };
  }

  /**
   * 4. Clients & Conversions Report
   */
  public static async getClientsConversionsReport(
    actor: AuthUser,
    scope: HierarchyScope,
    filters: ReportQuery
  ) {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (actor.role === 'Super Admin' || actor.role === 'Admin') {
      // All clients
    } else if (actor.role === 'Manager' || actor.role === 'Team Lead') {
      const allowedUsers = [actor.id, ...(scope.subordinateUserIds || [])];
      conditions.push(`c.assigned_owner_id = ANY($${idx++}::uuid[])`);
      params.push(allowedUsers);
    } else {
      conditions.push(`c.assigned_owner_id = $${idx++}`);
      params.push(actor.id);
    }

    if (filters.fromDate) {
      conditions.push(`c.converted_date >= $${idx++}::date`);
      params.push(filters.fromDate);
    }
    if (filters.toDate) {
      conditions.push(`c.converted_date <= $${idx++}::date`);
      params.push(filters.toDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        COUNT(*)::int as total_clients,
        COUNT(CASE WHEN c.status = 'Active' THEN 1 END)::int as active_clients,
        COUNT(CASE WHEN c.status = 'Inactive' THEN 1 END)::int as inactive_clients,
        COUNT(CASE WHEN c.status = 'Paused' THEN 1 END)::int as paused_clients,
        COUNT(CASE WHEN c.status = 'Cancelled' THEN 1 END)::int as cancelled_clients,
        COALESCE(SUM(c.final_value_pkr), 0)::numeric as total_contract_value,
        COALESCE(AVG(c.final_value_pkr), 0)::numeric as avg_contract_value
      FROM clients c
      ${whereClause}
    `;

    const res = await query(sql, params);
    const r = res.rows[0];

    // Client list details
    const listSql = `
      SELECT c.*, to_char(c.converted_date, 'YYYY-MM-DD') as converted_date,
             u.name as owner_name, pm.name as pricing_model_name
      FROM clients c
      LEFT JOIN users u ON c.assigned_owner_id = u.id
      LEFT JOIN pricing_models pm ON c.pricing_model_id = pm.id
      ${whereClause}
      ORDER BY c.converted_date DESC
      LIMIT 50
    `;
    const listRes = await query(listSql, params);

    return {
      summary: {
        totalClients: Number(r.total_clients),
        activeClients: Number(r.active_clients),
        inactiveClients: Number(r.inactive_clients),
        pausedClients: Number(r.paused_clients),
        cancelledClients: Number(r.cancelled_clients),
        totalContractValuePKR: Number(r.total_contract_value),
        averageContractValuePKR: Math.round(Number(r.avg_contract_value)),
      },
      clients: listRes.rows,
    };
  }

  /**
   * 5. Source & Service Performance Report
   */
  public static async getSourceServiceReport(
    actor: AuthUser,
    scope: HierarchyScope,
    filters: ReportQuery
  ) {
    const { clause, params } = this.buildLeadsScopeAndFilters(actor, scope, filters, 'l');

    // Sources performance
    const sourceSql = `
      SELECT 
        l.source,
        COUNT(*)::int as total_leads,
        COUNT(CASE WHEN l.status IN ('Won', 'Converted') THEN 1 END)::int as won_count,
        COALESCE(SUM(l.value_pkr), 0)::numeric as total_value,
        COALESCE(SUM(CASE WHEN l.status IN ('Won', 'Converted') THEN l.value_pkr ELSE 0 END), 0)::numeric as won_value
      FROM leads l
      ${clause}
      GROUP BY l.source
      ORDER BY total_leads DESC
    `;
    const sourceRes = await query(sourceSql, params);

    return {
      sources: sourceRes.rows.map((r: any) => {
        const total = Number(r.total_leads) || 0;
        const won = Number(r.won_count) || 0;
        const rate = total > 0 ? Number(((won / total) * 100).toFixed(1)) : 0;
        return {
          source: r.source,
          totalLeads: total,
          wonLeads: won,
          conversionRate: rate,
          totalValuePKR: Number(r.total_value),
          wonValuePKR: Number(r.won_value),
        };
      }),
    };
  }

  /**
   * 6. Commercial & Revenue Report
   */
  public static async getCommercialRevenueReport(
    actor: AuthUser,
    scope: HierarchyScope,
    filters: ReportQuery
  ) {
    const { clause: leadClause, params: leadParams } = this.buildLeadsScopeAndFilters(
      actor,
      scope,
      filters,
      'l'
    );

    // Active Clients Realized Revenue (Scoped)
    const clientConditions: string[] = ["c.status = 'Active'"];
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

    const clientWhere = `WHERE ${clientConditions.join(' AND ')}`;

    const clientSql = `
      SELECT 
        COALESCE(SUM(c.final_value_pkr), 0)::numeric as realized_revenue,
        COUNT(*)::int as client_count
      FROM clients c
      ${clientWhere}
    `;
    const clientRes = await query(clientSql, clientParams);
    const realizedRevenue = Number(clientRes.rows[0]?.realized_revenue) || 0;
    const activeClientsCount = Number(clientRes.rows[0]?.client_count) || 0;

    // Open Pipeline Value
    const pipelineSql = `
      SELECT 
        COALESCE(SUM(l.value_pkr), 0)::numeric as pipeline_potential,
        COUNT(*)::int as open_leads_count
      FROM leads l
      ${leadClause ? leadClause + " AND l.status NOT IN ('Won', 'Lost', 'Converted')" : "WHERE l.status NOT IN ('Won', 'Lost', 'Converted')"}
    `;
    const pipelineRes = await query(pipelineSql, leadParams);
    const pipelinePotential = Number(pipelineRes.rows[0]?.pipeline_potential) || 0;
    const openLeadsCount = Number(pipelineRes.rows[0]?.open_leads_count) || 0;

    // Revenue by Pricing Model
    const pmSql = `
      SELECT 
        pm.name as pricing_model_name,
        pm.billing_type,
        COUNT(c.id)::int as client_count,
        COALESCE(SUM(c.final_value_pkr), 0)::numeric as total_revenue
      FROM clients c
      JOIN pricing_models pm ON c.pricing_model_id = pm.id
      ${clientWhere}
      GROUP BY pm.name, pm.billing_type
      ORDER BY total_revenue DESC
    `;
    const pmRes = await query(pmSql, clientParams);

    return {
      realizedRevenuePKR: realizedRevenue,
      activeClientsCount,
      pipelinePotentialPKR: pipelinePotential,
      openLeadsCount,
      byPricingModel: pmRes.rows.map((r: any) => ({
        pricingModelName: r.pricing_model_name,
        billingType: r.billing_type,
        clientCount: Number(r.client_count),
        totalRevenuePKR: Number(r.total_revenue),
      })),
    };
  }
}
