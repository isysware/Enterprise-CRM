import {
  getHierarchyScope,
  getScopedLeads,
  getScopedFollowUps,
  getScopedClients,
  canEditLead,
  canDeleteLead,
  canReassignLead,
  isUserAssignable,
  canManageUser,
  canManageSuperAdminAccount
} from './authorization';
import { User, Team, Lead, FollowUp, Client, RolePermission } from '../types';
import { DEFAULT_ROLE_PERMISSIONS } from '../data/mockData';

export function runAuthorizationTests(): { passed: boolean; results: string[] } {
  const results: string[] = [];
  let allPassed = true;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      results.push(`✅ PASS: ${testName}`);
    } else {
      results.push(`❌ FAIL: ${testName}`);
      allPassed = false;
    }
  }

  // Setup Mock Entities
  const superAdminUser: User = {
    id: 'u-sa',
    name: 'Super Admin',
    email: 'sa@test.com',
    role: 'Super Admin',
    phone: '+92 300 1111111',
    avatar: 'https://images.unsplash.com/photo-1',
    isActive: true,
    createdAt: '2026-01-01'
  };

  const adminUser: User = {
    id: 'u-adm',
    name: 'Admin User',
    email: 'adm@test.com',
    role: 'Admin',
    phone: '+92 300 2222222',
    avatar: 'https://images.unsplash.com/photo-2',
    isActive: true,
    createdAt: '2026-01-01'
  };

  const managerA: User = {
    id: 'u-mga',
    name: 'Manager Alpha',
    email: 'mga@test.com',
    role: 'Manager',
    teamId: 'team-a',
    phone: '+92 300 3333333',
    avatar: 'https://images.unsplash.com/photo-3',
    isActive: true,
    createdAt: '2026-01-01'
  };

  const managerB: User = {
    id: 'u-mgb',
    name: 'Manager Beta',
    email: 'mgb@test.com',
    role: 'Manager',
    teamId: 'team-b',
    phone: '+92 300 4444444',
    avatar: 'https://images.unsplash.com/photo-4',
    isActive: true,
    createdAt: '2026-01-01'
  };

  const teamLeadA: User = {
    id: 'u-tla',
    name: 'Team Lead Alpha',
    email: 'tla@test.com',
    role: 'Team Lead',
    teamId: 'team-a',
    managerId: 'u-mga',
    managerName: 'Manager Alpha',
    phone: '+92 300 5555555',
    avatar: 'https://images.unsplash.com/photo-5',
    isActive: true,
    createdAt: '2026-01-01'
  };

  const teamLeadB: User = {
    id: 'u-tlb',
    name: 'Team Lead Beta',
    email: 'tlb@test.com',
    role: 'Team Lead',
    teamId: 'team-b',
    managerId: 'u-mgb',
    managerName: 'Manager Beta',
    phone: '+92 300 6666666',
    avatar: 'https://images.unsplash.com/photo-6',
    isActive: true,
    createdAt: '2026-01-01'
  };

  const employeeA: User = {
    id: 'u-ea',
    name: 'Employee Alpha',
    email: 'ea@test.com',
    role: 'Employee',
    teamId: 'team-a',
    teamLeadId: 'u-tla',
    teamLeadName: 'Team Lead Alpha',
    managerId: 'u-mga',
    managerName: 'Manager Alpha',
    phone: '+92 300 7777777',
    avatar: 'https://images.unsplash.com/photo-7',
    isActive: true,
    createdAt: '2026-01-01'
  };

  const employeeB: User = {
    id: 'u-eb',
    name: 'Employee Beta',
    email: 'eb@test.com',
    role: 'Employee',
    teamId: 'team-b',
    teamLeadId: 'u-tlb',
    teamLeadName: 'Team Lead Beta',
    managerId: 'u-mgb',
    managerName: 'Manager Beta',
    phone: '+92 300 8888888',
    avatar: 'https://images.unsplash.com/photo-8',
    isActive: true,
    createdAt: '2026-01-01'
  };

  const allUsers: User[] = [
    superAdminUser,
    adminUser,
    managerA,
    managerB,
    teamLeadA,
    teamLeadB,
    employeeA,
    employeeB
  ];

  const teamA: Team = {
    id: 'team-a',
    name: 'Team Alpha',
    description: 'Alpha team',
    managerId: 'u-mga',
    managerName: 'Manager Alpha',
    leaderId: 'u-tla',
    leaderName: 'Team Lead Alpha',
    memberIds: ['u-mga', 'u-tla', 'u-ea'],
    createdAt: '2026-01-01'
  };

  const teamB: Team = {
    id: 'team-b',
    name: 'Team Beta',
    description: 'Beta team',
    managerId: 'u-mgb',
    managerName: 'Manager Beta',
    leaderId: 'u-tlb',
    leaderName: 'Team Lead Beta',
    memberIds: ['u-mgb', 'u-tlb', 'u-eb'],
    createdAt: '2026-01-01'
  };

  const allTeams: Team[] = [teamA, teamB];

  const leadMgA: Lead = {
    id: 'lead-mga',
    name: 'Lead Mgr A',
    businessName: 'Business A',
    phone: '+92 300 111',
    email: 'a@biz.com',
    city: 'Lahore',
    assignedToId: 'u-mga',
    assignedToName: 'Manager Alpha',
    teamId: 'team-a',
    teamName: 'Team Alpha',
    tags: [],
    notes: '',
    status: 'New',
    priority: 'Medium',
    quality: 'Good',
    source: 'Website',
    services: ['Web'],
    valuePKR: 10000,
    createdAt: '2026-01-01',
    lastContactDate: '2026-01-01',
    activities: []
  };

  const leadTlA: Lead = {
    id: 'lead-tla',
    name: 'Lead TL A',
    businessName: 'Business TLA',
    phone: '+92 300 222',
    email: 'tla@biz.com',
    city: 'Karachi',
    assignedToId: 'u-tla',
    assignedToName: 'Team Lead Alpha',
    teamId: 'team-a',
    teamName: 'Team Alpha',
    tags: [],
    notes: '',
    status: 'New',
    priority: 'Medium',
    quality: 'Good',
    source: 'Website',
    services: ['Web'],
    valuePKR: 15000,
    createdAt: '2026-01-01',
    lastContactDate: '2026-01-01',
    activities: []
  };

  const leadEmpA: Lead = {
    id: 'lead-ea',
    name: 'Lead Emp A',
    businessName: 'Business EA',
    phone: '+92 300 333',
    email: 'ea@biz.com',
    city: 'Islamabad',
    assignedToId: 'u-ea',
    assignedToName: 'Employee Alpha',
    teamId: 'team-a',
    teamName: 'Team Alpha',
    tags: [],
    notes: '',
    status: 'New',
    priority: 'Medium',
    quality: 'Good',
    source: 'Website',
    services: ['Web'],
    valuePKR: 20000,
    createdAt: '2026-01-01',
    lastContactDate: '2026-01-01',
    activities: []
  };

  const leadMgB: Lead = {
    id: 'lead-mgb',
    name: 'Lead Mgr B',
    businessName: 'Business MGB',
    phone: '+92 300 444',
    email: 'mgb@biz.com',
    city: 'Lahore',
    assignedToId: 'u-mgb',
    assignedToName: 'Manager Beta',
    teamId: 'team-b',
    teamName: 'Team Beta',
    tags: [],
    notes: '',
    status: 'New',
    priority: 'Medium',
    quality: 'Good',
    source: 'Website',
    services: ['App'],
    valuePKR: 30000,
    createdAt: '2026-01-01',
    lastContactDate: '2026-01-01',
    activities: []
  };

  const leadTlB: Lead = {
    id: 'lead-tlb',
    name: 'Lead TL B',
    businessName: 'Business TLB',
    phone: '+92 300 555',
    email: 'tlb@biz.com',
    city: 'Karachi',
    assignedToId: 'u-tlb',
    assignedToName: 'Team Lead Beta',
    teamId: 'team-b',
    teamName: 'Team Beta',
    tags: [],
    notes: '',
    status: 'New',
    priority: 'Medium',
    quality: 'Good',
    source: 'Website',
    services: ['App'],
    valuePKR: 25000,
    createdAt: '2026-01-01',
    lastContactDate: '2026-01-01',
    activities: []
  };

  const leadEmpB: Lead = {
    id: 'lead-eb',
    name: 'Lead Emp B',
    businessName: 'Business EB',
    phone: '+92 300 666',
    email: 'eb@biz.com',
    city: 'Islamabad',
    assignedToId: 'u-eb',
    assignedToName: 'Employee Beta',
    teamId: 'team-b',
    teamName: 'Team Beta',
    tags: [],
    notes: '',
    status: 'New',
    priority: 'Medium',
    quality: 'Good',
    source: 'Website',
    services: ['App'],
    valuePKR: 40000,
    createdAt: '2026-01-01',
    lastContactDate: '2026-01-01',
    activities: []
  };

  const allLeads: Lead[] = [leadMgA, leadTlA, leadEmpA, leadMgB, leadTlB, leadEmpB];

  // Permissions Templates
  const superAdminPerms: RolePermission = {
    role: 'Super Admin',
    description: '',
    canViewAllLeads: true,
    canViewTeamLeads: true,
    canViewAssignedLeads: true,
    canCreateLeads: true,
    canEditAllLeads: true,
    canDeleteLeads: true,
    canReassignLeads: true,
    canGenerateProposals: true,
    canBulkImportExport: true,
    canViewClients: true,
    canViewReports: true,
    canManageTeams: true,
    canManageServices: true,
    canManageUsers: true,
    canManageSuperAdmin: true,
    canManageRoles: true,
    canViewAuditLogs: true,
    canAccessSettings: true,
    canViewIncomingLeads: true,
    canAssignIncomingLeads: true,
    canManageIntegrations: true
  };

  const adminPerms: RolePermission = {
    ...superAdminPerms,
    role: 'Admin',
    canManageSuperAdmin: false
  };

  const managerPerms: RolePermission = {
    role: 'Manager',
    description: '',
    canViewAllLeads: true,
    canViewTeamLeads: true,
    canViewAssignedLeads: true,
    canCreateLeads: true,
    canEditAllLeads: true,
    canDeleteLeads: false,
    canReassignLeads: true,
    canGenerateProposals: true,
    canBulkImportExport: false,
    canViewClients: true,
    canViewReports: true,
    canManageTeams: false,
    canManageServices: false,
    canManageUsers: false,
    canManageSuperAdmin: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    canAccessSettings: false,
    canViewIncomingLeads: true,
    canAssignIncomingLeads: true,
    canManageIntegrations: false
  };

  const teamLeadPerms: RolePermission = {
    role: 'Team Lead',
    description: '',
    canViewAllLeads: false,
    canViewTeamLeads: true,
    canViewAssignedLeads: true,
    canCreateLeads: true,
    canEditAllLeads: true,
    canDeleteLeads: false,
    canReassignLeads: true,
    canGenerateProposals: false,
    canBulkImportExport: false,
    canViewClients: true,
    canViewReports: true,
    canManageTeams: false,
    canManageServices: false,
    canManageUsers: false,
    canManageSuperAdmin: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    canAccessSettings: false,
    canViewIncomingLeads: true,
    canAssignIncomingLeads: true,
    canManageIntegrations: false
  };

  const employeePerms: RolePermission = {
    role: 'Employee',
    description: '',
    canViewAllLeads: false,
    canViewTeamLeads: false,
    canViewAssignedLeads: true,
    canCreateLeads: true,
    canEditAllLeads: false,
    canDeleteLeads: false,
    canReassignLeads: false,
    canGenerateProposals: false,
    canBulkImportExport: false,
    canViewClients: true,
    canViewReports: false,
    canManageTeams: false,
    canManageServices: false,
    canManageUsers: false,
    canManageSuperAdmin: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    canAccessSettings: false,
    canViewIncomingLeads: false,
    canAssignIncomingLeads: false,
    canManageIntegrations: false
  };

  // 1. SUPER ADMIN TESTS
  const saHierarchy = getHierarchyScope(superAdminUser, allUsers, allTeams);
  const saLeads = getScopedLeads(allLeads, superAdminUser, superAdminPerms, saHierarchy);
  assert(saLeads.length === 6, 'Super Admin can see all 6 leads (Manager A + B)');
  assert(saLeads.some(l => l.id === 'lead-mga') && saLeads.some(l => l.id === 'lead-mgb'), 'Super Admin sees leads from both Manager A and B');

  // 2. ADMIN TESTS
  const admHierarchy = getHierarchyScope(adminUser, allUsers, allTeams);
  const admLeads = getScopedLeads(allLeads, adminUser, adminPerms, admHierarchy);
  assert(admLeads.length === 6, 'Admin can see all operational leads');
  assert(!canManageSuperAdminAccount(superAdminUser, adminUser, adminPerms), 'Admin CANNOT manage Super Admin account');
  assert(!canManageUser(superAdminUser, adminUser, adminPerms, admHierarchy), 'Admin CANNOT delete/modify Super Admin user');

  // 3. MANAGER A TESTS
  const mgAHierarchy = getHierarchyScope(managerA, allUsers, allTeams);
  const mgALeads = getScopedLeads(allLeads, managerA, managerPerms, mgAHierarchy);
  assert(mgALeads.length === 3, 'Manager A scoped to exactly 3 hierarchy leads');
  assert(mgALeads.some(l => l.id === 'lead-mga'), 'Manager A sees own lead');
  assert(mgALeads.some(l => l.id === 'lead-tla'), 'Manager A sees Team Lead A lead');
  assert(mgALeads.some(l => l.id === 'lead-ea'), 'Manager A sees Employee under Team Lead A lead');
  assert(!mgALeads.some(l => l.id === 'lead-mgb'), 'Manager A CANNOT see Manager B lead');
  assert(!mgALeads.some(l => l.id === 'lead-tlb'), 'Manager A CANNOT see Team Lead B lead');
  assert(!mgALeads.some(l => l.id === 'lead-eb'), 'Manager A CANNOT see Employee B lead');

  // 4. MANAGER A with canViewAllLeads = true MUST STILL NOT ESCAPE HIERARCHY CEILING
  const mgAPermsAllOn: RolePermission = { ...managerPerms, canViewAllLeads: true };
  const mgALeadsAllOn = getScopedLeads(allLeads, managerA, mgAPermsAllOn, mgAHierarchy);
  assert(mgALeadsAllOn.length === 3, 'Manager A with canViewAllLeads=true still strictly ceiling-capped at 3 leads');
  assert(!mgALeadsAllOn.some(l => l.id === 'lead-mgb'), 'Manager A with canViewAllLeads=true CANNOT escape to Manager B leads');

  // 5. TEAM LEAD A TESTS
  const tlAHierarchy = getHierarchyScope(teamLeadA, allUsers, allTeams);
  const tlALeads = getScopedLeads(allLeads, teamLeadA, teamLeadPerms, tlAHierarchy);
  assert(tlALeads.some(l => l.id === 'lead-tla'), 'Team Lead A sees own lead');
  assert(tlALeads.some(l => l.id === 'lead-ea'), 'Team Lead A sees direct Employee A lead');
  assert(!tlALeads.some(l => l.id === 'lead-tlb'), 'Team Lead A CANNOT see Team Lead B lead');
  assert(!tlALeads.some(l => l.id === 'lead-eb'), 'Team Lead A CANNOT see Employee B lead');

  // 6. TEAM LEAD A with canViewAllLeads = true MUST STILL NOT ESCAPE SUB-TEAM CEILING
  const tlAPermsAllOn: RolePermission = { ...teamLeadPerms, canViewAllLeads: true };
  const tlALeadsAllOn = getScopedLeads(allLeads, teamLeadA, tlAPermsAllOn, tlAHierarchy);
  assert(!tlALeadsAllOn.some(l => l.id === 'lead-mgb' || l.id === 'lead-tlb' || l.id === 'lead-eb'), 'Team Lead A with canViewAllLeads=true CANNOT see outside team records');

  // 7. EMPLOYEE A TESTS
  const eaHierarchy = getHierarchyScope(employeeA, allUsers, allTeams);
  const eaLeads = getScopedLeads(allLeads, employeeA, employeePerms, eaHierarchy);
  assert(eaLeads.length === 1 && eaLeads[0].id === 'lead-ea', 'Employee A sees only own lead');
  assert(!eaLeads.some(l => l.id === 'lead-eb'), 'Employee A CANNOT see Employee B');
  assert(!eaLeads.some(l => l.id === 'lead-tla'), 'Employee A CANNOT see Team Lead A lead');
  assert(!eaLeads.some(l => l.id === 'lead-mga'), 'Employee A CANNOT see Manager A lead');

  // 8. EMPLOYEE A with powerful permissions enabled MUST STILL NOT GAIN CROSS-USER ACCESS
  const eaPermsAllOn: RolePermission = {
    ...employeePerms,
    canViewAllLeads: true,
    canViewTeamLeads: true,
    canEditAllLeads: true,
    canReassignLeads: true
  };
  const eaLeadsAllOn = getScopedLeads(allLeads, employeeA, eaPermsAllOn, eaHierarchy);
  assert(eaLeadsAllOn.length === 1 && eaLeadsAllOn[0].id === 'lead-ea', 'Employee A with all visibility toggles on STILL only sees own lead');
  assert(!canReassignLead(leadEmpA, employeeA, eaPermsAllOn, eaHierarchy), 'Employee A CANNOT reassign even if toggle is ON');

  // 9. REASSIGNMENT CEILING TESTS
  assert(isUserAssignable(employeeA, managerA, mgAHierarchy), 'Manager A -> valid subordinate Employee A: allowed');
  assert(isUserAssignable(teamLeadA, managerA, mgAHierarchy), 'Manager A -> valid subordinate Team Lead A: allowed');
  assert(!isUserAssignable(employeeB, managerA, mgAHierarchy), 'Manager A -> Manager B employee: DENIED');
  assert(!isUserAssignable(managerB, managerA, mgAHierarchy), 'Manager A -> outside Manager B: DENIED');
  assert(!isUserAssignable(superAdminUser, managerA, mgAHierarchy), 'Manager A -> Super Admin: DENIED');

  assert(isUserAssignable(employeeA, teamLeadA, tlAHierarchy), 'Team Lead A -> direct employee A: allowed');
  assert(!isUserAssignable(employeeB, teamLeadA, tlAHierarchy), 'Team Lead A -> unrelated employee B: DENIED');
  assert(!isUserAssignable(teamLeadB, teamLeadA, tlAHierarchy), 'Team Lead A -> outside Team Lead B: DENIED');

  assert(!isUserAssignable(employeeB, employeeA, eaHierarchy), 'Employee A -> another employee: DENIED');

  // 10. CLIENTS CEILING TESTS
  const clientA: Client = {
    id: 'c-a',
    leadId: 'lead-ea',
    businessName: 'Alpha Corp',
    clientName: 'Client Alpha',
    email: 'alpha@client.com',
    phone: '123',
    city: 'Lahore',
    assignedToId: 'u-ea',
    assignedToName: 'Employee Alpha',
    services: ['Web'],
    source: 'Website',
    pricingModel: 'Monthly Subscription',
    finalPrice: 100000,
    currency: 'PKR',
    convertedDate: '2026-01-01',
    status: 'Active'
  };

  const clientB: Client = {
    id: 'c-b',
    leadId: 'lead-eb',
    businessName: 'Beta Corp',
    clientName: 'Client Beta',
    email: 'beta@client.com',
    phone: '456',
    city: 'Karachi',
    assignedToId: 'u-eb',
    assignedToName: 'Employee Beta',
    services: ['App'],
    source: 'Website',
    pricingModel: 'Monthly Subscription',
    finalPrice: 200000,
    currency: 'PKR',
    convertedDate: '2026-01-01',
    status: 'Active'
  };

  const allClients = [clientA, clientB];
  const mgAClients = getScopedClients(allClients, managerA, managerPerms, mgAHierarchy);
  assert(mgAClients.length === 1 && mgAClients[0].id === 'c-a', 'Manager A client scope strictly contains Client Alpha and excludes Client Beta');

  const eaClients = getScopedClients(allClients, employeeA, employeePerms, eaHierarchy);
  assert(eaClients.length === 1 && eaClients[0].id === 'c-a', 'Employee A client scope strictly contains Client Alpha and excludes Client Beta');

  // 11. FOLLOW-UPS CEILING TESTS
  const followUpA: FollowUp = {
    id: 'fu-a',
    leadId: 'lead-ea',
    clientName: 'Employee Alpha Contact',
    clientBusiness: 'Alpha Corp',
    phone: '+92 300 123',
    source: 'Website',
    type: 'Call',
    scheduledDate: '2026-08-20',
    scheduledTime: '10:00',
    status: 'Pending',
    notes: 'Note A',
    assignedToId: 'u-ea',
    assignedToName: 'Employee Alpha',
    createdAt: '2026-08-20'
  };

  const followUpB: FollowUp = {
    id: 'fu-b',
    leadId: 'lead-eb',
    clientName: 'Employee Beta Contact',
    clientBusiness: 'Beta Corp',
    phone: '+92 300 456',
    source: 'Website',
    type: 'Call',
    scheduledDate: '2026-08-20',
    scheduledTime: '11:00',
    status: 'Pending',
    notes: 'Note B',
    assignedToId: 'u-eb',
    assignedToName: 'Employee Beta',
    createdAt: '2026-08-20'
  };

  const allFollowUps = [followUpA, followUpB];
  const mgAFollowUps = getScopedFollowUps(allFollowUps, managerA, managerPerms, mgAHierarchy);
  assert(mgAFollowUps.length === 1 && mgAFollowUps[0].id === 'fu-a', 'Manager A follow-up scope strictly excludes Follow-Up B');

  const eaFollowUps = getScopedFollowUps(allFollowUps, employeeA, employeePerms, eaHierarchy);
  assert(eaFollowUps.length === 1 && eaFollowUps[0].id === 'fu-a', 'Employee A follow-up scope strictly excludes Follow-Up B');

  // 12. CANONICAL FACTORY MATRIX TESTS
  function countEnabledPerms(rolePerm: RolePermission): number {
    const keys: (keyof Omit<RolePermission, 'role' | 'description'>)[] = [
      'canViewAllLeads',
      'canViewTeamLeads',
      'canViewAssignedLeads',
      'canCreateLeads',
      'canEditAllLeads',
      'canDeleteLeads',
      'canReassignLeads',
      'canGenerateProposals',
      'canBulkImportExport',
      'canViewClients',
      'canViewReports',
      'canManageTeams',
      'canManageServices',
      'canManageUsers',
      'canManageSuperAdmin',
      'canManageRoles',
      'canViewAuditLogs',
      'canAccessSettings'
    ];
    return keys.filter(k => rolePerm[k] === true).length;
  }

  const defaultSA = DEFAULT_ROLE_PERMISSIONS.find(r => r.role === 'Super Admin')!;
  const defaultAdm = DEFAULT_ROLE_PERMISSIONS.find(r => r.role === 'Admin')!;
  const defaultMgr = DEFAULT_ROLE_PERMISSIONS.find(r => r.role === 'Manager')!;
  const defaultTL = DEFAULT_ROLE_PERMISSIONS.find(r => r.role === 'Team Lead')!;
  const defaultEmp = DEFAULT_ROLE_PERMISSIONS.find(r => r.role === 'Employee')!;

  assert(countEnabledPerms(defaultSA) === 18, 'Super Admin factory defaults have exactly 18/18 enabled');
  assert(countEnabledPerms(defaultAdm) === 17, 'Admin factory defaults have exactly 17/18 enabled');
  assert(countEnabledPerms(defaultMgr) === 9, 'Manager factory defaults have exactly 9/18 enabled');
  assert(countEnabledPerms(defaultTL) === 6, 'Team Lead factory defaults have exactly 6/18 enabled');
  assert(countEnabledPerms(defaultEmp) === 2, 'Employee factory defaults have exactly 2/18 enabled');

  assert(defaultMgr.canViewAllLeads === true, 'Manager default canViewAllLeads is TRUE');
  assert(defaultMgr.canBulkImportExport === false, 'Manager default canBulkImportExport is FALSE');

  assert(defaultTL.canViewAllLeads === false, 'Team Lead default canViewAllLeads is FALSE');
  assert(defaultTL.canViewAssignedLeads === false, 'Team Lead default canViewAssignedLeads is FALSE');
  assert(defaultTL.canGenerateProposals === false, 'Team Lead default canGenerateProposals is FALSE');

  assert(defaultEmp.canViewAssignedLeads === true, 'Employee default canViewAssignedLeads is TRUE');
  assert(defaultEmp.canCreateLeads === true, 'Employee default canCreateLeads is TRUE');
  assert(defaultEmp.canViewClients === false, 'Employee default canViewClients is FALSE');

  return { passed: allPassed, results };
}
