/**
 * ENTERPRISE CRM - PHASE 2 FRONTEND API CUTOVER E2E VERIFICATION SCRIPT
 * Tests all migrated Phase 2 operational endpoints end-to-end against live Express server & PostgreSQL
 */

import http from 'http';
import { app } from '../app';
import { query, closeDatabasePool } from '../database/connection';
import { TokenService } from '../services/token.service';

const PORT = 5098;
let server: http.Server;

interface ApiResponse<T = any> {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: {
    success: boolean;
    message?: string;
    data?: T;
    error?: any;
  };
  cookies: string[];
}

function makeRequest(
  method: string,
  path: string,
  body?: any,
  cookieHeader?: string
): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : undefined;
    const headers: http.OutgoingHttpHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const req = http.request(
      {
        host: '127.0.0.1',
        port: PORT,
        method,
        path,
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = rawData ? JSON.parse(rawData) : {};
            const setCookieHeader = res.headers['set-cookie'] || [];
            resolve({
              statusCode: res.statusCode || 0,
              headers: res.headers,
              body: parsed,
              cookies: Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader],
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode || 0,
              headers: res.headers,
              body: { success: false, message: rawData },
              cookies: [],
            });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function extractCookie(cookies: string[], name: string): string | undefined {
  for (const c of cookies) {
    if (c.startsWith(`${name}=`)) {
      return c.split(';')[0];
    }
  }
  return undefined;
}

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failedTests++;
  }
}

async function runPhase2CutoverVerification() {
  console.log('\n======================================================');
  console.log('🚀 ENTERPRISE CRM PHASE 2 CUTOVER E2E LIVE TEST SUITE');
  console.log('======================================================\n');

  await new Promise<void>((resolve) => {
    server = app.listen(PORT, '127.0.0.1', () => {
      console.log(`Test server listening on port ${PORT}`);
      resolve();
    });
  });

  let leadId: string | undefined;
  let fuId: string | undefined;
  let incomingLeadId: string | undefined;
  let clientId: string | undefined;
  let propId: string | undefined;

  try {
    // 1. Health endpoint exposes safe status only
    const healthRes = await makeRequest('GET', '/api/v1/health');
    assert(healthRes.statusCode === 200, 'Health endpoint returns 200 OK');
    assert(healthRes.body.data?.status === 'healthy', 'Health status reports healthy');
    assert(!healthRes.body.data?.serverVersion, 'Health endpoint exposes safe status without leaking serverVersion');

    // 2. Auth: Live HTTP Login with Super Admin account
    const superAdminEmail = process.env.BOOTSTRAP_SUPERADMIN_EMAIL?.toLowerCase().trim() || 'superadmin@isysware.com';
    const superAdminPassword = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD;
    if (!superAdminPassword) {
      throw new Error('BOOTSTRAP_SUPERADMIN_PASSWORD environment variable is required for verification.');
    }
    const loginRes = await makeRequest('POST', '/api/v1/auth/login', {
      email: superAdminEmail,
      password: superAdminPassword,
    });
    assert(loginRes.statusCode === 200, 'Super Admin login returns HTTP 200');
    assert(loginRes.body.data?.user?.email === superAdminEmail, 'Login returned Super Admin user record');

    const accessTokenCookie = extractCookie(loginRes.cookies, 'crm_access_token');
    const refreshTokenCookie = extractCookie(loginRes.cookies, 'crm_refresh_token');
    assert(Boolean(accessTokenCookie), 'Login returned HttpOnly crm_access_token cookie');
    const authCookieHeader = [accessTokenCookie, refreshTokenCookie].filter(Boolean).join('; ');

    // 3. Auth: GET /auth/me restores session from HttpOnly cookie
    const meRes = await makeRequest('GET', '/api/v1/auth/me', undefined, authCookieHeader);
    assert(meRes.statusCode === 200, 'GET /auth/me returns HTTP 200');
    assert(meRes.body.data?.user?.role === 'Super Admin', 'Session restored as Super Admin with correct capabilities');

    // 4. Reference Catalogs Live Check
    const srvRes = await makeRequest('GET', '/api/v1/services', undefined, authCookieHeader);
    assert(srvRes.statusCode === 200, 'GET /services returns HTTP 200');
    const services = srvRes.body.data || [];
    assert(Array.isArray(services), 'Services catalog is an array');

    const srcRes = await makeRequest('GET', '/api/v1/sources', undefined, authCookieHeader);
    assert(srcRes.statusCode === 200, 'GET /sources returns HTTP 200');

    const usersRes = await makeRequest('GET', '/api/v1/users', undefined, authCookieHeader);
    assert(usersRes.statusCode === 200, 'GET /users returns HTTP 200');
    const userList = Array.isArray(usersRes.body.data) ? usersRes.body.data : usersRes.body.data?.users || [];
    const repUser = userList[0];
    assert(Boolean(repUser?.id), 'Users list returned valid assignee user');

    // 5. Leads: Create Lead
    const newLeadPayload = {
      name: 'Phase 2 Test Lead',
      businessName: 'Phase 2 Tech Systems',
      phone: '+92 300 9876543',
      email: 'phase2lead@example.com',
      city: 'Islamabad',
      serviceSnapshot: ['Custom CRM Development'],
      valuePKR: 175000,
      status: 'New',
      quality: 'High',
      priority: 'High',
      source: 'Website',
      assignedToId: repUser?.id || null,
      notes: 'Phase 2 Cutover automated test lead',
      tags: ['Phase2', 'AutomatedTest'],
      nextFollowUpDate: '2026-11-28',
      nextFollowUpTime: '11:00',
    };
    const createLeadRes = await makeRequest('POST', '/api/v1/leads', newLeadPayload, authCookieHeader);
    assert(createLeadRes.statusCode === 201, 'POST /leads creates new lead (HTTP 201)');
    const createdLead = createLeadRes.body.data;
    assert(Boolean(createdLead?.id), 'Created lead has valid UUID id');
    leadId = createdLead?.id;

    // 6. Leads: List and Search Leads
    const listLeadsRes = await makeRequest('GET', `/api/v1/leads?search=${encodeURIComponent('Phase 2')}`, undefined, authCookieHeader);
    assert(listLeadsRes.statusCode === 200, 'GET /leads?search=Phase+2 returns HTTP 200');
    const leadItems = listLeadsRes.body.data?.items || listLeadsRes.body.data?.leads || [];
    assert(leadItems.some((l: any) => l.id === leadId), 'Search returns newly created lead');

    // 7. Leads: Status Lifecycle change
    const statusRes = await makeRequest('PATCH', `/api/v1/leads/${leadId}/status`, {
      status: 'Qualified',
      notes: 'Lead qualified after discovery call',
    }, authCookieHeader);
    assert(statusRes.statusCode === 200, 'PATCH /leads/:id/status updates lead stage to Qualified');

    // 8. Leads: Add Activity
    const actRes = await makeRequest('POST', `/api/v1/leads/${leadId}/activities`, {
      type: 'Call',
      title: 'Discovery Phone Call',
      notes: 'Discussed project scope and timelines',
      outcome: 'Qualified',
    }, authCookieHeader);
    assert(actRes.statusCode === 201, 'POST /leads/:id/activities logs lead activity');

    // 9. Follow-Ups: Schedule Follow-Up
    const fuPayload = {
      leadId: leadId,
      clientBusinessSnapshot: 'Phase 2 Tech Systems',
      phone: '+92 300 9876543',
      scheduledDate: '2026-11-29',
      scheduledTime: '15:30',
      type: 'Meeting',
      notes: 'Online demo presentation',
    };
    const createFuRes = await makeRequest('POST', '/api/v1/follow-ups', fuPayload, authCookieHeader);
    assert(createFuRes.statusCode === 201, 'POST /follow-ups schedules follow-up (HTTP 201)');
    fuId = createFuRes.body.data?.id;
    assert(Boolean(fuId), 'Follow-up created with valid UUID');

    // 10. Follow-Ups: Reschedule Follow-Up
    const reschedRes = await makeRequest('PATCH', `/api/v1/follow-ups/${fuId}/reschedule`, {
      scheduledDate: '2026-11-30',
      scheduledTime: '16:00',
      reason: 'Client requested postponement',
    }, authCookieHeader);
    assert(reschedRes.statusCode === 200, 'PATCH /follow-ups/:id/reschedule reschedules date/time');

    // 11. Follow-Ups: Complete Follow-Up
    const completeFuRes = await makeRequest('PATCH', `/api/v1/follow-ups/${fuId}/complete`, {
      resultOutcome: 'Demo successfully conducted, proceeding to contract',
    }, authCookieHeader);
    assert(completeFuRes.statusCode === 200, 'PATCH /follow-ups/:id/complete marks follow-up done');

    // 12. Incoming Leads: Ingest via Webhook/API
    const incPayload = {
      source: 'meta_ads',
      externalId: `ext-phase2-${Date.now()}`,
      contactData: {
        name: 'Sara Khan',
        phone: '+92 321 5551234',
        email: 'sara@fashionstudio.pk',
      },
      campaignData: {
        campaignName: 'Winter Software Sale',
        adName: 'Salon Management Hero',
      },
      interestedService: 'Salon Management System',
    };
    const incRes = await makeRequest('POST', '/api/v1/incoming-leads', incPayload, authCookieHeader);
    assert(incRes.statusCode === 201, 'POST /incoming-leads ingests new incoming lead');
    incomingLeadId = incRes.body.data?.id;

    // 13. Incoming Leads: List and Assign & Convert to CRM Lead
    const listIncRes = await makeRequest('GET', '/api/v1/incoming-leads', undefined, authCookieHeader);
    assert(listIncRes.statusCode === 200, 'GET /incoming-leads lists incoming leads');

    const assignIncRes = await makeRequest('POST', `/api/v1/incoming-leads/${incomingLeadId}/assign`, {
      assignedUserId: repUser.id,
      leadName: 'Sara Khan',
      phone: '+92 321 5551234',
      valuePKR: 85000,
      notes: 'Assigned from Meta Ads ingestion',
    }, authCookieHeader);
    assert(assignIncRes.statusCode === 201, 'POST /incoming-leads/:id/assign converts to CRM lead');

    // 14. Clients: Convert Lead to Client Account
    const convertLeadRes = await makeRequest('POST', '/api/v1/clients/convert-lead', {
      leadId: leadId,
      businessName: 'Phase 2 Tech Systems Client Profile',
      contactName: 'Phase 2 Tech Lead Contact',
      phone: '+92 300 9876543',
      email: 'client@phase2tech.com',
      city: 'Islamabad',
      servicesSnapshot: ['Custom CRM Development'],
      source: 'Website',
      finalValuePKR: 175000,
      assignedOwnerId: repUser.id,
      termsDetails: 'Standard annual maintenance terms',
    }, authCookieHeader);
    assert(convertLeadRes.statusCode === 201, 'POST /clients/convert-lead converts lead to client');
    clientId = convertLeadRes.body.data?.id;
    assert(Boolean(clientId), 'Client record created with valid UUID');

    // 15. Clients: List Clients
    const listClientsRes = await makeRequest('GET', '/api/v1/clients', undefined, authCookieHeader);
    assert(listClientsRes.statusCode === 200, 'GET /clients returns HTTP 200');
    const clientItems = listClientsRes.body.data?.items || listClientsRes.body.data?.clients || [];
    assert(clientItems.some((c: any) => c.id === clientId), 'Client list contains newly converted client');

    // 16. Clients: Controlled Reversal back to Lead
    const revertClientRes = await makeRequest('POST', `/api/v1/clients/${clientId}/revert`, {
      reason: 'Contract negotiation reopened by client',
      revertLeadStatusTo: 'Follow-Up Required',
    }, authCookieHeader);
    assert(revertClientRes.statusCode === 200, 'POST /clients/:id/revert returns client to lead stage');

    // 17. Proposals: Create Proposal
    const proposalPayload = {
      leadId: leadId,
      proposalNumber: `PROP-P2-${Date.now().toString().slice(-4)}`,
      issueDate: '2026-11-26',
      expiryDate: '2026-12-10',
      clientSnapshot: {
        clientName: 'Phase 2 Tech Systems',
        contactName: 'Tariq Mehmood',
        phone: '+92 300 9876543',
        email: 'tariq@phase2tech.com',
      },
      assignedRepId: repUser.id,
      scopeDeliverables: 'Full custom enterprise sales CRM deployment',
      lineItems: [
        {
          name: 'Core System Deployment',
          description: 'PostgreSQL DB, Node Express backend and Next.js frontend',
          quantity: 1,
          unitPricePKR: 120000,
          totalPKR: 120000,
        },
        {
          name: 'Staff Training & Onboarding',
          description: '4 hours training for sales team and managers',
          quantity: 1,
          unitPricePKR: 35000,
          totalPKR: 35000,
        },
      ],
      discountPKR: 5000,
      taxPKR: 0,
      totalPKR: 150000,
      terms: 'Payment 50% advance, 50% upon deployment',
      status: 'Draft',
    };
    const createPropRes = await makeRequest('POST', '/api/v1/proposals', proposalPayload, authCookieHeader);
    assert(createPropRes.statusCode === 201, 'POST /proposals creates new proposal');
    propId = createPropRes.body.data?.id;

    // 18. Proposals: Update Proposal Status to Sent
    const updatePropStatusRes = await makeRequest('PATCH', `/api/v1/proposals/${propId}/status`, {
      status: 'Sent',
    }, authCookieHeader);
    assert(updatePropStatusRes.statusCode === 200, 'PATCH /proposals/:id/status updates status to Sent');

    // 19. Activity Logs: Query System Audit Trail
    const logsRes = await makeRequest('GET', '/api/v1/activity-logs?limit=10', undefined, authCookieHeader);
    assert(logsRes.statusCode === 200, 'GET /activity-logs returns HTTP 200');
    const logs = logsRes.body.data?.items || logsRes.body.data?.logs || [];
    assert(Array.isArray(logs) && logs.length > 0, 'Audit trail contains recorded actions');

    // 20. Reports: Verify all 6 Reporting Families
    const reports = [
      'sales-pipeline',
      'team-staff',
      'follow-ups',
      'clients-conversions',
      'source-service',
      'commercial-revenue',
    ];
    for (const r of reports) {
      const repRes = await makeRequest('GET', `/api/v1/reports/${r}`, undefined, authCookieHeader);
      assert(repRes.statusCode === 200, `GET /reports/${r} returns HTTP 200`);
      assert(repRes.body.success === true, `Report ${r} has valid success payload`);
    }

    // 21. Notifications: Query Live User Notifications from PostgreSQL
    const notifRes = await makeRequest('GET', '/api/v1/notifications', undefined, authCookieHeader);
    assert(notifRes.statusCode === 200, 'GET /notifications returns HTTP 200');
    assert(Array.isArray(notifRes.body.data?.items), 'Notifications data is array');
    assert(typeof notifRes.body.data?.unreadCount === 'number', 'Unread count is numeric');

    // 22. Auth: Logout
    const logoutRes = await makeRequest('POST', '/api/v1/auth/logout', {}, authCookieHeader);
    assert(logoutRes.statusCode === 200, 'POST /auth/logout returns HTTP 200');

    // 23. Verification after logout: Protected route returns 401
    const postLogoutRes = await makeRequest('GET', '/api/v1/leads');
    assert(postLogoutRes.statusCode === 401, 'Unauthenticated request correctly rejected with 401');

    console.log('\n======================================================');
    console.log(`Phase 2 Live E2E Summary: ${passedTests} passed, ${failedTests} failed.`);
    console.log('======================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    }
  } finally {
    try {
      if (typeof propId !== 'undefined') await query('DELETE FROM proposals WHERE id = $1', [propId]);
      if (typeof clientId !== 'undefined') await query('DELETE FROM clients WHERE id = $1', [clientId]);
      if (typeof fuId !== 'undefined') await query('DELETE FROM follow_ups WHERE id = $1', [fuId]);
      if (typeof leadId !== 'undefined') {
        await query('DELETE FROM lead_activities WHERE lead_id = $1', [leadId]);
        await query('DELETE FROM leads WHERE id = $1', [leadId]);
      }
      await query("DELETE FROM lead_activities WHERE lead_id IN (SELECT id FROM leads WHERE phone = '+92 321 5551234')");
      await query("DELETE FROM leads WHERE phone = '+92 321 5551234'");
      if (typeof incomingLeadId !== 'undefined') {
        await query('DELETE FROM incoming_leads WHERE id = $1', [incomingLeadId]);
      }
      await query("DELETE FROM activity_logs WHERE details::text LIKE '%Phase 2%' OR details::text LIKE '%AutomatedTest%'");
    } catch {
      // test cleanup best effort
    }
    server.close();
    await closeDatabasePool();
  }
}

runPhase2CutoverVerification().catch((err) => {
  console.error('Phase 2 E2E Test Suite Error:', err);
  process.exit(1);
});
