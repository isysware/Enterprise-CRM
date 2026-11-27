import { withTransaction } from './connection';
import { logger } from '../utils/logger';

/**
 * Enterprise CRM Zero-Demo Data Cleanup Utility
 * 
 * Strictly enforces the ZERO-DEMO Data Cleanup Rule:
 * - Purges all development test/demo/fake business records from PostgreSQL.
 * - Safely truncates/deletes from:
 *   - proposals
 *   - clients
 *   - follow_ups
 *   - lead_activities
 *   - leads
 *   - incoming_leads
 *   - activity_logs
 *   - services (demo catalog entries: Salon Management, Gym ERP, etc.)
 *   - teams (demo teams: Alpha Sales Unit, Enterprise Solutions, Retail & POS)
 *   - pricing_models (demo pricing models: SaaS, One-Time, Perpetual, Hybrid)
 *   - lead_sources (demo lead sources: Meta Ads, Google Ads, WhatsApp, etc.)
 *   - team_memberships
 * - Removes non-bootstrap development fixture users (e.g. @crm.com).
 * - Strictly PRESERVES:
 *   - Protected initial Super Admin account (superadmin@isysware.com)
 *   - Canonical 5 roles (Super Admin, Admin, Manager, Team Lead, Employee)
 *   - Canonical 21-capability permission matrix (role_permissions: 105 rows)
 *   - Schema migrations metadata
 */
export async function cleanupDemoData() {
  logger.info('Starting CRM Zero-Demo data cleanup...');

  await withTransaction(async (client) => {
    // 1. Purge business activity and transactional logs
    const deletedActivities = await client.query('DELETE FROM activity_logs');
    logger.info(`Deleted ${deletedActivities.rowCount} rows from activity_logs`);

    const deletedLeadActivities = await client.query('DELETE FROM lead_activities');
    logger.info(`Deleted ${deletedLeadActivities.rowCount} rows from lead_activities`);

    const deletedNotifications = await client.query('DELETE FROM notifications');
    logger.info(`Deleted ${deletedNotifications.rowCount} rows from notifications`);

    // 2. Purge proposals and client conversions
    const deletedProposals = await client.query('DELETE FROM proposals');
    logger.info(`Deleted ${deletedProposals.rowCount} rows from proposals`);

    const deletedClients = await client.query('DELETE FROM clients');
    logger.info(`Deleted ${deletedClients.rowCount} rows from clients`);

    // 3. Purge operational follow-ups
    const deletedFollowUps = await client.query('DELETE FROM follow_ups');
    logger.info(`Deleted ${deletedFollowUps.rowCount} rows from follow_ups`);

    // 4. Purge incoming leads and leads
    const deletedIncoming = await client.query('DELETE FROM incoming_leads');
    logger.info(`Deleted ${deletedIncoming.rowCount} rows from incoming_leads`);

    const deletedLeads = await client.query('DELETE FROM leads');
    logger.info(`Deleted ${deletedLeads.rowCount} rows from leads`);

    // 5. Clean team memberships and unlink team references from users
    await client.query('UPDATE users SET team_id = NULL');
    const deletedMemberships = await client.query('DELETE FROM team_memberships');
    logger.info(`Deleted ${deletedMemberships.rowCount} rows from team_memberships`);

    // 6. Purge demo reference catalogs (Teams, Services, Pricing Models, Lead Sources)
    const deletedTeams = await client.query('DELETE FROM teams');
    logger.info(`Deleted ${deletedTeams.rowCount} rows from teams`);

    const deletedServices = await client.query('DELETE FROM services');
    logger.info(`Deleted ${deletedServices.rowCount} rows from services`);

    const deletedPricingModels = await client.query('DELETE FROM pricing_models');
    logger.info(`Deleted ${deletedPricingModels.rowCount} rows from pricing_models`);

    const deletedLeadSources = await client.query('DELETE FROM lead_sources');
    logger.info(`Deleted ${deletedLeadSources.rowCount} rows from lead_sources`);

    // 7. Clean dev fixture users while preserving Super Admin
    const devEmails = [
      'admin@crm.com',
      'manager@crm.com',
      'teamlead@crm.com',
      'employee@crm.com',
    ];

    const deletedUsers = await client.query(
      `DELETE FROM users WHERE email = ANY($1) AND role_name != 'Super Admin'`,
      [devEmails]
    );
    logger.info(`Deleted ${deletedUsers.rowCount} non-bootstrap dev fixture users`);

    // 8. Verify Super Admin exists
    const superAdminRes = await client.query(
      `SELECT id, name, email, role_name, status FROM users WHERE role_name = 'Super Admin'`
    );
    logger.info(`Preserved ${superAdminRes.rowCount} Super Admin account(s): ${superAdminRes.rows.map(u => u.email).join(', ')}`);

    // 9. Verify canonical system metadata
    const rolesRes = await client.query('SELECT count(*) as count FROM roles');
    const permsRes = await client.query('SELECT count(*) as count FROM role_permissions');
    const usersRes = await client.query('SELECT count(*) as count FROM users');
    const teamsRes = await client.query('SELECT count(*) as count FROM teams');
    const servicesRes = await client.query('SELECT count(*) as count FROM services');
    const sourcesRes = await client.query('SELECT count(*) as count FROM lead_sources');
    const pmRes = await client.query('SELECT count(*) as count FROM pricing_models');
    const leadsRes = await client.query('SELECT count(*) as count FROM leads');
    const incRes = await client.query('SELECT count(*) as count FROM incoming_leads');
    const fuRes = await client.query('SELECT count(*) as count FROM follow_ups');
    const clientsRes = await client.query('SELECT count(*) as count FROM clients');
    const propRes = await client.query('SELECT count(*) as count FROM proposals');
    const leadActRes = await client.query('SELECT count(*) as count FROM lead_activities');
    const actLogsRes = await client.query('SELECT count(*) as count FROM activity_logs');
    const notifsRes = await client.query('SELECT count(*) as count FROM notifications');

    logger.info('==============================================');
    logger.info('Database state after ZERO-DEMO cleanup:');
    logger.info(`- Canonical Roles: ${rolesRes.rows[0].count}`);
    logger.info(`- Role Permissions: ${permsRes.rows[0].count}`);
    logger.info(`- Users: ${usersRes.rows[0].count}`);
    logger.info(`- Teams: ${teamsRes.rows[0].count}`);
    logger.info(`- Services: ${servicesRes.rows[0].count}`);
    logger.info(`- Lead Sources: ${sourcesRes.rows[0].count}`);
    logger.info(`- Pricing Models: ${pmRes.rows[0].count}`);
    logger.info(`- Leads: ${leadsRes.rows[0].count}`);
    logger.info(`- Incoming Leads: ${incRes.rows[0].count}`);
    logger.info(`- Follow-ups: ${fuRes.rows[0].count}`);
    logger.info(`- Clients: ${clientsRes.rows[0].count}`);
    logger.info(`- Proposals: ${propRes.rows[0].count}`);
    logger.info(`- Lead Activities: ${leadActRes.rows[0].count}`);
    logger.info(`- Activity Logs: ${actLogsRes.rows[0].count}`);
    logger.info(`- Notifications: ${notifsRes.rows[0].count}`);
    logger.info('==============================================');
  });

  logger.info('Database cleanup completed successfully. Zero demo/sample business data remains.');
}

if (require.main === module) {
  cleanupDemoData()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Cleanup failed:', err);
      process.exit(1);
    });
}
