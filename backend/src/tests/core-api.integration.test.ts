import assert from 'assert';
import crypto from 'crypto';
import { query, closeDatabasePool } from '../database/connection';
import { PasswordService } from '../services/password.service';
import { UsersService } from '../modules/users/users.service';
import { RolesService } from '../modules/roles/roles.service';
import { TeamsService } from '../modules/teams/teams.service';
import { ServicesService } from '../modules/services/services.service';
import { LeadSourcesService } from '../modules/lead-sources/lead-sources.service';
import { PricingModelsService } from '../modules/pricing-models/pricing-models.service';
import { LeadsService } from '../modules/leads/leads.service';
import { IncomingLeadsService } from '../modules/incoming-leads/incoming-leads.service';
import { FollowUpsService } from '../modules/follow-ups/follow-ups.service';
import { ClientsService } from '../modules/clients/clients.service';
import { ProposalsService } from '../modules/proposals/proposals.service';
import { ActivityLogsService } from '../modules/activity-logs/activity-logs.service';
import { ReportsService } from '../modules/reports/reports.service';
import { AiAssistantService } from '../modules/ai/ai.service';
import { MetaIntegrationService } from '../modules/integrations/meta/meta.service';
import { WhatsAppIntegrationService } from '../modules/integrations/whatsapp/whatsapp.service';
import { AuthUser, HierarchyScope } from '../types';
import { AppError } from '../utils/AppError';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

const test = async (name: string, fn: () => Promise<void> | void) => {
  try {
    await fn();
    console.log(`${GREEN}✅ PASS:${RESET} ${name}`);
    passed++;
  } catch (err) {
    console.error(`${RED}❌ FAIL:${RESET} ${name}`);
    console.error(err);
    failed++;
  }
};

const runCoreApiTests = async () => {
  console.log('\n======================================================');
  console.log('🧪 ENTERPRISE CRM CORE CRM APIs INTEGRATION TEST SUITE');
  console.log('======================================================\n');

  const ts = Date.now();

  // 1. Resolve or establish a valid Super Admin in database
  const saRes = await query<{ id: string; name: string; email: string }>(
    `SELECT id, name, email FROM users WHERE role_name = 'Super Admin' LIMIT 1`
  );

  let realSuperAdminId: string;
  let superAdminName = 'Bootstrap Super Admin';
  let superAdminEmail = 'superadmin@isysware.com';

  if (saRes.rows.length > 0) {
    realSuperAdminId = saRes.rows[0].id;
    superAdminName = saRes.rows[0].name;
    superAdminEmail = saRes.rows[0].email;
  } else {
    const roleRes = await query<{ id: string }>(`SELECT id FROM roles WHERE name = 'Super Admin' LIMIT 1`);
    const roleId = roleRes.rows[0].id;
    const hash = await PasswordService.hash('SuperAdminPass123!');
    const newSa = await query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, role_id, role_name, status)
       VALUES ($1, $2, $3, $4, 'Super Admin', 'active') RETURNING id`,
      [superAdminName, superAdminEmail, hash, roleId]
    );
    realSuperAdminId = newSa.rows[0].id;
  }

  const superAdminUser: AuthUser = {
    id: realSuperAdminId,
    name: superAdminName,
    email: superAdminEmail,
    role: 'Super Admin',
    status: 'active',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  // Mutable test actor identities with real UUIDs populated as users are created
  let adminUser: AuthUser = {
    id: crypto.randomUUID(),
    name: 'Temporary Admin',
    email: `tmp_admin_${ts}@isysware.com`,
    role: 'Admin',
    status: 'active',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  let employeeUser: AuthUser = {
    id: crypto.randomUUID(),
    name: 'Temporary Rep A',
    email: `tmp_rep_a_${ts}@isysware.com`,
    role: 'Employee',
    status: 'active',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  let employeeUserB: AuthUser = {
    id: crypto.randomUUID(),
    name: 'Temporary Rep B',
    email: `tmp_rep_b_${ts}@isysware.com`,
    role: 'Employee',
    status: 'active',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const globalScope: HierarchyScope = {
    subordinateUserIds: [],
    managedTeamIds: [],
  };

  const employeeScope: HierarchyScope = {
    subordinateUserIds: [],
    managedTeamIds: [],
  };

  // Tracking IDs for cleanup
  let createdAdminId = '';
  let createdRepId = '';
  let createdRepBId = '';
  let teamId = '';
  let teamBId = '';
  let pricingModelId = '';
  let serviceId = '';
  let leadSourceId = '';
  let leadId = '';
  let incomingLeadId = '';
  let followUpId = '';
  let clientId = '';
  let proposalId = '';

  try {
    // -------------------------------------------------------------------------
    // 1. Users Module & Protected Invariants
    // -------------------------------------------------------------------------
    await test('UsersService: Super Admin creates Admin account successfully', async () => {
      const created = await UsersService.createUser(superAdminUser, {
        name: 'Regional Admin',
        email: `reg_admin_${ts}@isysware.com`,
        password: 'Password123!',
        role: 'Admin',
      });
      assert(created.id, 'Created user must have UUID');
      assert.strictEqual(created.role, 'Admin');
      createdAdminId = created.id;

      // Update adminUser with authentic DB record
      adminUser = {
        id: created.id,
        name: created.name,
        email: created.email,
        role: 'Admin',
        status: 'active',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
    });

    await test('UsersService: Admin CANNOT create Admin or Super Admin (negative flow)', async () => {
      await assert.rejects(
        async () => {
          await UsersService.createUser(adminUser, {
            name: 'Malicious Admin',
            email: `mal_admin_${ts}@isysware.com`,
            password: 'Password123!',
            role: 'Admin',
          });
        },
        (err: Error) => err instanceof AppError && err.statusCode === 403
      );
    });

    await test('UsersService: Admin can create operational Employee accounts', async () => {
      const repA = await UsersService.createUser(adminUser, {
        name: 'Direct Sales Rep A',
        email: `sales_rep_a_${ts}@isysware.com`,
        password: 'Password123!',
        role: 'Employee',
      });
      assert(repA.id);
      assert.strictEqual(repA.role, 'Employee');
      createdRepId = repA.id;

      employeeUser = {
        id: repA.id,
        name: repA.name,
        email: repA.email,
        role: 'Employee',
        status: 'active',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const repB = await UsersService.createUser(adminUser, {
        name: 'Direct Sales Rep B',
        email: `sales_rep_b_${ts}@isysware.com`,
        password: 'Password123!',
        role: 'Employee',
      });
      assert(repB.id);
      createdRepBId = repB.id;

      employeeUserB = {
        id: repB.id,
        name: repB.name,
        email: repB.email,
        role: 'Employee',
        status: 'active',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
    });

    await test('UsersService: Admin CANNOT modify or deactivate Admin account (negative flow)', async () => {
      await assert.rejects(
        async () => {
          await UsersService.updateUserStatus(adminUser, createdAdminId, { status: 'inactive' });
        },
        (err: Error) => err instanceof AppError && err.statusCode === 403
      );
    });

    await test('UsersService: Super Admin can update status and reset password of Admin', async () => {
      const updated = await UsersService.updateUserStatus(superAdminUser, createdAdminId, {
        status: 'restricted',
      });
      assert.strictEqual(updated.status, 'restricted');

      // Re-activate admin for subsequent test operations
      await UsersService.updateUserStatus(superAdminUser, createdAdminId, {
        status: 'active',
      });

      await UsersService.resetPassword(superAdminUser, createdAdminId, {
        newPassword: 'NewSecurePass123!',
      });
    });

    // -------------------------------------------------------------------------
    // 2. Roles & Permissions Module
    // -------------------------------------------------------------------------
    await test('RolesService: getRoles returns 5 canonical roles', async () => {
      const roles = await RolesService.getRoles();
      assert.strictEqual(roles.length, 5);
      const names = roles.map((r) => r.name);
      assert(names.includes('Super Admin'));
      assert(names.includes('Admin'));
      assert(names.includes('Manager'));
      assert(names.includes('Team Lead'));
      assert(names.includes('Employee'));
    });

    await test('RolesService: Super Admin can dynamically update and reset permissions', async () => {
      const updated = await RolesService.updateCapability(superAdminUser, 'Employee', {
        capability: 'canViewReports',
        isGranted: true,
      });
      assert.strictEqual(updated.canViewReports, true);

      // Reset to canonical defaults
      const resetMatrices = await RolesService.resetToDefaults(superAdminUser);
      const empMatrix = resetMatrices.find((m) => m.role === 'Employee');
      assert.strictEqual(empMatrix?.canViewReports, false);
    });

    await test('RolesService: Reserved Super Admin capabilities cannot be granted to lower roles', async () => {
      await assert.rejects(
        async () => {
          await RolesService.updateCapability(superAdminUser, 'Admin', {
            capability: 'canManageRoles',
            isGranted: true,
          });
        },
        (err: Error) => err instanceof AppError && err.statusCode === 403
      );
    });

    // -------------------------------------------------------------------------
    // 3. Teams & Team Memberships
    // -------------------------------------------------------------------------
    await test('TeamsService: Create team and add primary member', async () => {
      const team = await TeamsService.createTeam(superAdminUser, {
        name: `Enterprise Pod_${ts}`,
        code: `POD_${ts}`,
        description: 'Primary B2B Sales Unit',
      });
      assert(team.id);
      teamId = team.id;

      const mem = await TeamsService.addMember(superAdminUser, teamId, {
        userId: createdRepId,
        isPrimary: true,
      });
      assert(mem);
      assert.strictEqual(mem.team_id, teamId);
      assert.strictEqual(mem.user_id, createdRepId);
      assert.strictEqual(mem.is_primary, true);
    });

    await test('TeamsService: Prevent duplicate active primary membership (constraint check)', async () => {
      const teamB = await TeamsService.createTeam(superAdminUser, {
        name: `Secondary Pod_${ts}`,
        code: `PODB_${ts}`,
      });
      teamBId = teamB.id;

      await assert.rejects(
        async () => {
          await TeamsService.addMember(superAdminUser, teamBId, {
            userId: createdRepId,
            isPrimary: true, // Violates one active primary team per user
          });
        },
        (err: Error) => err instanceof AppError && err.statusCode === 400
      );

      // Secondary membership succeeds
      const secMem = await TeamsService.addMember(superAdminUser, teamBId, {
        userId: createdRepId,
        isPrimary: false,
      });
      assert(secMem);
      assert.strictEqual(secMem.is_primary, false);
    });

    // -------------------------------------------------------------------------
    // 4. Catalogs & Pricing Models
    // -------------------------------------------------------------------------
    await test('PricingModelsService: Create dynamic pricing model', async () => {
      const pm = await PricingModelsService.createPricingModel(superAdminUser, {
        name: `Software Retainer_${ts}`,
        billingType: 'recurring-monthly',
        description: 'Monthly recurring development fee',
        isActive: true,
        isDefault: true,
        defaultValues: {},
        fieldSchema: [
          {
            key: 'tier',
            label: 'Support Tier',
            type: 'select',
            options: ['Basic', 'Premium', 'Enterprise'],
            defaultValue: 'Basic',
            required: true,
            includeInTotal: true,
          },
        ],
      });
      assert(pm.id);
      pricingModelId = pm.id;
    });

    await test('ServicesService: Create service linked to pricing model', async () => {
      const s = await ServicesService.createService(superAdminUser, {
        name: `Custom Cloud Architecture_${ts}`,
        category: 'Consulting',
        defaultPricePKR: 450000,
        pricingModelId,
        isActive: true,
      });
      assert(s.id);
      serviceId = s.id;
    });

    await test('LeadSourcesService: Create active lead source', async () => {
      const src = await LeadSourcesService.createSource(superAdminUser, {
        name: `Direct Referral_${ts}`,
        description: 'Client organic referrals',
        isActive: true,
      });
      assert(src.id);
      leadSourceId = src.id;
    });

    // -------------------------------------------------------------------------
    // 5. Leads Module & Organizational Scoping
    // -------------------------------------------------------------------------
    await test('LeadsService: Create lead with activity and audit logging', async () => {
      const lead = await LeadsService.createLead(employeeUser, {
        name: 'Bilal Khan',
        businessName: 'Apex Logistics Ltd',
        phone: '+923009998877',
        email: 'bilal@apexlogistics.com',
        city: 'Lahore',
        source: 'Website',
        sourceId: leadSourceId,
        valuePKR: 650000,
        status: 'New',
        priority: 'High',
        assignedToId: employeeUser.id,
        serviceIds: [serviceId],
      });

      assert(lead.id);
      assert.strictEqual(lead.status, 'New');
      assert.strictEqual(lead.assigned_to_id, employeeUser.id);
      leadId = lead.id;

      // Verify activity auto-created
      const details = await LeadsService.getLeadById(employeeUser, employeeScope, leadId);
      assert(details.activities.length >= 1, 'Initial creation activity must be logged');
    });

    await test('LeadsService: Status change lifecycle records activity', async () => {
      const updated = await LeadsService.changeStatus(employeeUser, employeeScope, leadId, {
        status: 'Contacted',
        notes: 'Initial discovery call conducted with Bilal',
      });
      assert.strictEqual(updated.status, 'Contacted');

      const details = await LeadsService.getLeadById(employeeUser, employeeScope, leadId);
      const act = details.activities.find((a: any) => a.title.includes('Contacted') || a.type.includes('Status'));
      assert(act, 'Status change activity must be present');
    });

    await test('LeadsService: Organizational scope blocks unauthorized employee access (negative flow)', async () => {
      // Rep B attempts to view Rep A's private lead
      await assert.rejects(
        async () => {
          await LeadsService.getLeadById(employeeUserB, employeeScope, leadId);
        },
        (err: Error) => err instanceof AppError && err.statusCode === 403
      );
    });

    // -------------------------------------------------------------------------
    // 6. Incoming Leads & Deduplication Workflow
    // -------------------------------------------------------------------------
    await test('IncomingLeadsService: Ingest new incoming lead', async () => {
      const inc = await IncomingLeadsService.ingestLead({
        source: 'Meta Lead Ads',
        externalId: `meta_${ts}`,
        contactData: { full_name: 'Tariq Mehmood', phone_number: '+923211122334' },
        campaignData: {},
        status: 'Pending',
      });
      assert(inc.id);
      assert.strictEqual(inc.status, 'Pending');
      incomingLeadId = inc.id;
    });

    await test('IncomingLeadsService: Deduplication rejects identical source & external_id', async () => {
      await assert.rejects(
        async () => {
          await IncomingLeadsService.ingestLead({
            source: 'Meta Lead Ads',
            externalId: `meta_${ts}`, // Identical externalId
            contactData: {},
            campaignData: {},
            status: 'Pending',
          });
        },
        (err: Error) => err instanceof AppError && err.statusCode === 409
      );
    });

    await test('IncomingLeadsService: Convert incoming lead into full CRM lead in transaction', async () => {
      const result = await IncomingLeadsService.assignAndConvertToLead(adminUser, incomingLeadId, {
        assignedUserId: createdRepId,
        leadName: 'Tariq Mehmood',
        phone: '+923211122334',
        valuePKR: 350000,
        notes: 'Promoted from Facebook campaign lead ad',
      });

      assert(result.leadId);
      assert.strictEqual(result.incomingLead.status, 'Converted');
      assert.strictEqual(result.incomingLead.converted_lead_id, result.leadId);

      // Verify the new lead exists in leads table
      const createdCrmLead = await LeadsService.getLeadById(superAdminUser, globalScope, result.leadId);
      assert.strictEqual(createdCrmLead.name, 'Tariq Mehmood');

      // Clean up converted lead
      await query('DELETE FROM leads WHERE id = $1', [result.leadId]);
    });

    // -------------------------------------------------------------------------
    // 7. Follow-Ups Module & Date Semantics
    // -------------------------------------------------------------------------
    const todayStr = new Date().toISOString().split('T')[0];

    await test('FollowUpsService: Schedule follow-up with local date semantics', async () => {
      const fu = await FollowUpsService.createFollowUp(employeeUser, {
        leadId,
        scheduledDate: todayStr,
        scheduledTime: '15:30',
        type: 'Call',
        notes: 'Follow up regarding pricing proposal approval',
      });
      assert(fu.id);
      assert.strictEqual(fu.scheduled_date, todayStr);
      assert.strictEqual(fu.status, 'Scheduled');
      followUpId = fu.id;

      // Verify lead next follow-up date was synchronized
      const lead = await LeadsService.getLeadById(employeeUser, employeeScope, leadId);
      assert.strictEqual(lead.next_follow_up_date, todayStr);
    });

    await test('FollowUpsService: Complete follow-up and record outcome', async () => {
      const completed = await FollowUpsService.completeFollowUp(employeeUser, employeeScope, followUpId, {
        resultOutcome: 'Client agreed to move forward with proposal',
      });
      assert.strictEqual(completed.status, 'Completed');
      assert.strictEqual(completed.result_outcome, 'Client agreed to move forward with proposal');
    });

    // -------------------------------------------------------------------------
    // 8. Clients Module & Controlled Reversal
    // -------------------------------------------------------------------------
    await test('ClientsService: Convert lead into client in atomic transaction', async () => {
      const client = await ClientsService.convertLeadToClient(superAdminUser, {
        leadId,
        businessName: 'Apex Logistics Ltd',
        contactName: 'Bilal Khan',
        phone: '+923009998877',
        email: 'bilal@apexlogistics.com',
        city: 'Lahore',
        finalValuePKR: 650000,
        pricingModelId,
        servicesSnapshot: [],
      });

      assert(client.id);
      assert.strictEqual(client.business_name, 'Apex Logistics Ltd');
      assert.strictEqual(client.status, 'Active');
      clientId = client.id;

      // Originating lead must be marked Converted
      const lead = await LeadsService.getLeadById(superAdminUser, globalScope, leadId);
      assert.strictEqual(lead.status, 'Converted');
    });

    await test('ClientsService: Controlled Reversal returns client to lead stage', async () => {
      const res = await ClientsService.revertClient(superAdminUser, globalScope, clientId, {
        reason: 'Client requested contract review before onboarding',
        revertLeadStatusTo: 'Qualified',
      });

      assert.strictEqual(res.client.status, 'Inactive');

      // Verify originating lead status reverted
      const lead = await LeadsService.getLeadById(superAdminUser, globalScope, leadId);
      assert.strictEqual(lead.status, 'Qualified');
    });

    // -------------------------------------------------------------------------
    // 9. Proposals Module
    // -------------------------------------------------------------------------
    const propNumber = `PROP-${ts}`;

    await test('ProposalsService: Create proposal with line items and letterhead snapshot', async () => {
      const prop = await ProposalsService.createProposal(employeeUser, {
        leadId,
        proposalNumber: propNumber,
        issueDate: todayStr,
        totalPKR: 650000,
        discountPKR: 0,
        taxPKR: 0,
        status: 'Draft',
        clientSnapshot: {},
        milestones: [],
        scopeDeliverables: 'Full Enterprise CRM and Logistics Automation Deployment',
        lineItems: [
          {
            name: 'Core System Setup',
            quantity: 1,
            unitPricePKR: 450000,
            totalPKR: 450000,
          },
          {
            name: 'Annual Support SLA',
            quantity: 1,
            unitPricePKR: 200000,
            totalPKR: 200000,
          },
        ],
        letterheadSnapshot: {
          companyName: 'iSysware Software Solutions',
          phone: '+92 42 111 000 000',
        },
      });

      assert(prop.id);
      assert.strictEqual(prop.proposal_number, propNumber);
      assert.strictEqual(prop.status, 'Draft');
      proposalId = prop.id;
    });

    await test('ProposalsService: Duplicate proposal number rejected with conflict', async () => {
      await assert.rejects(
        async () => {
          await ProposalsService.createProposal(employeeUser, {
            leadId,
            proposalNumber: propNumber, // Duplicate
            issueDate: todayStr,
            totalPKR: 0,
            discountPKR: 0,
            taxPKR: 0,
            status: 'Draft',
            clientSnapshot: {},
            milestones: [],
            lineItems: [],
          });
        },
        (err: Error) => err instanceof AppError && err.statusCode === 409
      );
    });

    await test('ProposalsService: Update proposal status to Sent and Accepted', async () => {
      const sent = await ProposalsService.updateStatus(employeeUser, employeeScope, proposalId, {
        status: 'Sent',
      });
      assert.strictEqual(sent.status, 'Sent');

      const accepted = await ProposalsService.updateStatus(employeeUser, employeeScope, proposalId, {
        status: 'Accepted',
      });
      assert.strictEqual(accepted.status, 'Accepted');
    });

    // -------------------------------------------------------------------------
    // 10. Activity Logs Verification
    // -------------------------------------------------------------------------
    await test('ActivityLogsService: Audit trail logs authenticated actor mutations', async () => {
      const logs = await ActivityLogsService.listLogs({ limit: 20 });
      assert(logs.items.length > 0, 'Audit logs must be recorded');

      const leadAudit = logs.items.find((l) => l.entity_type === 'LEAD');
      assert(leadAudit, 'Lead creation/modification audit entry must exist');
      assert(leadAudit.actor_name, 'Actor name must be recorded from authenticated session');
    });

    // -------------------------------------------------------------------------
    // 11. Reports Module Verification
    // -------------------------------------------------------------------------
    await test('ReportsService: Sales & Pipeline report aggregates accurately within scope', async () => {
      const globalReport = await ReportsService.getSalesPipelineReport(superAdminUser, globalScope, {});
      assert(typeof globalReport.summary.totalLeads === 'number');
      assert(Array.isArray(globalReport.stages));
      assert(globalReport.priorityBreakdown);
      assert(globalReport.qualityBreakdown);

      // Employee scoped report
      const empReport = await ReportsService.getSalesPipelineReport(employeeUser, employeeScope, {});
      assert(typeof empReport.summary.totalLeads === 'number');
    });

    await test('ReportsService: Team & Staff performance report generates user metrics', async () => {
      const staffReport = await ReportsService.getTeamStaffReport(superAdminUser, globalScope, {});
      assert(Array.isArray(staffReport.staff));
      assert(staffReport.staff.length > 0);
      assert(staffReport.staff[0].userName);
    });

    await test('ReportsService: Follow-ups, Clients, Source/Service, Commercial reports generate successfully', async () => {
      const fuReport = await ReportsService.getFollowUpsActivityReport(superAdminUser, globalScope, {});
      assert(typeof fuReport.totalFollowUps === 'number');
      assert(fuReport.byType);

      const clientsReport = await ReportsService.getClientsConversionsReport(superAdminUser, globalScope, {});
      assert(typeof clientsReport.summary.totalClients === 'number');

      const srcReport = await ReportsService.getSourceServiceReport(superAdminUser, globalScope, {});
      assert(Array.isArray(srcReport.sources));

      const commReport = await ReportsService.getCommercialRevenueReport(superAdminUser, globalScope, {});
      assert(typeof commReport.realizedRevenuePKR === 'number');
      assert(Array.isArray(commReport.byPricingModel));
    });

    // -------------------------------------------------------------------------
    // 12. AI Assistant (Internal CRM Copilot) Tests
    // -------------------------------------------------------------------------
    await test('AiAssistantService: Answers operational pipeline summary within authorized scope', async () => {
      const resp = await AiAssistantService.processRequest(superAdminUser, globalScope, {
        prompt: 'Give me a pipeline summary',
      });
      assert(resp.answer.includes('Pipeline Summary'));
      assert(resp.insights);
      assert.strictEqual(resp.source, 'internal_crm_database');
    });

    await test('AiAssistantService: Obey hard organizational scope (Employee sees self-assigned only)', async () => {
      const resp = await AiAssistantService.processRequest(employeeUser, employeeScope, {
        prompt: "Show today's leads",
      });
      assert(resp.answer);
      assert(typeof resp.insights?.totalScopedLeads === 'number');
      // Employee with 1 lead sees totalScopedLeads === 1
      assert.strictEqual(resp.insights?.totalScopedLeads, 1);
    });

    await test('AiAssistantService: Mutation requests do not silently execute and require confirmation', async () => {
      const resp = await AiAssistantService.processRequest(employeeUser, employeeScope, {
        prompt: 'Change status of lead to Won',
      });
      assert(resp.actionProposal, 'Mutation request must produce action proposal');
      assert.strictEqual(resp.actionProposal.requiresConfirmation, true);
      assert.strictEqual(resp.actionProposal.actionType, 'CHANGE_STATUS');
      assert(resp.answer.includes('cannot be altered automatically'));
    });

    await test('AiAssistantService: Inactive account is rejected (negative flow)', async () => {
      const inactiveUser: AuthUser = {
        ...employeeUser,
        status: 'inactive',
        isActive: false,
      };
      await assert.rejects(
        async () => {
          await AiAssistantService.processRequest(inactiveUser, employeeScope, {
            prompt: 'Summary',
          });
        },
        (err: Error) => err instanceof AppError && err.statusCode === 403
      );
    });

    // -------------------------------------------------------------------------
    // 13. Meta Lead Ads Integration Groundwork Tests
    // -------------------------------------------------------------------------
    await test('MetaIntegrationService: getStatus returns safe state without fake connected session', async () => {
      const status = await MetaIntegrationService.getStatus();
      assert.strictEqual(status.provider, 'meta');
      assert(['disconnected', 'configured', 'pending'].includes(status.status));
    });

    await test('MetaIntegrationService: configure saves page details and logs audit entry', async () => {
      const config = await MetaIntegrationService.configure(superAdminUser, {
        appId: '1234567890',
        pageId: 'page_987654321',
        pageName: 'iSysware Official Page',
        webhookVerifyToken: 'secure_verify_token_123',
        subscribedForms: ['form_001', 'form_002'],
      });
      assert.strictEqual(config.pageId, 'page_987654321');
      assert.strictEqual(config.subscribedFormsCount, 2);
    });

    await test('MetaIntegrationService: verifyWebhook rejects invalid tokens and verifies valid token', async () => {
      // Negative flow
      await assert.rejects(
        async () => {
          await MetaIntegrationService.verifyWebhook('subscribe', 'wrong_token', 'challenge_abc');
        },
        (err: Error) => err instanceof AppError && err.statusCode === 403
      );

      // Positive flow
      const challenge = await MetaIntegrationService.verifyWebhook(
        'subscribe',
        'secure_verify_token_123',
        'challenge_12345'
      );
      assert.strictEqual(challenge, 'challenge_12345');
    });

    await test('MetaIntegrationService: ingestWebhookEvent creates incoming lead and deduplicates idempotently', async () => {
      const metaLeadId = `meta_lead_${ts}`;
      const payload = {
        entry: [
          {
            id: 'page_987654321',
            changes: [
              {
                field: 'leadgen',
                value: {
                  leadgen_id: metaLeadId,
                  page_id: 'page_987654321',
                  form_id: 'form_001',
                  field_data: [
                    { name: 'full_name', values: ['Meta Test User'] },
                    { name: 'email', values: ['metauser@example.com'] },
                    { name: 'phone_number', values: ['+923005554433'] },
                  ],
                },
              },
            ],
          },
        ],
      };

      // Ingest event
      const res1 = await MetaIntegrationService.ingestWebhookEvent(payload);
      assert.strictEqual(res1.processed, 1);
      assert.strictEqual(res1.duplicates, 0);

      // Idempotent duplicate ingestion
      const res2 = await MetaIntegrationService.ingestWebhookEvent(payload);
      assert.strictEqual(res2.processed, 0);
      assert.strictEqual(res2.duplicates, 1);

      // Clean up incoming lead
      await query("DELETE FROM incoming_leads WHERE source = 'Meta Lead Ads' AND external_id = $1", [
        metaLeadId,
      ]);
    });

    // -------------------------------------------------------------------------
    // 14. WhatsApp Integration Groundwork Tests
    // -------------------------------------------------------------------------
    await test('WhatsAppIntegrationService: getStatus returns safe status without fake session', async () => {
      const status = await WhatsAppIntegrationService.getStatus();
      assert.strictEqual(status.provider, 'whatsapp');
      assert(['disconnected', 'qr_ready', 'connecting', 'connected'].includes(status.status));
    });

    await test('WhatsAppIntegrationService: initSession initializes session request', async () => {
      const session = await WhatsAppIntegrationService.initSession(superAdminUser);
      assert.strictEqual(session.status, 'qr_ready');
    });

    await test('WhatsAppIntegrationService: sendMessage records interaction and enforces employee scope', async () => {
      // Positive flow: Rep A sends message to assigned lead
      const sent = await WhatsAppIntegrationService.sendMessage(employeeUser, employeeScope, {
        leadId,
        recipientPhone: '+923009998877',
        messageText: 'Hello Bilal, following up on your proposal',
      });
      assert(sent.messageId);
      assert.strictEqual(sent.leadId, leadId);

      // Negative flow: Rep B attempts to send WhatsApp message to Rep A's lead
      await assert.rejects(
        async () => {
          await WhatsAppIntegrationService.sendMessage(employeeUserB, employeeScope, {
            leadId,
            recipientPhone: '+923009998877',
            messageText: 'Unauthorized message attempt',
          });
        },
        (err: Error) => err instanceof AppError && err.statusCode === 403
      );
    });

    await test('WhatsAppIntegrationService: handleInboundMessage associates with existing lead or ingests incoming lead', async () => {
      // Inbound from known phone -> associates with existing lead
      const inboundKnown = await WhatsAppIntegrationService.handleInboundMessage({
        messageId: `wa_in_${ts}_1`,
        senderPhone: '+923009998877',
        senderName: 'Bilal Khan',
        messageText: 'Yes, I received the proposal. Thanks!',
      });
      assert.strictEqual(inboundKnown.status, 'associated_with_lead');

      // Inbound from unknown phone -> ingests into incoming_leads table
      const inboundUnknown = await WhatsAppIntegrationService.handleInboundMessage({
        messageId: `wa_in_${ts}_2`,
        senderPhone: '+923991122334',
        senderName: 'New Contact',
        messageText: 'Hello, I want to know about your CRM services',
      });
      assert.strictEqual(inboundUnknown.status, 'ingested_as_incoming_lead');

      // Clean up created incoming lead
      await query("DELETE FROM incoming_leads WHERE source = 'WhatsApp' AND external_id = $1", [
        `wa_in_${ts}_2`,
      ]);
    });
    if (proposalId) await query('DELETE FROM proposals WHERE id = $1', [proposalId]);
    if (clientId) await query('DELETE FROM clients WHERE id = $1', [clientId]);
    if (followUpId) await query('DELETE FROM follow_ups WHERE id = $1', [followUpId]);
    if (leadId) await query('DELETE FROM leads WHERE id = $1', [leadId]);
    if (incomingLeadId) await query('DELETE FROM incoming_leads WHERE id = $1', [incomingLeadId]);
    if (serviceId) await query('DELETE FROM services WHERE id = $1', [serviceId]);
    if (pricingModelId) await query('DELETE FROM pricing_models WHERE id = $1', [pricingModelId]);
    if (leadSourceId) await query('DELETE FROM lead_sources WHERE id = $1', [leadSourceId]);
    if (teamId) await query('DELETE FROM teams WHERE id = $1', [teamId]);
    if (teamBId) await query('DELETE FROM teams WHERE id = $1', [teamBId]);
    if (createdRepBId) await query('DELETE FROM users WHERE id = $1', [createdRepBId]);
    if (createdRepId) await query('DELETE FROM users WHERE id = $1', [createdRepId]);
    if (createdAdminId) await query('DELETE FROM users WHERE id = $1', [createdAdminId]);
  } finally {
    await closeDatabasePool();
  }

  console.log('\n======================================================');
  console.log(`Summary: ${passed} passed, ${failed} failed.`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runCoreApiTests();
