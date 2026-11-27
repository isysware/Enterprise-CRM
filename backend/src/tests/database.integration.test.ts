import assert from 'assert';
import {
  verifyDatabaseConnection,
  closeDatabasePool,
  query,
} from '../database/connection';
import { DatabaseMigrator } from '../database/migrator';
import { DatabaseSeeder } from '../database/seed';
import {
  postgresUserRepository,
  postgresRolePermissionRepository,
  postgresTeamRepository,
} from '../repositories';
import { AuthService } from '../modules/auth/auth.service';
import { PasswordService } from '../services/password.service';
import { CANONICAL_CAPABILITIES } from '../constants/rbac.constants';
import { AppError } from '../utils/AppError';

// ANSI terminal colors
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

const runAllDatabaseTests = async () => {
  console.log('\n======================================================');
  console.log('🐘 ENTERPRISE CRM POSTGRESQL INTEGRATION TEST SUITE');
  console.log('======================================================\n');

  try {
    // -------------------------------------------------------------------------
    // 1. Connection & Health Verification
    // -------------------------------------------------------------------------
    await test('PostgreSQL connection pool establishes and reports active database', async () => {
      const status = await verifyDatabaseConnection();
      assert.strictEqual(status.connected, true, 'Database should be connected');
      assert.strictEqual(status.database, 'enterprise_crm', 'Target database must be enterprise_crm');
      assert(typeof status.latencyMs === 'number' && status.latencyMs >= 0, 'Latency must be reported');
    });

    // -------------------------------------------------------------------------
    // 2. Migration System & Table Architecture
    // -------------------------------------------------------------------------
    await test('Database migration runner executes idempotently and records schema_migrations', async () => {
      const result = await DatabaseMigrator.runMigrations();
      assert(Array.isArray(result.alreadyApplied), 'Already applied migrations should be returned');
      assert(
        result.alreadyApplied.includes('001_initial_schema.sql') ||
        result.applied.includes('001_initial_schema.sql'),
        '001_initial_schema.sql must be recorded in schema_migrations'
      );
    });

    await test('All 19 relational entities and tracking tables exist in public schema', async () => {
      const res = await query<{ table_name: string }>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      const tables = res.rows.map((r) => r.table_name);

      const requiredTables = [
        'schema_migrations',
        'roles',
        'role_permissions',
        'users',
        'teams',
        'team_memberships',
        'pricing_models',
        'services',
        'lead_sources',
        'leads',
        'lead_activities',
        'incoming_leads',
        'follow_ups',
        'clients',
        'proposals',
        'activity_logs',
        'settings',
        'integration_connections',
        'refresh_tokens',
        'notifications',
      ];

      for (const t of requiredTables) {
        assert(tables.includes(t), `Table "${t}" must exist in database`);
      }
    });

    // -------------------------------------------------------------------------
    // 3. System Seeder Verification
    // -------------------------------------------------------------------------
    await test('System seeder ensures 5 canonical roles and 105 capability rows', async () => {
      const seedRes = await DatabaseSeeder.seed();
      assert.strictEqual(seedRes.rolesCreatedOrFound, 5, 'Must verify 5 canonical roles');
      assert.strictEqual(seedRes.permissionsSeeded, 105, '5 roles * 21 capabilities = 105 rows');

      const adminUser = await postgresUserRepository.findByEmail('superadmin@isysware.com');
      assert(adminUser !== null, 'Initial bootstrapped Super Admin must exist');
      assert.strictEqual(adminUser.role, 'Super Admin');
      assert.strictEqual(adminUser.status, 'active');
    });

    // -------------------------------------------------------------------------
    // 4. Role Permissions Repository & Invariants
    // -------------------------------------------------------------------------
    await test('Super Admin permissions are permanently locked to all 21 true', async () => {
      const perms = await postgresRolePermissionRepository.getRolePermissions('Super Admin');
      for (const cap of CANONICAL_CAPABILITIES) {
        assert.strictEqual(((perms as unknown) as Record<string, unknown>)[cap], true);
      }
    });

    await test('Super Admin permissions cannot be modified (forbidden)', async () => {
      await assert.rejects(
        async () => {
          await postgresRolePermissionRepository.updateRoleCapability('Super Admin', 'canDeleteLeads', false);
        },
        (err: Error) => err instanceof AppError && err.statusCode === 400
      );
    });

    await test('Dynamic permission toggle: Super Admin can grant canViewReports to Employee in DB', async () => {
      const updated = await postgresRolePermissionRepository.updateRoleCapability(
        'Employee',
        'canViewReports',
        true
      );
      assert.strictEqual(updated.canViewReports, true, 'canViewReports must be dynamically true in DB');

      // Revert back to default false for clean test state
      await postgresRolePermissionRepository.updateRoleCapability('Employee', 'canViewReports', false);
      const reverted = await postgresRolePermissionRepository.getRolePermissions('Employee');
      assert.strictEqual(reverted.canViewReports, false, 'canViewReports must revert to false');
    });

    await test('HARD INVARIANT PRESERVED: canManageRoles CANNOT be granted to Employee', async () => {
      await assert.rejects(
        async () => {
          await postgresRolePermissionRepository.updateRoleCapability('Employee', 'canManageRoles', true);
        },
        (err: Error) => err instanceof AppError && err.statusCode === 403
      );
    });

    await test('HARD INVARIANT PRESERVED: canManageSuperAdmin CANNOT be granted to Admin', async () => {
      await assert.rejects(
        async () => {
          await postgresRolePermissionRepository.updateRoleCapability('Admin', 'canManageSuperAdmin', true);
        },
        (err: Error) => err instanceof AppError && err.statusCode === 403
      );
    });

    await test('HARD INVARIANT PRESERVED: Incoming Leads access CANNOT be granted to Employee', async () => {
      await assert.rejects(
        async () => {
          await postgresRolePermissionRepository.updateRoleCapability('Employee', 'canViewIncomingLeads', true);
        },
        (err: Error) => err instanceof AppError && err.statusCode === 403
      );
    });

    // -------------------------------------------------------------------------
    // 5. User Repository & Auth Persistence
    // -------------------------------------------------------------------------
    const testEmail = `test.agent_${Date.now()}@isysware.com`;
    const rawPass = 'StrongPass123!';
    let createdUserId = '';

    await test('PostgresUserRepository creates and persists user record', async () => {
      const passHash = await PasswordService.hash(rawPass);
      const created = await postgresUserRepository.create({
        name: 'Integration Test Rep',
        email: testEmail,
        phone: '+923001234567',
        role: 'Employee',
        status: 'active',
        passwordHash: passHash,
      });

      assert(created.id, 'Created user must have UUID id');
      assert.strictEqual(created.email, testEmail);
      assert.strictEqual(created.role, 'Employee');
      assert.strictEqual(created.status, 'active');
      createdUserId = created.id;
    });

    await test('AuthService authenticates user against PostgreSQL database', async () => {
      const { user, tokens } = await AuthService.login(
        { email: testEmail, password: rawPass },
        postgresUserRepository
      );

      assert.strictEqual(user.id, createdUserId);
      assert.strictEqual(user.email, testEmail);
      assert(tokens.accessToken, 'Access token must be generated');
      assert(tokens.refreshToken, 'Refresh token must be generated');
    });

    await test('AuthService rejects invalid credentials against PostgreSQL database', async () => {
      await assert.rejects(
        async () => {
          await AuthService.login(
            { email: testEmail, password: 'WrongPassword999!' },
            postgresUserRepository
          );
        },
        (err: Error) => err instanceof AppError && err.statusCode === 401
      );
    });

    await test('PostgresUserRepository updates password and token version', async () => {
      const newPass = 'NewStrongPass456!';
      const newHash = await PasswordService.hash(newPass);

      await postgresUserRepository.updatePassword(createdUserId, newHash);
      await postgresUserRepository.incrementTokenVersion(createdUserId);

      // Verify new password authenticates
      const { user } = await AuthService.login(
        { email: testEmail, password: newPass },
        postgresUserRepository
      );
      assert.strictEqual(user.id, createdUserId);

      // Verify old password fails
      await assert.rejects(
        async () => {
          await AuthService.login(
            { email: testEmail, password: rawPass },
            postgresUserRepository
          );
        },
        (err: Error) => err instanceof AppError && err.statusCode === 401
      );
    });

    // -------------------------------------------------------------------------
    // 6. Team Membership Relational Constraints
    // -------------------------------------------------------------------------
    await test('Team membership constraint: exactly one active primary team per user', async () => {
      const ts = Date.now();
      const teamA = await postgresTeamRepository.createTeam({
        name: `Alpha Sales Squad_${ts}`,
        code: `ALPHA_${ts}`,
      });
      const teamB = await postgresTeamRepository.createTeam({
        name: `Beta Direct Unit_${ts}`,
        code: `BETA_${ts}`,
      });

      // 1. Assign created user as primary member of Team A -> Succeeds
      const memA = await postgresTeamRepository.addTeamMember({
        teamId: teamA.id,
        userId: createdUserId,
        isPrimary: true,
        status: 'active',
      });
      assert.strictEqual(memA.is_primary, true);

      // 2. Attempt to assign user as active primary member of Team B -> Must fail due to unique partial index
      await assert.rejects(
        async () => {
          await postgresTeamRepository.addTeamMember({
            teamId: teamB.id,
            userId: createdUserId,
            isPrimary: true,
            status: 'active',
          });
        },
        (err: Error) => err instanceof AppError && err.statusCode === 400
      );

      // 3. Assign user as secondary (isPrimary = false) member of Team B -> Succeeds
      const memB = await postgresTeamRepository.addTeamMember({
        teamId: teamB.id,
        userId: createdUserId,
        isPrimary: false,
        status: 'active',
      });
      assert.strictEqual(memB.is_primary, false);

      // 4. Verify user has 2 memberships, with exactly 1 primary
      const memberships = await postgresTeamRepository.getUserMemberships(createdUserId);
      assert.strictEqual(memberships.length, 2);
      const primaries = memberships.filter((m) => m.is_primary && m.status === 'active');
      assert.strictEqual(primaries.length, 1);

      // Clean up teams (cascade deletes memberships)
      await query('DELETE FROM teams WHERE id IN ($1, $2)', [teamA.id, teamB.id]);
    });

    // Clean up test user
    if (createdUserId) {
      await postgresUserRepository.delete(createdUserId);
    }
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

runAllDatabaseTests();
