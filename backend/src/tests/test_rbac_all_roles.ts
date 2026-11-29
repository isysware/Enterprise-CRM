import assert from 'assert';
import { LeadsService } from '../modules/leads/leads.service';
import { FollowUpsService } from '../modules/follow-ups/follow-ups.service';
import { ReportsService } from '../modules/reports/reports.service';
import { AiAssistantService } from '../modules/ai/ai.service';
import { RbacService } from '../services/rbac.service';
import { PostgresUserRepository } from '../repositories/postgres.user.repository';
import { postgresRolePermissionRepository } from '../repositories/postgres.role-permission.repository';
import { getDatabasePool, query } from '../database/connection';
import { AuthUser, UserRole, AccountStatus } from '../types';

async function runRbacTests() {
  console.log('--- Starting Comprehensive 5-Role RBAC & Scope Verification ---');

  const userRepo = new PostgresUserRepository();

  // 1. Fetch users from DB
  const [usersRes, teamsRes] = await Promise.all([
    query<{
      id: string;
      name: string;
      email: string;
      role_name: string;
      team_id: string | null;
      manager_id: string | null;
      team_lead_id: string | null;
      status: string;
    }>(
      "SELECT u.id, u.name, u.email, r.name as role_name, u.team_id, u.manager_id, u.team_lead_id, u.status FROM users u JOIN roles r ON u.role_id = r.id WHERE u.status != 'inactive'"
    ),
    query<{ id: string; manager_id: string | null; team_lead_id: string | null; status: string }>(
      "SELECT id, manager_id, team_lead_id, status FROM teams WHERE status = 'active'"
    ),
  ]);

  const orgUsers: AuthUser[] = usersRes.rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role_name as UserRole,
    status: r.status as AccountStatus,
    isActive: r.status === 'active',
    teamId: r.team_id || undefined,
    managerId: r.manager_id || undefined,
    teamLeadId: r.team_lead_id || undefined,
    createdAt: new Date().toISOString(),
  }));

  const orgTeams = teamsRes.rows.map((r) => ({
    id: r.id,
    managerId: r.manager_id || undefined,
    leaderId: r.team_lead_id || undefined,
  }));

  const dynamicMatrix = await postgresRolePermissionRepository.getAllRolePermissions();

  const superAdminUser = orgUsers.find((u) => u.role === 'Super Admin')!;
  const managerUser = orgUsers.find((u) => u.role === 'Manager')!;
  const teamLeadUser = orgUsers.find((u) => u.role === 'Team Lead')!;
  const employeeUser = orgUsers.find((u) => u.role === 'Employee')!;

  // Synthetic Admin user if none in DB
  const adminUser: AuthUser = {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@isysware.test',
    name: 'Test Admin',
    role: 'Admin',
    status: 'active',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const superAdminScope = RbacService.getHierarchyScope(superAdminUser, orgUsers, orgTeams);
  const adminScope = RbacService.getHierarchyScope(adminUser, orgUsers, orgTeams);
  const managerScope = RbacService.getHierarchyScope(managerUser, orgUsers, orgTeams);
  const teamLeadScope = RbacService.getHierarchyScope(teamLeadUser, orgUsers, orgTeams);
  const employeeScope = RbacService.getHierarchyScope(employeeUser, orgUsers, orgTeams);

  const superAdminPerms = RbacService.getEffectivePermissions('Super Admin', dynamicMatrix);
  const adminPerms = RbacService.getEffectivePermissions('Admin', dynamicMatrix);
  const managerPerms = RbacService.getEffectivePermissions('Manager', dynamicMatrix);
  const teamLeadPerms = RbacService.getEffectivePermissions('Team Lead', dynamicMatrix);
  const employeePerms = RbacService.getEffectivePermissions('Employee', dynamicMatrix);

  // The Manager's personally assigned lead:
  const managerLeadId = '3ab8f1c8-d039-49b2-a8d3-51d4e185f90e';
  // Employee lead:
  const employeeLeadId = 'ae3ae167-eb10-4f07-9b49-e23dec27bcc3';

  console.log('\n[TEST 1] Team Lead MUST NOT see Manager personally assigned lead');
  const tlLeads = await LeadsService.listLeads(teamLeadUser, teamLeadScope, {
    page: 1,
    limit: 50,
    sortBy: 'created_at',
    sortOrder: 'desc' as any,
  }, teamLeadPerms);
  const tlSawManagerLead = tlLeads.items.some((l) => l.id === managerLeadId);
  assert.strictEqual(tlSawManagerLead, false, 'FAILED: Team Lead should not see Manager personal lead in list');
  console.log('✓ PASS: Team Lead does NOT see Manager lead in listLeads');

  console.log('\n[TEST 2] Team Lead getLeadById on Manager lead MUST throw 403 Forbidden');
  let tlGetForbidden = false;
  try {
    await LeadsService.getLeadById(teamLeadUser, teamLeadScope, managerLeadId, teamLeadPerms);
  } catch (err: any) {
    if (err.statusCode === 403) tlGetForbidden = true;
  }
  assert.strictEqual(tlGetForbidden, true, 'FAILED: Team Lead getLeadById on Manager lead should be 403 Forbidden');
  console.log('✓ PASS: Team Lead getLeadById on Manager lead threw 403 Forbidden');

  console.log('\n[TEST 3] Team Lead updateLead on Manager lead MUST throw 403 Forbidden');
  let tlUpdateForbidden = false;
  try {
    await LeadsService.updateLead(teamLeadUser, teamLeadScope, managerLeadId, { notes: 'Illegal edit attempt' }, teamLeadPerms);
  } catch (err: any) {
    if (err.statusCode === 403) tlUpdateForbidden = true;
  }
  assert.strictEqual(tlUpdateForbidden, true, 'FAILED: Team Lead updateLead on Manager lead should be 403 Forbidden');
  console.log('✓ PASS: Team Lead updateLead on Manager lead threw 403 Forbidden');

  console.log('\n[TEST 4] Team Lead createFollowUp on Manager lead MUST throw 403 Forbidden');
  let tlFollowUpForbidden = false;
  try {
    await FollowUpsService.createFollowUp(teamLeadUser, teamLeadScope, {
      leadId: managerLeadId,
      scheduledDate: '2026-12-01',
      scheduledTime: '10:00',
      type: 'Call',
    }, teamLeadPerms);
  } catch (err: any) {
    if (err.statusCode === 403) tlFollowUpForbidden = true;
  }
  assert.strictEqual(tlFollowUpForbidden, true, 'FAILED: Team Lead createFollowUp on Manager lead should be 403 Forbidden');
  console.log('✓ PASS: Team Lead createFollowUp on Manager lead threw 403 Forbidden');

  console.log('\n[TEST 5] Super Admin CAN see all leads including Manager lead');
  const saLeads = await LeadsService.listLeads(superAdminUser, superAdminScope, {
    page: 1,
    limit: 50,
    sortBy: 'created_at',
    sortOrder: 'desc' as any,
  }, superAdminPerms);
  const saSawManagerLead = saLeads.items.some((l) => l.id === managerLeadId);
  assert.strictEqual(saSawManagerLead, true, 'FAILED: Super Admin must see Manager lead');
  console.log('✓ PASS: Super Admin sees all leads');

  console.log('\n[TEST 6] Admin CAN see all operational leads including Manager lead');
  const adminLeads = await LeadsService.listLeads(adminUser, adminScope, {
    page: 1,
    limit: 50,
    sortBy: 'created_at',
    sortOrder: 'desc' as any,
  }, adminPerms);
  const adminSawManagerLead = adminLeads.items.some((l) => l.id === managerLeadId);
  assert.strictEqual(adminSawManagerLead, true, 'FAILED: Admin must see Manager lead');
  console.log('✓ PASS: Admin sees operational leads');

  console.log('\n[TEST 7] Manager CAN see their own lead and subordinate employee lead');
  const mLeads = await LeadsService.listLeads(managerUser, managerScope, {
    page: 1,
    limit: 50,
    sortBy: 'created_at',
    sortOrder: 'desc' as any,
  }, managerPerms);
  const mSawOwnLead = mLeads.items.some((l) => l.id === managerLeadId);
  const mSawEmpLead = mLeads.items.some((l) => l.id === employeeLeadId);
  assert.strictEqual(mSawOwnLead, true, 'FAILED: Manager must see own lead');
  assert.strictEqual(mSawEmpLead, true, 'FAILED: Manager must see subordinate employee lead');
  console.log('✓ PASS: Manager sees own lead and subordinate employee lead');

  console.log('\n[TEST 8] Employee CANNOT see Manager lead, CAN see self-assigned lead');
  const empLeads = await LeadsService.listLeads(employeeUser, employeeScope, {
    page: 1,
    limit: 50,
    sortBy: 'created_at',
    sortOrder: 'desc' as any,
  }, employeePerms);
  const empSawManagerLead = empLeads.items.some((l) => l.id === managerLeadId);
  const empSawOwnLead = empLeads.items.some((l) => l.id === employeeLeadId);
  assert.strictEqual(empSawManagerLead, false, 'FAILED: Employee must NOT see Manager lead');
  assert.strictEqual(empSawOwnLead, true, 'FAILED: Employee must see own assigned lead');
  console.log('✓ PASS: Employee sees only own assigned leads');

  console.log('\n[TEST 9] Reports Service Scoping Check');
  const tlReport = await ReportsService.getSalesPipelineReport(teamLeadUser, teamLeadScope, {});
  const mReport = await ReportsService.getSalesPipelineReport(managerUser, managerScope, {});
  assert(tlReport.summary.totalLeads < mReport.summary.totalLeads, `Team Lead reports (${tlReport.summary.totalLeads}) must exclude Manager personal lead compared to Manager (${mReport.summary.totalLeads})`);
  console.log(`✓ PASS: Reports service correctly isolates Team Lead (${tlReport.summary.totalLeads} leads) from Manager personal leads (${mReport.summary.totalLeads} leads)`);

  console.log('\n[TEST 10] AI Copilot Scoping Check');
  const tlAiResp = await AiAssistantService.processRequest(teamLeadUser, teamLeadScope, {
    prompt: 'How many total leads do I have?',
    contextScope: 'dashboard',
  });
  assert(tlAiResp.answer, 'AI Copilot must produce an authorized response');
  if (tlAiResp.insights) {
    assert.strictEqual(tlAiResp.insights.totalScopedLeads, 2, 'Team Lead AI totalScopedLeads must be exactly 2 (excluding Manager personal lead)');
    assert(tlAiResp.insights.totalScopedLeads < mReport.summary.totalLeads, 'Team Lead AI totalScopedLeads must be less than Manager total leads');
    console.log(`✓ PASS: AI Copilot scoped snapshot for Team Lead reflects only ${tlAiResp.insights.totalScopedLeads} authorized leads`);
  }

  console.log('\n[TEST 11] Explicit Dynamic Matrix Authorization Test');
  // If Super Admin explicitly grants canViewAllLeads to Team Lead in dynamic matrix:
  const explicitlyAuthorizedTLPerms = { ...teamLeadPerms, canViewAllLeads: true };
  const authorizedTLLeads = await LeadsService.listLeads(teamLeadUser, teamLeadScope, {
    page: 1,
    limit: 50,
    sortBy: 'created_at',
    sortOrder: 'desc' as any,
  }, explicitlyAuthorizedTLPerms);
  const authorizedTLSawManagerLead = authorizedTLLeads.items.some((l) => l.id === managerLeadId);
  assert.strictEqual(authorizedTLSawManagerLead, true, 'When explicitly authorized via dynamic matrix, Team Lead can view all leads');
  console.log('✓ PASS: Explicit dynamic permissions grant works as designed without breaking organizational defaults');

  console.log('\n--- All 11 Comprehensive Verification Tests PASSED Successfully! ---');
}

runRbacTests()
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    const p = getDatabasePool();
    await p.end();
  });
