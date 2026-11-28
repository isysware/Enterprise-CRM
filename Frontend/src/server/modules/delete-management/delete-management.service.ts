import { query, getClient } from '../../database/connection';
import { AuthUser } from '../../types';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export interface DeleteCategoryItem {
  id: string;
  name: string;
  description: string;
  count: number;
  dangerLevel: 'medium' | 'high' | 'critical';
  dependenciesNote: string;
}

export class DeleteManagementService {
  /**
   * Get live counts for all deletable CRM categories
   */
  public static async getSummary(): Promise<DeleteCategoryItem[]> {
    const [
      leadsCount,
      followUpsCount,
      clientsCount,
      proposalsCount,
      incomingLeadsCount,
      activityLogsCount,
      notificationsCount,
      teamsCount,
      servicesCount,
      sourcesCount,
      pricingModelsCount,
      usersCount
    ] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*)::text as count FROM leads'),
      query<{ count: string }>('SELECT COUNT(*)::text as count FROM follow_ups'),
      query<{ count: string }>('SELECT COUNT(*)::text as count FROM clients'),
      query<{ count: string }>('SELECT COUNT(*)::text as count FROM proposals'),
      query<{ count: string }>('SELECT COUNT(*)::text as count FROM incoming_leads'),
      query<{ count: string }>('SELECT COUNT(*)::text as count FROM activity_logs'),
      query<{ count: string }>('SELECT COUNT(*)::text as count FROM notifications'),
      query<{ count: string }>('SELECT COUNT(*)::text as count FROM teams'),
      query<{ count: string }>('SELECT COUNT(*)::text as count FROM services'),
      query<{ count: string }>('SELECT COUNT(*)::text as count FROM lead_sources'),
      query<{ count: string }>('SELECT COUNT(*)::text as count FROM pricing_models'),
      query<{ count: string }>("SELECT COUNT(*)::text as count FROM users WHERE role_name != 'Super Admin'")
    ]);

    return [
      {
        id: 'leads',
        name: 'Leads & Pipeline Data',
        description: 'All customer leads, inquiry pipelines, deal values, and associated interaction activities.',
        count: parseInt(leadsCount.rows[0]?.count || '0', 10),
        dangerLevel: 'high',
        dependenciesNote: 'Cascades to lead activities & follow-ups. Clears lead links on clients & proposals.'
      },
      {
        id: 'follow_ups',
        name: 'Follow-Ups & Reminders',
        description: 'Scheduled phone calls, meetings, follow-up deadlines, and completion records.',
        count: parseInt(followUpsCount.rows[0]?.count || '0', 10),
        dangerLevel: 'medium',
        dependenciesNote: 'Safely removes follow-up schedule items without deleting underlying leads.'
      },
      {
        id: 'clients',
        name: 'Converted Clients',
        description: 'Converted client contracts, business billing values, and customer accounts.',
        count: parseInt(clientsCount.rows[0]?.count || '0', 10),
        dangerLevel: 'high',
        dependenciesNote: 'Permanently removes converted customer portfolio data.'
      },
      {
        id: 'proposals',
        name: 'Commercial Proposals',
        description: 'Quoted deliverables, milestone agreements, pricing breakdowns, and generated documents.',
        count: parseInt(proposalsCount.rows[0]?.count || '0', 10),
        dangerLevel: 'high',
        dependenciesNote: 'Deletes all draft, sent, and revised customer quotation records.'
      },
      {
        id: 'incoming_leads',
        name: 'Incoming / Webhook Leads',
        description: 'Inbound advertising inquiries captured via Meta, WhatsApp, or external webhooks.',
        count: parseInt(incomingLeadsCount.rows[0]?.count || '0', 10),
        dangerLevel: 'medium',
        dependenciesNote: 'Clears unassigned and queued webhook lead payloads.'
      },
      {
        id: 'activity_logs',
        name: 'Activity & Audit Logs',
        description: 'Historical audit trails, system event histories, and user operation activity.',
        count: parseInt(activityLogsCount.rows[0]?.count || '0', 10),
        dangerLevel: 'medium',
        dependenciesNote: 'Wipes past audit history. An immutable audit record of this purge will be created immediately.'
      },
      {
        id: 'notifications',
        name: 'System Notifications',
        description: 'In-app notification alerts, follow-up reminders, and assignment banners.',
        count: parseInt(notificationsCount.rows[0]?.count || '0', 10),
        dangerLevel: 'medium',
        dependenciesNote: 'Clears read and unread notification alerts for all users.'
      },
      {
        id: 'teams',
        name: 'Teams & Departments',
        description: 'Sales teams, internal business divisions, and team member allocations.',
        count: parseInt(teamsCount.rows[0]?.count || '0', 10),
        dangerLevel: 'high',
        dependenciesNote: 'Clears team memberships and unlinks assigned team from users and leads.'
      },
      {
        id: 'services',
        name: 'Catalog Services',
        description: 'Standard product offerings, solutions catalog, and baseline rates.',
        count: parseInt(servicesCount.rows[0]?.count || '0', 10),
        dangerLevel: 'medium',
        dependenciesNote: 'Deletes product service catalog items.'
      },
      {
        id: 'lead_sources',
        name: 'Lead Acquisition Sources',
        description: 'Configured advertising sources, landing page referrers, and marketing channels.',
        count: parseInt(sourcesCount.rows[0]?.count || '0', 10),
        dangerLevel: 'medium',
        dependenciesNote: 'Unlinks source references on existing leads and deletes sources.'
      },
      {
        id: 'pricing_models',
        name: 'Pricing Models & Schemas',
        description: 'Commercial billing templates, custom frequency formulas, and dynamic proposal input fields.',
        count: parseInt(pricingModelsCount.rows[0]?.count || '0', 10),
        dangerLevel: 'high',
        dependenciesNote: 'Unlinks pricing model associations across services, leads, and clients.'
      },
      {
        id: 'users',
        name: 'Operational Users (Admin, Manager, Team Lead, Employee)',
        description: 'Permanently removes non-Super Admin user accounts and revokes their active sessions.',
        count: parseInt(usersCount.rows[0]?.count || '0', 10),
        dangerLevel: 'critical',
        dependenciesNote: 'PROTECTED: Super Admin accounts, core Roles/RBAC definitions, and system structure are NEVER deleted.'
      }
    ];
  }

  /**
   * Execute permanent deletion for selected categories in a single atomic transaction
   */
  public static async purgeCategories(
    categories: string[],
    actor: AuthUser
  ): Promise<{ success: boolean; message: string; purgedCategories: string[]; summary: DeleteCategoryItem[] }> {
    if (actor.role !== 'Super Admin') {
      throw AppError.forbidden('Strict Security Violation: Only Super Admin is authorized to purge CRM data.');
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      throw AppError.badRequest('At least one data category must be selected for deletion.');
    }

    const validCategoryIds = new Set([
      'leads',
      'follow_ups',
      'clients',
      'proposals',
      'incoming_leads',
      'activity_logs',
      'notifications',
      'teams',
      'services',
      'lead_sources',
      'pricing_models',
      'users'
    ]);

    const sanitizedCategories = categories.filter(c => validCategoryIds.has(c));
    if (sanitizedCategories.length === 0) {
      throw AppError.badRequest('No valid data categories provided.');
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Leads
      if (sanitizedCategories.includes('leads')) {
        await client.query('DELETE FROM lead_activities');
        await client.query('DELETE FROM follow_ups');
        await client.query('UPDATE clients SET originating_lead_id = NULL');
        await client.query('UPDATE proposals SET lead_id = NULL');
        await client.query('UPDATE incoming_leads SET converted_lead_id = NULL');
        await client.query('DELETE FROM leads');
      }

      // 2. Follow-ups (if not already deleted with leads)
      if (sanitizedCategories.includes('follow_ups') && !sanitizedCategories.includes('leads')) {
        await client.query('DELETE FROM follow_ups');
      }

      // 3. Clients
      if (sanitizedCategories.includes('clients')) {
        await client.query('DELETE FROM clients');
      }

      // 4. Proposals
      if (sanitizedCategories.includes('proposals')) {
        await client.query('DELETE FROM proposals');
      }

      // 5. Incoming Leads
      if (sanitizedCategories.includes('incoming_leads')) {
        await client.query('DELETE FROM incoming_leads');
      }

      // 6. Notifications
      if (sanitizedCategories.includes('notifications')) {
        await client.query('DELETE FROM notifications');
      }

      // 7. Teams
      if (sanitizedCategories.includes('teams')) {
        await client.query('UPDATE users SET team_id = NULL');
        await client.query('UPDATE leads SET team_id = NULL');
        await client.query('UPDATE teams SET manager_id = NULL, team_lead_id = NULL');
        await client.query('DELETE FROM team_memberships');
        await client.query('DELETE FROM teams');
      }

      // 8. Services
      if (sanitizedCategories.includes('services')) {
        await client.query('DELETE FROM services');
      }

      // 9. Lead Sources
      if (sanitizedCategories.includes('lead_sources')) {
        await client.query('UPDATE leads SET source_id = NULL');
        await client.query('DELETE FROM lead_sources');
      }

      // 10. Pricing Models
      if (sanitizedCategories.includes('pricing_models')) {
        await client.query('UPDATE services SET pricing_model_id = NULL');
        await client.query('UPDATE leads SET pricing_model_id = NULL');
        await client.query('UPDATE clients SET pricing_model_id = NULL');
        await client.query('DELETE FROM pricing_models');
      }

      // 11. Operational Users (NEVER Super Admin, NEVER core roles/permissions)
      if (sanitizedCategories.includes('users')) {
        const nonSuperAdminFilter = "role_name != 'Super Admin'";
        await client.query(`DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`DELETE FROM team_memberships WHERE user_id IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`UPDATE teams SET manager_id = NULL WHERE manager_id IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`UPDATE teams SET team_lead_id = NULL WHERE team_lead_id IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`UPDATE users SET manager_id = NULL WHERE manager_id IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`UPDATE users SET team_lead_id = NULL WHERE team_lead_id IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`DELETE FROM follow_ups WHERE assigned_to_id IN (SELECT id FROM users WHERE ${nonSuperAdminFilter}) OR created_by IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`UPDATE leads SET assigned_to_id = NULL WHERE assigned_to_id IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`UPDATE leads SET created_by = NULL WHERE created_by IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`UPDATE clients SET assigned_owner_id = NULL WHERE assigned_owner_id IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`UPDATE clients SET closed_by_id = NULL WHERE closed_by_id IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`UPDATE proposals SET assigned_rep_id = NULL WHERE assigned_rep_id IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`UPDATE proposals SET created_by = NULL WHERE created_by IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`UPDATE incoming_leads SET assigned_user_id = NULL WHERE assigned_user_id IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`UPDATE lead_activities SET actor_id = NULL WHERE actor_id IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`UPDATE role_permissions SET changed_by = NULL WHERE changed_by IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`UPDATE settings SET updated_by = NULL WHERE updated_by IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`UPDATE integration_connections SET updated_by = NULL WHERE updated_by IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`UPDATE activity_logs SET actor_id = NULL WHERE actor_id IN (SELECT id FROM users WHERE ${nonSuperAdminFilter})`);
        await client.query(`DELETE FROM users WHERE ${nonSuperAdminFilter}`);
      }

      // 12. Activity Logs
      if (sanitizedCategories.includes('activity_logs')) {
        await client.query('DELETE FROM activity_logs');
      }

      // 13. Create an immutable audit log record for this purge
      await client.query(
        `INSERT INTO activity_logs (
          actor_id, actor_name, actor_role, action, entity_type, entity_id, entity_title, details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
        [
          actor.id,
          actor.name,
          actor.role,
          'PERMANENT_DATA_PURGE',
          'SYSTEM_MAINTENANCE',
          'delete-management',
          `Permanently purged data categories: ${sanitizedCategories.join(', ')}`,
          JSON.stringify({
            purgedCategories: sanitizedCategories,
            purgedAt: new Date().toISOString(),
            executedBy: actor.email,
            role: actor.role
          })
        ]
      );

      await client.query('COMMIT');
      logger.info(`Super Admin ${actor.email} purged categories: ${sanitizedCategories.join(', ')}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to execute delete management transaction; rolled back entirely:', error);
      throw error;
    } finally {
      client.release();
    }

    const updatedSummary = await this.getSummary();
    return {
      success: true,
      message: `Successfully purged data for categories: ${sanitizedCategories.join(', ')}.`,
      purgedCategories: sanitizedCategories,
      summary: updatedSummary
    };
  }
}
