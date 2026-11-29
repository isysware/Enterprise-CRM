import assert from 'assert';
import { query } from '../database/connection';
import { AiAssistantService } from '../modules/ai/ai.service';
import { AuthUser, HierarchyScope } from '../types';

async function runTest() {
  console.log('--- Testing CRM Copilot Hot/Urgent Leads Counting with Status Transitions ---');

  const testActor: AuthUser = {
    id: '224a335a-3175-462b-8e81-4895665c57ac',
    name: 'Super Admin',
    email: 'superadmin@isysware.com',
    role: 'Super Admin',
    status: 'active',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const scope: HierarchyScope = {
    managedTeamIds: [],
    subordinateUserIds: [],
  };

  // 1. Initial count
  const initialResp = await AiAssistantService.processRequest(testActor, scope, {
    prompt: 'How many hot and urgent leads do I have?',
    contextScope: 'leads'
  });
  const baseCount = initialResp.insights?.hotUrgentLeadsCount ?? 0;
  console.log(`Initial hot/urgent leads count: ${baseCount}`);

  // 2. Insert a new Hot/Urgent lead with status 'New'
  const insertRes = await query<{ id: string }>(`
    INSERT INTO leads (name, business_name, phone, source, status, quality, priority, assigned_to_id, created_at, updated_at)
    VALUES ('Temp Hot Lead', 'Test Corp', '+92 300 9999999', 'Direct', 'New', 'High', 'Urgent', $1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id
  `, [testActor.id]);
  const tempLeadId = insertRes.rows[0].id;

  try {
    // 3. Verify count incremented with status 'New'
    const newResp = await AiAssistantService.processRequest(testActor, scope, {
      prompt: 'How many urgent leads do I have?',
      contextScope: 'leads'
    });
    assert.strictEqual(
      newResp.insights?.hotUrgentLeadsCount,
      baseCount + 1,
      `When lead is 'New', count should be baseCount + 1 (${baseCount + 1}) but got ${newResp.insights?.hotUrgentLeadsCount}`
    );
    console.log(`✓ PASS: Hot/Urgent lead with status 'New' is COUNTED (${newResp.insights?.hotUrgentLeadsCount})`);

    // 4. Update status to 'Converted'
    await query("UPDATE leads SET status = 'Converted' WHERE id = $1", [tempLeadId]);
    const convertedResp = await AiAssistantService.processRequest(testActor, scope, {
      prompt: 'How many urgent leads do I have?',
      contextScope: 'leads'
    });
    assert.strictEqual(
      convertedResp.insights?.hotUrgentLeadsCount,
      baseCount,
      `When lead is 'Converted', count must revert to baseCount (${baseCount}) but got ${convertedResp.insights?.hotUrgentLeadsCount}`
    );
    console.log(`✓ PASS: Hot/Urgent lead with status 'Converted' is EXCLUDED (${convertedResp.insights?.hotUrgentLeadsCount})`);

    // 5. Update status to 'Won'
    await query("UPDATE leads SET status = 'Won' WHERE id = $1", [tempLeadId]);
    const wonResp = await AiAssistantService.processRequest(testActor, scope, {
      prompt: 'How many urgent leads do I have?',
      contextScope: 'leads'
    });
    assert.strictEqual(
      wonResp.insights?.hotUrgentLeadsCount,
      baseCount,
      `When lead is 'Won', count must revert to baseCount (${baseCount}) but got ${wonResp.insights?.hotUrgentLeadsCount}`
    );
    console.log(`✓ PASS: Hot/Urgent lead with status 'Won' is EXCLUDED (${wonResp.insights?.hotUrgentLeadsCount})`);

    // 6. Update status to 'Lost'
    await query("UPDATE leads SET status = 'Lost' WHERE id = $1", [tempLeadId]);
    const lostResp = await AiAssistantService.processRequest(testActor, scope, {
      prompt: 'How many urgent leads do I have?',
      contextScope: 'leads'
    });
    assert.strictEqual(
      lostResp.insights?.hotUrgentLeadsCount,
      baseCount,
      `When lead is 'Lost', count must revert to baseCount (${baseCount}) but got ${lostResp.insights?.hotUrgentLeadsCount}`
    );
    console.log(`✓ PASS: Hot/Urgent lead with status 'Lost' is EXCLUDED (${lostResp.insights?.hotUrgentLeadsCount})`);

    // 7. Update status to 'Follow-Up Required'
    await query("UPDATE leads SET status = 'Follow-Up Required' WHERE id = $1", [tempLeadId]);
    const followUpResp = await AiAssistantService.processRequest(testActor, scope, {
      prompt: 'How many urgent leads do I have?',
      contextScope: 'leads'
    });
    assert.strictEqual(
      followUpResp.insights?.hotUrgentLeadsCount,
      baseCount + 1,
      `When lead is 'Follow-Up Required', count must be baseCount + 1 (${baseCount + 1})`
    );
    console.log(`✓ PASS: Hot/Urgent lead with status 'Follow-Up Required' is COUNTED (${followUpResp.insights?.hotUrgentLeadsCount})`);

  } finally {
    // Clean up temporary lead
    await query("DELETE FROM leads WHERE id = $1", [tempLeadId]);
    console.log('Cleaned up temporary test lead');
  }

  console.log('\n✅ All CRM Copilot Hot/Urgent counting verification tests passed successfully!');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
