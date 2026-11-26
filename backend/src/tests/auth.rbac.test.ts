import { PasswordService, TokenService, RbacService } from '../services';
import { AuthUser, UserRole, RolePermission } from '../types';
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
    // 3. 21 Canonical Capabilities Verification
    // =========================================================================
    assert(CANONICAL_CAPABILITIES.length === 21, 'Exactly 21 canonical capabilities are registered');

    const superAdminPerms = RbacService.getEffectivePermissions('Super Admin');
    assert(
      CANONICAL_CAPABILITIES.every((cap) => superAdminPerms[cap] === true),
      'Super Admin possesses all 21 canonical capabilities'
    );

    const adminPerms = RbacService.getEffectivePermissions('Admin');
    assert(adminPerms.canManageUsers === true, 'Admin has user management capability');
    assert(adminPerms.canManageSuperAdmin === false, 'Admin hard-safeguard: canManageSuperAdmin is FALSE');
    assert(adminPerms.canManageRoles === false, 'Admin hard-safeguard: canManageRoles is FALSE');

    const employeePerms = RbacService.getEffectivePermissions('Employee');
    assert(employeePerms.canViewIncomingLeads === false, 'Employee hard-safeguard: canViewIncomingLeads is FALSE');
    assert(employeePerms.canAssignIncomingLeads === false, 'Employee hard-safeguard: canAssignIncomingLeads is FALSE');
    assert(employeePerms.canDeleteLeads === false, 'Employee cannot delete leads');

    // =========================================================================
    // 4. Critical Rule: Dynamic Permissions May REDUCE Access Only, NEVER Expand
    // =========================================================================
    const fakeDynamicMatrix: RolePermission[] = [
      {
        ...DEFAULT_ROLE_PERMISSIONS.find((r) => r.role === 'Employee')!,
        canViewAllLeads: true, // Attempted illegal expansion
        canManageRoles: true, // Attempted illegal expansion
        canManageSuperAdmin: true, // Attempted illegal expansion
        canViewIncomingLeads: true, // Attempted illegal expansion
      },
      {
        ...DEFAULT_ROLE_PERMISSIONS.find((r) => r.role === 'Manager')!,
        canCreateLeads: false, // Legal reduction
      },
    ];

    const tamperedEmployeePerms = RbacService.getEffectivePermissions('Employee', fakeDynamicMatrix);
    assert(tamperedEmployeePerms.canViewAllLeads === false, 'Dynamic permission clamp: cannot expand Employee canViewAllLeads');
    assert(tamperedEmployeePerms.canManageRoles === false, 'Dynamic permission clamp: cannot expand Employee canManageRoles');
    assert(tamperedEmployeePerms.canManageSuperAdmin === false, 'Dynamic permission clamp: cannot expand Employee canManageSuperAdmin');
    assert(tamperedEmployeePerms.canViewIncomingLeads === false, 'Dynamic permission clamp: cannot expand Employee canViewIncomingLeads');

    const reducedManagerPerms = RbacService.getEffectivePermissions('Manager', fakeDynamicMatrix);
    assert(reducedManagerPerms.canCreateLeads === false, 'Dynamic permission allows legal access reduction');

    // =========================================================================
    // 5. Critical Rule: Target User Management Authority
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

    const managerTarget: AuthUser = {
      id: 'mgr-1',
      name: 'Manager',
      email: 'mgr@test.com',
      role: 'Manager',
      status: 'active',
      isActive: true,
      createdAt: '2026-01-01',
    };

    const employeeTarget: AuthUser = {
      id: 'emp-1',
      name: 'Employee',
      email: 'emp@test.com',
      role: 'Employee',
      status: 'active',
      isActive: true,
      createdAt: '2026-01-01',
    };

    assert(RbacService.canManageTargetUser(superAdminActor, adminTarget), 'Super Admin can manage Admin accounts');
    assert(!RbacService.canManageTargetUser(adminActor, superAdminActor), 'Admin CANNOT manage Super Admin account');
    assert(!RbacService.canManageTargetUser(adminActor, adminTarget), 'Admin CANNOT manage another Admin account (Only Super Admin can manage Admins)');
    assert(RbacService.canManageTargetUser(adminActor, managerTarget), 'Admin can manage Manager account');
    assert(RbacService.canManageTargetUser(adminActor, employeeTarget), 'Admin can manage Employee account');
    assert(!RbacService.canManageTargetUser(employeeTarget, managerTarget), 'Employee cannot manage other accounts');

    // =========================================================================
    // 6. Critical Rule: Target Role Creation Authority
    // =========================================================================
    const superAdminAllowedRoles = RbacService.getAllowedTargetRoles(superAdminActor);
    assert(
      superAdminAllowedRoles.includes('Admin') && superAdminAllowedRoles.includes('Employee'),
      'Super Admin can create Admin, Manager, Team Lead, Employee'
    );

    const adminAllowedRoles = RbacService.getAllowedTargetRoles(adminActor);
    assert(
      !adminAllowedRoles.includes('Admin') && !adminAllowedRoles.includes('Super Admin'),
      'Admin CANNOT create Admin or Super Admin accounts'
    );
    assert(
      adminAllowedRoles.includes('Manager') && adminAllowedRoles.includes('Employee'),
      'Admin can create operational accounts (Manager, Team Lead, Employee)'
    );

    const employeeAllowedRoles = RbacService.getAllowedTargetRoles(employeeTarget);
    assert(employeeAllowedRoles.length === 0, 'Employee has zero user creation authority');

    // =========================================================================
    // 7. Critical Rule: Roles & Permissions Matrix is Super Admin Only
    // =========================================================================
    assert(RbacService.canManageRolesMatrix(superAdminActor), 'Super Admin can manage Roles & Permissions matrix');
    assert(!RbacService.canManageRolesMatrix(adminActor), 'Admin CANNOT manage Roles & Permissions matrix');
    assert(!RbacService.canManageRolesMatrix(employeeTarget), 'Employee CANNOT manage Roles & Permissions matrix');

    // =========================================================================
    // 8. Critical Rule: Hierarchy Scope & Secondary Team Membership
    // =========================================================================
    const managerActor: AuthUser = {
      id: 'mgr-1',
      name: 'Manager One',
      email: 'mgr@test.com',
      role: 'Manager',
      teamId: 'team-primary',
      secondaryTeamIds: ['team-secondary'], // Secondary team membership
      status: 'active',
      isActive: true,
      createdAt: '2026-01-01',
    };

    const teamLeadUser: AuthUser = {
      id: 'tl-1',
      name: 'Team Lead One',
      email: 'tl@test.com',
      role: 'Team Lead',
      teamId: 'team-primary',
      managerId: 'mgr-1',
      status: 'active',
      isActive: true,
      createdAt: '2026-01-01',
    };

    const empInPrimary: AuthUser = {
      id: 'emp-p',
      name: 'Employee Primary',
      email: 'empp@test.com',
      role: 'Employee',
      teamId: 'team-primary',
      managerId: 'mgr-1',
      status: 'active',
      isActive: true,
      createdAt: '2026-01-01',
    };

    const empInSecondary: AuthUser = {
      id: 'emp-s',
      name: 'Employee Secondary',
      email: 'emps@test.com',
      role: 'Employee',
      teamId: 'team-secondary',
      managerId: 'other-manager',
      status: 'active',
      isActive: true,
      createdAt: '2026-01-01',
    };

    const teams = [
      { id: 'team-primary', managerId: 'mgr-1', leaderId: 'tl-1' },
      { id: 'team-secondary', managerId: 'other-manager', leaderId: 'other-leader' },
    ];

    const allUsers = [superAdminActor, adminActor, managerActor, teamLeadUser, empInPrimary, empInSecondary];

    const managerScope = RbacService.getHierarchyScope(managerActor, allUsers, teams);
    assert(managerScope.managedTeamIds.includes('team-primary'), 'Manager scope includes primary managed team');
    assert(!managerScope.managedTeamIds.includes('team-secondary'), 'Secondary team membership DOES NOT grant supervisory authority');
    assert(managerScope.subordinateUserIds.includes('emp-p'), 'Manager scope includes primary team subordinates');
    assert(!managerScope.subordinateUserIds.includes('emp-s'), 'Manager scope excludes secondary team employees');

    const employeeScope = RbacService.getHierarchyScope(empInPrimary, allUsers, teams);
    assert(employeeScope.subordinateUserIds.length === 1 && employeeScope.subordinateUserIds[0] === 'emp-p', 'Employee scope is strictly self-only');

    // =========================================================================
    // 9. Lead Hard Scope Ceiling
    // =========================================================================
    const mockLeads = [
      { id: 'lead-1', assignedToId: 'emp-p', teamId: 'team-primary' },
      { id: 'lead-2', assignedToId: 'emp-s', teamId: 'team-secondary' },
      { id: 'lead-3', assignedToId: 'mgr-1', teamId: 'team-primary' },
    ];

    const employeeLeads = RbacService.getHardScopedLeadIds(empInPrimary, mockLeads, employeeScope);
    assert(employeeLeads.length === 1 && employeeLeads[0] === 'lead-1', 'Employee hard scope ceiling strictly yields self-assigned lead');

    const managerLeads = RbacService.getHardScopedLeadIds(managerActor, mockLeads, managerScope);
    assert(managerLeads.includes('lead-1') && managerLeads.includes('lead-3'), 'Manager hard scope includes self and managed team leads');
    assert(!managerLeads.includes('lead-2'), 'Manager hard scope strictly excludes outside department leads');

    // =========================================================================
    // 10. Inactive / Deactivated Account Authentication Rejection
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

// Auto-run if executed directly via CLI/runner
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
