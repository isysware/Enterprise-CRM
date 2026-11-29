import { PasswordService, TokenService, RbacService } from '../services';
import { AuthUser, UserRole, RolePermission, HierarchyScope } from '../types';
import { DEFAULT_ROLE_PERMISSIONS, CANONICAL_CAPABILITIES } from '../constants';
import { RuntimeUserRepository } from '../repositories';
import { AuthService } from '../modules/auth/auth.service';

interface TestResult {
  passed: boolean;
  name: string;
  error?: string;
}

export async function runAuthRbacTests(): Promise<{ passed: boolean; results: TestResult[] }> {
  const results: TestResult[] = [];

  function assert(condition: boolean, name: string, failureDetails?: string) {
    if (condition) {
      results.push({ passed: true, name });
    } else {
      results.push({
        passed: false,
        name,
        error: failureDetails || 'Assertion failed',
      });
    }
  }

  try {
    // =========================================================================
    // 1. Password Service Tests
    // =========================================================================
    const rawPassword = 'SecurePassword@123';
    const hash = await PasswordService.hash(rawPassword);
    assert(hash.startsWith('$2'), 'Password hashing produces valid bcrypt hash');
    assert(await PasswordService.verify(rawPassword, hash), 'Password verification succeeds with valid password');
    assert(!(await PasswordService.verify('WrongPassword@123', hash)), 'Password verification fails with invalid password');
    assert(PasswordService.validateStrength(rawPassword), 'Password complexity validator accepts strong password');
    assert(!PasswordService.validateStrength('weak'), 'Password complexity validator rejects weak password');

    // =========================================================================
    // 2. Token Service Tests
    // =========================================================================
    const testUserPayload = {
      userId: 'test-user-1',
      email: 'test@isysware.com',
      role: 'Manager' as UserRole,
      status: 'active' as const,
      teamId: 'team-1',
    };

    const tokens = TokenService.generateAuthTokens(testUserPayload, 1);
    assert(Boolean(tokens.accessToken && tokens.refreshToken), 'TokenService issues both access and refresh tokens');

    const decodedAccess = TokenService.verifyAccessToken(tokens.accessToken);
    assert(decodedAccess.userId === 'test-user-1' && decodedAccess.role === 'Manager', 'Access token decodes valid payload');

    const decodedRefresh = TokenService.verifyRefreshToken(tokens.refreshToken);
    assert(decodedRefresh.userId === 'test-user-1' && decodedRefresh.tokenVersion === 1, 'Refresh token decodes valid version');

    let malformedFailed = false;
    try {
      TokenService.verifyAccessToken('invalid.token.signature');
    } catch {
      malformedFailed = true;
    }
    assert(malformedFailed, 'TokenService rejects malformed access token');

    // =========================================================================
    // 3. 21 Canonical Capabilities Baseline
    // =========================================================================
    assert(CANONICAL_CAPABILITIES.length === 21, 'Exactly 21 canonical capabilities are registered');

    const superAdminPerms = RbacService.getEffectivePermissions('Super Admin');
    assert(
      CANONICAL_CAPABILITIES.every((cap) => superAdminPerms[cap] === true),
      'Super Admin possesses all 21 canonical capabilities by default'
    );

    const adminPerms = RbacService.getEffectivePermissions('Admin');
    assert(adminPerms.canManageUsers === true, 'Admin has user management capability by default');
    assert(adminPerms.canManageSuperAdmin === false, 'Admin default: canManageSuperAdmin is FALSE');
    assert(adminPerms.canManageRoles === false, 'Admin default: canManageRoles is FALSE');

    const employeePerms = RbacService.getEffectivePermissions('Employee');
    assert(employeePerms.canViewIncomingLeads === false, 'Employee default: canViewIncomingLeads is FALSE');
    assert(employeePerms.canAssignIncomingLeads === false, 'Employee default: canAssignIncomingLeads is FALSE');
    assert(employeePerms.canDeleteLeads === false, 'Employee default: canDeleteLeads is FALSE');
    assert(employeePerms.canViewReports === false, 'Employee default: canViewReports is FALSE');

    // =========================================================================
    // 4. Dynamic Permissions Semantics (Editable Matrix by Super Admin)
    // =========================================================================
    // Dynamic matrix where Super Admin ENABLES normal capabilities for Employee
    // and DISABLES canCreateLeads for Manager
    const superAdminDynamicMatrix: RolePermission[] = [
      {
        ...DEFAULT_ROLE_PERMISSIONS.find((r) => r.role === 'Employee')!,
        canViewReports: true, // Super Admin grants reports to Employee
        canGenerateProposals: true, // Super Admin grants proposal generation to Employee
        canViewAllLeads: true, // Super Admin toggles lead visibility
        canManageRoles: true, // Attempted illegal override: must be rejected by hard rule
        canManageSuperAdmin: true, // Attempted illegal override: must be rejected by hard rule
        canViewIncomingLeads: true, // Attempted illegal override: must be rejected by hard rule
      },
      {
        ...DEFAULT_ROLE_PERMISSIONS.find((r) => r.role === 'Manager')!,
        canCreateLeads: false, // Super Admin disables lead creation for Manager
      },
      {
        ...DEFAULT_ROLE_PERMISSIONS.find((r) => r.role === 'Admin')!,
        canManageRoles: true, // Attempted illegal override: must be rejected by hard rule
        canManageSuperAdmin: true, // Attempted illegal override: must be rejected by hard rule
      },
    ];

    const customizedEmployeePerms = RbacService.getEffectivePermissions('Employee', superAdminDynamicMatrix);
    assert(customizedEmployeePerms.canViewReports === true, 'Dynamic matrix successfully ENABLES canViewReports for Employee');
    assert(customizedEmployeePerms.canGenerateProposals === true, 'Dynamic matrix successfully ENABLES canGenerateProposals for Employee');
    assert(customizedEmployeePerms.canViewAllLeads === true, 'Dynamic matrix successfully ENABLES canViewAllLeads for Employee');

    const customizedManagerPerms = RbacService.getEffectivePermissions('Manager', superAdminDynamicMatrix);
    assert(customizedManagerPerms.canCreateLeads === false, 'Dynamic matrix successfully DISABLES canCreateLeads for Manager');

    // HARD IMMUTABLE RULES VERIFICATION (Must never be overridden by dynamic matrix):
    assert(customizedEmployeePerms.canManageRoles === false, 'HARD RULE PRESERVED: canManageRoles remains FALSE for Employee even if enabled in matrix');
    assert(customizedEmployeePerms.canManageSuperAdmin === false, 'HARD RULE PRESERVED: canManageSuperAdmin remains FALSE for Employee even if enabled in matrix');
    assert(customizedEmployeePerms.canViewIncomingLeads === false, 'HARD RULE PRESERVED: canViewIncomingLeads remains FALSE for Employee');
    assert(customizedEmployeePerms.canAssignIncomingLeads === false, 'HARD RULE PRESERVED: canAssignIncomingLeads remains FALSE for Employee');

    const customizedAdminPerms = RbacService.getEffectivePermissions('Admin', superAdminDynamicMatrix);
    assert(customizedAdminPerms.canManageRoles === false, 'HARD RULE PRESERVED: canManageRoles remains FALSE for Admin even if enabled in matrix');
    assert(customizedAdminPerms.canManageSuperAdmin === false, 'HARD RULE PRESERVED: canManageSuperAdmin remains FALSE for Admin even if enabled in matrix');

    // =========================================================================
    // 5. Hard Data Scope Invariant (A capability grants actions ONLY inside hard data scope)
    // =========================================================================
    const empActor: AuthUser = {
      id: 'emp-1',
      name: 'Sales Rep Employee',
      email: 'rep@test.com',
      role: 'Employee',
      teamId: 'team-sales',
      status: 'active',
      isActive: true,
      createdAt: '2026-01-01',
    };

    const managerActor: AuthUser = {
      id: 'mgr-1',
      name: 'Sales Manager',
      email: 'mgr@test.com',
      role: 'Manager',
      teamId: 'team-sales',
      status: 'active',
      isActive: true,
      createdAt: '2026-01-01',
    };

    const mockRecords = [
      { id: 'rec-1', assignedToId: 'emp-1', teamId: 'team-sales' }, // Self assigned
      { id: 'rec-2', assignedToId: 'emp-other', teamId: 'team-sales' }, // Managed team peer
      { id: 'rec-3', assignedToId: 'emp-outside', teamId: 'team-outside' }, // Outside department
    ];

    const empScope = RbacService.getHierarchyScope(empActor, [empActor], []);
    const mgrScope = RbacService.getHierarchyScope(
      managerActor,
      [
        managerActor,
        empActor,
        { id: 'emp-other', name: 'Other', email: 'o@t.com', role: 'Employee', teamId: 'team-sales', status: 'active', isActive: true, createdAt: '2026-01-01' },
      ],
      [{ id: 'team-sales', managerId: 'mgr-1' }, { id: 'team-outside', managerId: 'other-mgr' }]
    );

    // Employee has canViewReports = true enabled in dynamic matrix.
    // RULE: Employee may see reports ONLY for their own authorized data, never organization-wide data.
    const empAccessibleReports = RbacService.getScopedRecordIds(
      empActor,
      mockRecords,
      empScope,
      customizedEmployeePerms.canViewReports
    );
    assert(
      empAccessibleReports.length === 1 && empAccessibleReports[0] === 'rec-1',
      'Employee with canViewReports=true sees ONLY self-assigned records, NEVER organization-wide data'
    );

    // If capability is disabled (false), zero records are returned
    const empDisabledReports = RbacService.getScopedRecordIds(empActor, mockRecords, empScope, false);
    assert(empDisabledReports.length === 0, 'When capability is disabled, zero records are accessible');

    // Manager with canViewReports sees self + managed team records, never outside department
    const mgrAccessibleReports = RbacService.getScopedRecordIds(
      managerActor,
      mockRecords,
      mgrScope,
      customizedManagerPerms.canViewReports
    );
    assert(
      mgrAccessibleReports.includes('rec-1') && mgrAccessibleReports.includes('rec-2') && !mgrAccessibleReports.includes('rec-3'),
      'Manager with canViewReports sees managed hierarchy records, strictly excluding outside departments'
    );

    // Team Lead with canViewTeamLeads sees self + subordinate records, strictly excluding Manager personal records
    const tlActor: AuthUser = {
      id: 'tl-1',
      name: 'Team Lead',
      email: 'tl@test.com',
      role: 'Team Lead',
      status: 'active',
      isActive: true,
      teamId: 'team-1',
      createdAt: '2026-01-01',
    };
    const tlScope: HierarchyScope = {
      managedTeamIds: ['team-1'],
      subordinateUserIds: ['tl-1', 'emp-1'],
      scopedTeamIds: ['team-1'],
      assignableUserIds: ['tl-1', 'emp-1'],
    };
    const teamRecords = [
      { id: 'lead-tl', assignedToId: 'tl-1', teamId: 'team-1' },
      { id: 'lead-emp', assignedToId: 'emp-1', teamId: 'team-1' },
      { id: 'lead-mgr-personal', assignedToId: 'mgr-1', teamId: 'team-1' }, // Manager personal lead in same team
      { id: 'lead-unassigned', assignedToId: undefined, teamId: 'team-1' },
    ];
    const tlScopedLeadIds = RbacService.getHardScopedLeadIds(tlActor, teamRecords, tlScope);
    assert(tlScopedLeadIds.includes('lead-tl'), 'Team Lead sees self lead');
    assert(tlScopedLeadIds.includes('lead-emp'), 'Team Lead sees subordinate employee lead');
    assert(tlScopedLeadIds.includes('lead-unassigned'), 'Team Lead sees unassigned team lead');
    assert(!tlScopedLeadIds.includes('lead-mgr-personal'), 'Team Lead MUST NOT see Manager personal lead');

    // =========================================================================
    // 6. Target User Management Authority Rules
    // =========================================================================
    const superAdminActor: AuthUser = {
      id: 'sa-1',
      name: 'Super Admin',
      email: 'sa@test.com',
      role: 'Super Admin',
      status: 'active',
      isActive: true,
      createdAt: '2026-01-01',
    };

    const adminActor: AuthUser = {
      id: 'adm-1',
      name: 'Admin One',
      email: 'adm1@test.com',
      role: 'Admin',
      status: 'active',
      isActive: true,
      createdAt: '2026-01-01',
    };

    const adminTarget: AuthUser = {
      id: 'adm-2',
      name: 'Admin Two',
      email: 'adm2@test.com',
      role: 'Admin',
      status: 'active',
      isActive: true,
      createdAt: '2026-01-01',
    };

    const employeeTarget: AuthUser = {
      id: 'emp-2',
      name: 'Employee Two',
      email: 'emp2@test.com',
      role: 'Employee',
      status: 'active',
      isActive: true,
      createdAt: '2026-01-01',
    };

    assert(RbacService.canManageTargetUser(superAdminActor, adminTarget), 'Only Super Admin can manage Admin accounts');
    assert(!RbacService.canManageTargetUser(adminActor, superAdminActor), 'Admin CANNOT manage Super Admin account');
    assert(!RbacService.canManageTargetUser(adminActor, adminTarget), 'Admin CANNOT manage another Admin account');
    assert(RbacService.canManageTargetUser(adminActor, employeeTarget), 'Admin can manage Employee account');
    assert(!RbacService.canManageTargetUser(employeeTarget, adminTarget), 'Employee cannot manage other accounts');

    // =========================================================================
    // 7. Target Role Creation Authority Rules
    // =========================================================================
    const saAllowed = RbacService.getAllowedTargetRoles(superAdminActor);
    assert(saAllowed.includes('Admin') && saAllowed.includes('Employee'), 'Super Admin can create Admin, Manager, Team Lead, Employee');

    const admAllowed = RbacService.getAllowedTargetRoles(adminActor);
    assert(!admAllowed.includes('Admin') && !admAllowed.includes('Super Admin'), 'Admin CANNOT create Admin or Super Admin accounts');
    assert(admAllowed.includes('Manager') && admAllowed.includes('Employee'), 'Admin can create operational accounts (Manager, Team Lead, Employee)');

    // =========================================================================
    // 8. Roles & Permissions Matrix is Super Admin Only
    // =========================================================================
    assert(RbacService.canManageRolesMatrix(superAdminActor), 'Super Admin can manage Roles & Permissions matrix');
    assert(!RbacService.canManageRolesMatrix(adminActor), 'Admin CANNOT manage Roles & Permissions matrix');
    assert(!RbacService.canManageRolesMatrix(empActor), 'Employee CANNOT manage Roles & Permissions matrix');

    // =========================================================================
    // 9. Secondary Team Membership Does Not Grant Supervisory Authority
    // =========================================================================
    const managerWithSecondary: AuthUser = {
      id: 'mgr-sec',
      name: 'Manager Secondary',
      email: 'mgrsec@test.com',
      role: 'Manager',
      teamId: 'team-primary',
      secondaryTeamIds: ['team-secondary'],
      status: 'active',
      isActive: true,
      createdAt: '2026-01-01',
    };

    const teamsList = [
      { id: 'team-primary', managerId: 'mgr-sec' },
      { id: 'team-secondary', managerId: 'other-manager' },
    ];

    const secScope = RbacService.getHierarchyScope(managerWithSecondary, [managerWithSecondary], teamsList);
    assert(secScope.managedTeamIds.includes('team-primary'), 'Primary managed team is included in manager scope');
    assert(!secScope.managedTeamIds.includes('team-secondary'), 'Secondary team membership DOES NOT grant supervisory authority');

    // =========================================================================
    // 10. Inactive Account Authentication Rejection
    // =========================================================================
    const testRepo = new RuntimeUserRepository([
      {
        id: 'u-inactive',
        name: 'Inactive User',
        email: 'inactive@test.com',
        role: 'Employee',
        status: 'inactive',
        isActive: false,
        passwordHash: await PasswordService.hash('Password@123'),
        tokenVersion: 1,
        createdAt: '2026-01-01',
      },
      {
        id: 'u-active',
        name: 'Active User',
        email: 'active@test.com',
        role: 'Employee',
        status: 'active',
        isActive: true,
        passwordHash: await PasswordService.hash('Password@123'),
        tokenVersion: 1,
        createdAt: '2026-01-01',
      },
    ]);

    let inactiveRejected = false;
    try {
      await AuthService.login({ email: 'inactive@test.com', password: 'Password@123' }, testRepo);
    } catch {
      inactiveRejected = true;
    }
    assert(inactiveRejected, 'Inactive account is rejected at login');

    const activeLogin = await AuthService.login({ email: 'active@test.com', password: 'Password@123' }, testRepo);
    assert(activeLogin.user.id === 'u-active', 'Active account authenticates successfully');

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({ passed: false, name: 'Unhandled test exception', error: errorMsg });
  }

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, results };
}

// Auto-run if executed directly via CLI
if (require.main === module) {
  runAuthRbacTests().then(({ passed, results }) => {
    console.log('\n======================================================');
    console.log('🧪 ENTERPRISE CRM BACKEND AUTH & RBAC TEST RUNNER');
    console.log('======================================================');
    for (const r of results) {
      if (r.passed) {
        console.log(`✅ PASS: ${r.name}`);
      } else {
        console.error(`❌ FAIL: ${r.name} - ${r.error}`);
      }
    }
    console.log('======================================================');
    const total = results.length;
    const passCount = results.filter((r) => r.passed).length;
    console.log(`Summary: ${passCount}/${total} tests passed.`);
    console.log('======================================================\n');
    process.exit(passed ? 0 : 1);
  });
}
