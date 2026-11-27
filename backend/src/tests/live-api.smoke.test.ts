import http from 'http';
import assert from 'assert';
import { app } from '../app';
import { query, closeDatabasePool } from '../database/connection';
import { TokenService } from '../services/token.service';
import { PasswordService } from '../services/password.service';
import { HealthService } from '../services/health.service';
import { env } from '../config';

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

const runSmokeTests = async () => {
  console.log('\n======================================================');
  console.log('🚀 ENTERPRISE CRM LIVE API HTTP SMOKE TEST SUITE');
  console.log('======================================================\n');

  // 1. Start ephemeral HTTP server on random port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to resolve HTTP server address');
  }
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

  // 2. Resolve or establish test Super Admin in database
  const saRes = await query<{ id: string; email: string; name: string }>(
    "SELECT id, email, name FROM users WHERE role_name = 'Super Admin' LIMIT 1"
  );

  let superAdminId: string;
  let superAdminEmail = 'smoke_sa@isysware.com';

  if (saRes.rows.length > 0) {
    superAdminId = saRes.rows[0].id;
    superAdminEmail = saRes.rows[0].email;
  } else {
    const roleRes = await query<{ id: string }>("SELECT id FROM roles WHERE name = 'Super Admin' LIMIT 1");
    const roleId = roleRes.rows[0].id;
    const hash = await PasswordService.hash('SmokeTestSuperAdminPass123!');
    const newSa = await query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, role_id, role_name, status)
       VALUES ('Smoke Super Admin', $1, $2, $3, 'Super Admin', 'active') RETURNING id`,
      [superAdminEmail, hash, roleId]
    );
    superAdminId = newSa.rows[0].id;
  }

  // Issue valid test access token
  const validToken = TokenService.generateAccessToken({
    userId: superAdminId,
    email: superAdminEmail,
    role: 'Super Admin',
    status: 'active',
  });

  // Track created entity IDs for clean-up
  let createdLeadId = '';
  let createdFollowUpId = '';

  try {
    // -------------------------------------------------------------------------
    // Health & Diagnostic Endpoint
    // -------------------------------------------------------------------------
    await test('GET /health: Operational status returns healthy with security headers', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');

      const body = (await res.json()) as any;
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.status, 'healthy');
      assert.strictEqual(body.data.database.status, 'connected');
    });

    await test('Production Health Check: Exposes only safe status info (no leaked serverVersion/db/error)', async () => {
      // Temporarily simulate production environment
      const originalEnv = env.NODE_ENV;
      (env as any).NODE_ENV = 'production';

      try {
        const prodHealth = await HealthService.getHealth(true); // pass verbose = true
        assert.strictEqual(prodHealth.environment, 'production');
        assert.strictEqual(prodHealth.database.status, 'connected');
        assert.strictEqual(prodHealth.database.database, undefined, 'Database name must NOT leak in production');
        assert.strictEqual(prodHealth.database.serverVersion, undefined, 'Server version must NOT leak in production');
        assert.strictEqual(prodHealth.database.error, undefined, 'Errors must NOT leak in production');
        assert.strictEqual(prodHealth.system, undefined, 'System OS memory/platform must NOT leak in production');
      } finally {
        (env as any).NODE_ENV = originalEnv;
      }
    });

    // -------------------------------------------------------------------------
    // Authentication Security & Negative Flows
    // -------------------------------------------------------------------------
    await test('POST /auth/login: Invalid credentials rejected with 401', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@isysware.com', password: 'WrongPassword123!' }),
      });
      assert.strictEqual(res.status, 401);
      const body = (await res.json()) as any;
      assert.strictEqual(body.success, false);
    });

    await test('GET /leads: Unauthorized access without token rejected with 401', async () => {
      const res = await fetch(`${baseUrl}/leads`);
      assert.strictEqual(res.status, 401);
    });

    // -------------------------------------------------------------------------
    // Organization & Catalogs Live Endpoints
    // -------------------------------------------------------------------------
    await test('GET /roles: Retrieves 5 canonical roles and matrices', async () => {
      const res = await fetch(`${baseUrl}/roles`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as any;
      assert.strictEqual(body.data.length, 5);

      const matRes = await fetch(`${baseUrl}/roles/permissions`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(matRes.status, 200);
    });

    await test('GET /users: Retrieves user directory under authorized scope', async () => {
      const res = await fetch(`${baseUrl}/users`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as any;
      assert(Array.isArray(body.data));
    });

    await test('GET /teams: Lists organizational teams', async () => {
      const res = await fetch(`${baseUrl}/teams`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(res.status, 200);
    });

    await test('GET /services & /sources & /pricing-models: Catalog endpoints active', async () => {
      const sRes = await fetch(`${baseUrl}/services`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(sRes.status, 200);

      const srcRes = await fetch(`${baseUrl}/sources`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(srcRes.status, 200);

      const pmRes = await fetch(`${baseUrl}/pricing-models`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(pmRes.status, 200);
    });

    // -------------------------------------------------------------------------
    // Sales Cycle: Leads & Follow-ups Live HTTP Endpoints
    // -------------------------------------------------------------------------
    await test('POST /leads & GET /leads/:id: Lead creation and retrieval via live HTTP', async () => {
      const createRes = await fetch(`${baseUrl}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          name: 'Smoke Lead Customer',
          phone: '+923001234567',
          businessName: 'Smoke Enterprises',
          email: 'customer@smokeenterprises.com',
          city: 'Karachi',
          source: 'Website',
          valuePKR: 500000,
          status: 'New',
          priority: 'Urgent',
        }),
      });

      assert.strictEqual(createRes.status, 201);
      const createBody = (await createRes.json()) as any;
      assert(createBody.data.id);
      createdLeadId = createBody.data.id;

      const getRes = await fetch(`${baseUrl}/leads/${createdLeadId}`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(getRes.status, 200);
      const getBody = (await getRes.json()) as any;
      assert.strictEqual(getBody.data.name, 'Smoke Lead Customer');
    });

    await test('PATCH /leads/:id/status: Updates lead status via live HTTP', async () => {
      const patchRes = await fetch(`${baseUrl}/leads/${createdLeadId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          status: 'Contacted',
          notes: 'Customer contacted via telephone',
        }),
      });

      assert.strictEqual(patchRes.status, 200);
      const patchBody = (await patchRes.json()) as any;
      assert.strictEqual(patchBody.data.status, 'Contacted');
    });

    await test('POST /follow-ups & GET /follow-ups: Schedules and lists follow-ups', async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const fuRes = await fetch(`${baseUrl}/follow-ups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          leadId: createdLeadId,
          scheduledDate: todayStr,
          scheduledTime: '11:00',
          type: 'Call',
          notes: 'Discuss proposal requirements',
        }),
      });

      assert.strictEqual(fuRes.status, 201);
      const fuBody = (await fuRes.json()) as any;
      assert(fuBody.data.id);
      createdFollowUpId = fuBody.data.id;

      const listRes = await fetch(`${baseUrl}/follow-ups?leadId=${createdLeadId}`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(listRes.status, 200);
    });

    await test('GET /clients & /proposals & /activity-logs: Operational modules active', async () => {
      const cRes = await fetch(`${baseUrl}/clients`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(cRes.status, 200);

      const pRes = await fetch(`${baseUrl}/proposals`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(pRes.status, 200);

      const lRes = await fetch(`${baseUrl}/activity-logs`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(lRes.status, 200);
    });

    // -------------------------------------------------------------------------
    // Reports Endpoints Live HTTP Checks
    // -------------------------------------------------------------------------
    await test('GET /reports: All 6 report families respond with HTTP 200 and valid JSON', async () => {
      const reportEndpoints = [
        'sales-pipeline',
        'team-staff',
        'follow-ups',
        'clients-conversions',
        'source-service',
        'commercial-revenue',
      ];

      for (const endpoint of reportEndpoints) {
        const res = await fetch(`${baseUrl}/reports/${endpoint}`, {
          headers: { Authorization: `Bearer ${validToken}` },
        });
        assert.strictEqual(res.status, 200, `Report /reports/${endpoint} failed with status ${res.status}`);
        const body = (await res.json()) as any;
        assert.strictEqual(body.success, true);
        assert(body.data);
      }
    });

    // -------------------------------------------------------------------------
    // AI Assistant Live HTTP Checks
    // -------------------------------------------------------------------------
    await test('POST /ai/assistant: Generates scoped CRM intelligence via live HTTP', async () => {
      const res = await fetch(`${baseUrl}/ai/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          prompt: 'What is my current pipeline summary?',
        }),
      });

      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as any;
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.source, 'internal_crm_database');
      assert(body.data.answer.includes('Pipeline Summary'));
    });

    await test('POST /ai/assistant: Mutation request yields confirmation warning via live HTTP', async () => {
      const res = await fetch(`${baseUrl}/ai/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          prompt: 'Please mark lead as won',
        }),
      });

      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as any;
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.actionProposal.requiresConfirmation, true);
    });

    await test('POST /ai/assistant: Unauthorized request rejected with 401', async () => {
      const res = await fetch(`${baseUrl}/ai/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Hello' }),
      });
      assert.strictEqual(res.status, 401);
    });

    // -------------------------------------------------------------------------
    // External Integrations Live HTTP Checks (Meta & WhatsApp)
    // -------------------------------------------------------------------------
    await test('GET /integrations/meta/status & /whatsapp/status: Safe status responses via live HTTP', async () => {
      const metaRes = await fetch(`${baseUrl}/integrations/meta/status`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(metaRes.status, 200);
      const metaBody = (await metaRes.json()) as any;
      assert.strictEqual(metaBody.data.provider, 'meta');

      const waRes = await fetch(`${baseUrl}/integrations/whatsapp/status`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(waRes.status, 200);
      const waBody = (await waRes.json()) as any;
      assert.strictEqual(waBody.data.provider, 'whatsapp');
    });

    await test('POST /integrations/whatsapp/messages/send: Dispatches message contract via live HTTP', async () => {
      const res = await fetch(`${baseUrl}/integrations/whatsapp/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          recipientPhone: '+923001234567',
          messageText: 'Live HTTP Smoke Test WhatsApp message',
          leadId: createdLeadId,
        }),
      });

      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as any;
      assert(body.data.messageId);
      assert.strictEqual(body.data.leadId, createdLeadId);
    });

    await test('POST /integrations/meta/webhook: Ingests webhook payload via live HTTP', async () => {
      const res = await fetch(`${baseUrl}/integrations/meta/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry: [] }),
      });
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as any;
      assert.strictEqual(body.data.processed, 0);
    });

    // -------------------------------------------------------------------------
    // Real Database Notifications Check
    // -------------------------------------------------------------------------
    await test('GET /notifications: Retrieves user database notifications via live HTTP', async () => {
      const res = await fetch(`${baseUrl}/notifications`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as any;
      assert(body.success);
      assert(Array.isArray(body.data.items));
      assert(typeof body.data.unreadCount === 'number');
    });

    // -------------------------------------------------------------------------
    // 404 Route Catch-all Check
    // -------------------------------------------------------------------------
    await test('GET /api/v1/nonexistent-route: Centralized 404 handler returns structured error', async () => {
      const res = await fetch(`${baseUrl}/nonexistent-route`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assert.strictEqual(res.status, 404);
      const body = (await res.json()) as any;
      assert.strictEqual(body.success, false);
      assert(body.error.message.includes('not found'));
    });

    // -------------------------------------------------------------------------
    // Cleanup smoke test entities
    // -------------------------------------------------------------------------
    if (createdFollowUpId) await query('DELETE FROM follow_ups WHERE id = $1', [createdFollowUpId]);
    if (createdLeadId) {
      await query('DELETE FROM lead_activities WHERE lead_id = $1', [createdLeadId]);
      await query('DELETE FROM leads WHERE id = $1', [createdLeadId]);
    }
    await query("DELETE FROM activity_logs WHERE details::text LIKE '%Smoke%' OR details::text LIKE '%smoke%'");
    await query('DELETE FROM notifications WHERE user_id = $1', [superAdminId]);
  } finally {
    server.close();
    await closeDatabasePool();
  }

  console.log('\n======================================================');
  console.log(`Live Smoke Test Summary: ${passed} passed, ${failed} failed.`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runSmokeTests();
