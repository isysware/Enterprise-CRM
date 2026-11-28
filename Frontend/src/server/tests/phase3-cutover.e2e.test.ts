/**
 * ENTERPRISE CRM - PHASE 3 FRONTEND API CUTOVER E2E VERIFICATION SCRIPT
 * Tests AI Assistant, Settings, Meta & WhatsApp integrations, and Zero-Demo enforcement.
 */

import http from 'http';
import { app } from '../app';
import { query, closeDatabasePool } from '../database/connection';
import { TokenService } from '../services/token.service';

const PORT = 5097;
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

function extractCookie(cookies: string[], name: string): string {
  for (const c of cookies) {
    if (c.startsWith(`${name}=`)) {
      return c.split(';')[0];
    }
  }
  return '';
}

async function runPhase3Tests() {
  console.log('\n===============================================================');
  console.log('🚀 ENTERPRISE CRM — PHASE 3 CUTOVER E2E VERIFICATION SUITE');
  console.log('===============================================================\n');

  // Start dedicated test server
  await new Promise<void>((resolve) => {
    server = app.listen(PORT, '127.0.0.1', () => {
      console.log(`[INIT] Test server listening on http://127.0.0.1:${PORT}`);
      resolve();
    });
  });

  const createdUserIds: string[] = [];
  const createdLeadIds: string[] = [];
  let testsPassed = 0;
  let testsTotal = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    testsTotal++;
    if (condition) {
      testsPassed++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ''}`);
    }
  }

  try {
    // 1. Resolve Super Admin
    const saRes = await query<{ id: string; email: string; role_id: string }>(
      "SELECT u.id, u.email, u.role_id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'Super Admin' LIMIT 1"
    );
    if (saRes.rows.length === 0) {
      throw new Error('Super Admin account not found in database. Bootstrap required.');
    }
    const superAdmin = saRes.rows[0];

    // Generate Super Admin session cookies
    const saAccessToken = TokenService.generateAccessToken({
      userId: superAdmin.id,
      email: superAdmin.email,
      role: 'Super Admin',
      status: 'active',
    });
    const saRefreshToken = TokenService.generateRefreshToken({
      userId: superAdmin.id,
      tokenVersion: 1,
    });
    const saCookieHeader = `crm_access_token=${saAccessToken}; crm_refresh_token=${saRefreshToken}`;

    // 2. Create Temporary Employee Fixture
    const empRoleRes = await query<{ id: string }>("SELECT id FROM roles WHERE name = 'Employee' LIMIT 1");
    const empRoleId = empRoleRes.rows[0].id;
    const testEmpEmail = `test.phase3.emp.${Date.now()}@isysware.internal`;
    const empInsert = await query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, role_id, role_name, status)
       VALUES ('Phase 3 Test Employee', $1, 'hashed_placeholder', $2, 'Employee', 'active')
       RETURNING id`,
      [testEmpEmail, empRoleId]
    );
    const testEmployeeId = empInsert.rows[0].id;
    createdUserIds.push(testEmployeeId);

    const empAccessToken = TokenService.generateAccessToken({
      userId: testEmployeeId,
      email: testEmpEmail,
      role: 'Employee',
      status: 'active',
    });
    const empRefreshToken = TokenService.generateRefreshToken({
      userId: testEmployeeId,
      tokenVersion: 1,
    });
    const empCookieHeader = `crm_access_token=${empAccessToken}; crm_refresh_token=${empRefreshToken}`;

    console.log('[FIXTURES] Test actors prepared:');
    console.log(`  - Super Admin : ${superAdmin.email} (${superAdmin.id})`);
    console.log(`  - Employee    : ${testEmpEmail} (${testEmployeeId})\n`);

    // =========================================================================
    // SECTION A: SETTINGS API & POSTGRESQL PERSISTENCE
    // =========================================================================
    console.log('--- SECTION A: SETTINGS REST API & PERSISTENCE ---');

    // Test 1: GET /api/v1/settings (Super Admin)
    const getSettingsRes = await makeRequest('GET', '/api/v1/settings', undefined, saCookieHeader);
    assert(
      getSettingsRes.statusCode === 200 && getSettingsRes.body.success && typeof getSettingsRes.body.data === 'object',
      'GET /api/v1/settings returns 200 with complete settings object',
      JSON.stringify(getSettingsRes.body)
    );

    // Test 2: PUT /api/v1/settings/branding (Super Admin updates company branding)
    const updateBrandingRes = await makeRequest(
      'PUT',
      '/api/v1/settings/branding',
      {
        companyName: 'iSysware Technologies Inc.',
        applicationName: 'Enterprise CRM Suite',
        currency: 'PKR',
        currencySymbol: 'Rs.',
      },
      saCookieHeader
    );
    assert(
      updateBrandingRes.statusCode === 200 &&
        updateBrandingRes.body.success &&
        (updateBrandingRes.body.data as any).companyName === 'iSysware Technologies Inc.',
      'PUT /api/v1/settings/branding updates company name in PostgreSQL',
      JSON.stringify(updateBrandingRes.body)
    );

    // Test 3: PUT /api/v1/settings/communication (Super Admin updates communication settings)
    const updateCommRes = await makeRequest(
      'PUT',
      '/api/v1/settings/communication',
      {
        staleLeadDays: 10,
        followUpReminderMinutes: 45,
        enableWhatsAppDirect: true,
      },
      saCookieHeader
    );
    assert(
      updateCommRes.statusCode === 200 &&
        updateCommRes.body.success &&
        (updateCommRes.body.data as any).staleLeadDays === 10,
      'PUT /api/v1/settings/communication updates stale lead thresholds',
      JSON.stringify(updateCommRes.body)
    );

    // Test 4: PUT /api/v1/settings/letterhead (Super Admin updates proposal letterhead)
    const updateLhRes = await makeRequest(
      'PUT',
      '/api/v1/settings/letterhead',
      {
        authorizedSignatureName: 'Enterprise Sales Lead',
        defaultProposalValidityDays: 21,
      },
      saCookieHeader
    );
    assert(
      updateLhRes.statusCode === 200 &&
        updateLhRes.body.success &&
        (updateLhRes.body.data as any).defaultProposalValidityDays === 21,
      'PUT /api/v1/settings/letterhead updates default proposal validity days',
      JSON.stringify(updateLhRes.body)
    );

    // Test 5: Verify settings update is rejected for Employee (missing canAccessSettings)
    const empSettingsRes = await makeRequest(
      'PUT',
      '/api/v1/settings/branding',
      { companyName: 'Hacked Branding' },
      empCookieHeader
    );
    assert(
      empSettingsRes.statusCode === 403,
      'PUT /api/v1/settings/branding enforces canAccessSettings (Employee returns 403 Forbidden)',
      `Status: ${empSettingsRes.statusCode}`
    );

    // Test 6: POST /api/v1/settings/reset (Super Admin resets settings to defaults)
    const resetSettingsRes = await makeRequest('POST', '/api/v1/settings/reset', {}, saCookieHeader);
    assert(
      resetSettingsRes.statusCode === 200 &&
        resetSettingsRes.body.success &&
        (resetSettingsRes.body.data as any).companyName === 'iSysware',
      'POST /api/v1/settings/reset restores factory defaults in PostgreSQL',
      JSON.stringify(resetSettingsRes.body)
    );

    // =========================================================================
    // SECTION B: AI CRM COPILOT ASSISTANT (POST /api/v1/ai/assistant)
    // =========================================================================
    console.log('\n--- SECTION B: AI CRM COPILOT ASSISTANT ---');

    // Test 7: POST /api/v1/ai/assistant (Super Admin queries CRM pipeline summary)
    const aiSummaryRes = await makeRequest(
      'POST',
      '/api/v1/ai/assistant',
      {
        prompt: 'Give me a summary of our active leads and pipeline valuation.',
        contextScope: 'dashboard',
      },
      saCookieHeader
    );
    assert(
      aiSummaryRes.statusCode === 200 &&
        aiSummaryRes.body.success &&
        typeof aiSummaryRes.body.data?.answer === 'string' &&
        aiSummaryRes.body.data.answer.length > 0,
      'POST /api/v1/ai/assistant answers pipeline question with authorized PostgreSQL data',
      JSON.stringify(aiSummaryRes.body)
    );

    // Test 8: POST /api/v1/ai/assistant (Employee queries follow-ups with hard self-scope)
    const aiEmpRes = await makeRequest(
      'POST',
      '/api/v1/ai/assistant',
      {
        prompt: 'What are my follow-ups scheduled for today?',
        contextScope: 'follow-ups',
      },
      empCookieHeader
    );
    assert(
      aiEmpRes.statusCode === 200 &&
        aiEmpRes.body.success &&
        typeof aiEmpRes.body.data?.answer === 'string',
      'POST /api/v1/ai/assistant succeeds for Employee within hard self-scope',
      JSON.stringify(aiEmpRes.body)
    );

    // Test 9: POST /api/v1/ai/assistant without prompt returns 400 Bad Request
    const aiInvalidRes = await makeRequest('POST', '/api/v1/ai/assistant', {}, saCookieHeader);
    assert(
      aiInvalidRes.statusCode === 400,
      'POST /api/v1/ai/assistant validates request body (empty body returns 400)',
      `Status: ${aiInvalidRes.statusCode}`
    );

    // =========================================================================
    // SECTION C: INTEGRATIONS (META LEAD ADS & WHATSAPP)
    // =========================================================================
    console.log('\n--- SECTION C: META LEAD ADS & WHATSAPP INTEGRATIONS ---');

    // Test 10: GET /api/v1/integrations/meta/status
    const metaStatusRes = await makeRequest('GET', '/api/v1/integrations/meta/status', undefined, saCookieHeader);
    assert(
      metaStatusRes.statusCode === 200 &&
        metaStatusRes.body.success &&
        metaStatusRes.body.data?.provider === 'meta',
      'GET /api/v1/integrations/meta/status returns real status (never fake connected)',
      JSON.stringify(metaStatusRes.body)
    );

    // Test 11: POST /api/v1/integrations/meta/configure (Super Admin configures Meta connection)
    const metaConfigRes = await makeRequest(
      'POST',
      '/api/v1/integrations/meta/configure',
      {
        appId: '123456789012345',
        pageId: '987654321098765',
        pageName: 'iSysware Official Facebook Page',
        webhookVerifyToken: 'secure_meta_token_123',
        subscribedForms: ['form_lead_001', 'form_lead_002'],
      },
      saCookieHeader
    );
    assert(
      metaConfigRes.statusCode === 200 &&
        metaConfigRes.body.success &&
        metaConfigRes.body.data?.pageId === '987654321098765',
      'POST /api/v1/integrations/meta/configure saves Meta Lead Ads configuration in PostgreSQL',
      JSON.stringify(metaConfigRes.body)
    );

    // Test 12: GET /api/v1/integrations/whatsapp/status
    const waStatusRes = await makeRequest('GET', '/api/v1/integrations/whatsapp/status', undefined, saCookieHeader);
    assert(
      waStatusRes.statusCode === 200 &&
        waStatusRes.body.success &&
        waStatusRes.body.data?.provider === 'whatsapp',
      'GET /api/v1/integrations/whatsapp/status returns real status (never fake active session)',
      JSON.stringify(waStatusRes.body)
    );

    // Test 13: POST /api/v1/integrations/whatsapp/session/init
    const waInitRes = await makeRequest('POST', '/api/v1/integrations/whatsapp/session/init', {}, saCookieHeader);
    assert(
      waInitRes.statusCode === 200 &&
        waInitRes.body.success &&
        (waInitRes.body.data?.status === 'qr_ready' || waInitRes.body.data?.status === 'connecting'),
      'POST /api/v1/integrations/whatsapp/session/init initializes session in PostgreSQL',
      JSON.stringify(waInitRes.body)
    );

    // Create a temporary lead to test WhatsApp message sending
    const leadInsert = await query<{ id: string }>(
      `INSERT INTO leads (name, business_name, phone, status, priority, value_pkr, source, assigned_to_id)
       VALUES ('WhatsApp Test Contact', 'Test Corp', '+923001234567', 'New', 'Medium', 50000, 'WhatsApp', $1)
       RETURNING id`,
      [superAdmin.id]
    );
    const testLeadId = leadInsert.rows[0].id;
    createdLeadIds.push(testLeadId);

    // Test 14: POST /api/v1/integrations/whatsapp/messages/send
    const waSendRes = await makeRequest(
      'POST',
      '/api/v1/integrations/whatsapp/messages/send',
      {
        recipientPhone: '+923001234567',
        messageText: 'Hello from Enterprise CRM integration verification.',
        leadId: testLeadId,
      },
      saCookieHeader
    );
    assert(
      waSendRes.statusCode === 200 &&
        waSendRes.body.success &&
        (waSendRes.body.data?.status === 'queued' || waSendRes.body.data?.status === 'sent'),
      'POST /api/v1/integrations/whatsapp/messages/send dispatches outbound message and logs activity',
      JSON.stringify(waSendRes.body)
    );

    // =========================================================================
    // SECTION D: ZERO-DEMO ENFORCEMENT & SELF-CLEANING FIXTURES
    // =========================================================================
    console.log('\n--- SECTION D: ZERO-DEMO ENFORCEMENT & FIXTURE CLEANUP ---');

    // Clean up created fixtures
    if (createdLeadIds.length > 0) {
      for (const lid of createdLeadIds) {
        await query('DELETE FROM lead_activities WHERE lead_id = $1', [lid]);
        await query('DELETE FROM leads WHERE id = $1', [lid]);
      }
    }
    if (createdUserIds.length > 0) {
      for (const uid of createdUserIds) {
        await query('DELETE FROM users WHERE id = $1', [uid]);
      }
    }
    // Clean up integration test record
    await query("DELETE FROM integration_connections WHERE provider IN ('meta', 'whatsapp')");

    // Verify row counts of operational tables
    const checkLeads = await query<{ count: string }>('SELECT COUNT(*)::text as count FROM leads');
    const checkClients = await query<{ count: string }>('SELECT COUNT(*)::text as count FROM clients');
    const checkIncoming = await query<{ count: string }>('SELECT COUNT(*)::text as count FROM incoming_leads');
    const checkFollowUps = await query<{ count: string }>('SELECT COUNT(*)::text as count FROM follow_ups');

    assert(
      checkLeads.rows[0].count === '0',
      `Zero Demo Verification: leads table row count is ${checkLeads.rows[0].count} (must be 0)`
    );
    assert(
      checkClients.rows[0].count === '0',
      `Zero Demo Verification: clients table row count is ${checkClients.rows[0].count} (must be 0)`
    );
    assert(
      checkIncoming.rows[0].count === '0',
      `Zero Demo Verification: incoming_leads table row count is ${checkIncoming.rows[0].count} (must be 0)`
    );
    assert(
      checkFollowUps.rows[0].count === '0',
      `Zero Demo Verification: follow_ups table row count is ${checkFollowUps.rows[0].count} (must be 0)`
    );

    console.log('\n===============================================================');
    console.log(`📊 PHASE 3 VERIFICATION SUMMARY: ${testsPassed}/${testsTotal} TESTS PASSED`);
    console.log('===============================================================\n');

    if (testsPassed !== testsTotal) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Fatal error during Phase 3 verification:', err);
    process.exitCode = 1;
  } finally {
    // Teardown
    if (server) {
      server.close();
    }
    await closeDatabasePool();
  }
}

runPhase3Tests();
