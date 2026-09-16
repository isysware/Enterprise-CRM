import { RolePermission, User, Team, Lead, Client, FollowUp } from '../types';
import { DEFAULT_ROLE_PERMISSIONS } from '../data/mockData';

export interface HierarchyScope {
  managedTeamIds: string[];
  subordinateUserIds: string[];
  scopedTeamsList: Team[];
  scopedUsersList: User[];
  assignableUsersList: User[];
}

/**
 * Resolves the dynamic role permissions for the current user from the active matrix.
 */
export function getEffectivePermissions(
  currentUser: User | null,
  rolePermissions: RolePermission[]
): RolePermission | null {
  if (!currentUser) return null;
  const found = rolePermissions.find(r => r.role === currentUser.role);
  if (found) return found;
  const def = DEFAULT_ROLE_PERMISSIONS.find(r => r.role === currentUser.role);
  return def || null;
}

/**
 * Checks if a specific capability is enabled in the dynamic matrix for the current user.
 */
export function hasCapability(
  currentUser: User | null,
  rolePerms: RolePermission | null,
  capability: keyof Omit<RolePermission, 'role' | 'description'>
): boolean {
  if (!currentUser || !rolePerms) return false;
  return Boolean(rolePerms[capability]);
}

/**
 * Resolves the operational hierarchy scope (teams, subordinates, and assignable targets)
 * based strictly on the user's organizational relationship.
 * 
 * IMPORTANT: Visibility permissions (e.g. Global Lead Visibility) MUST NOT expand
 * operational action hierarchies or assignable targets.
 */
export function getHierarchyScope(
  currentUser: User | null,
  users: User[],
  teams: Team[]
): HierarchyScope {
  if (!currentUser) {
    return {
      managedTeamIds: [],
      subordinateUserIds: [],
      scopedTeamsList: [],
      scopedUsersList: [],
      assignableUsersList: []
    };
  }

  const role = currentUser.role;

  // 1. Super Admin: Organization-wide scope
  if (role === 'Super Admin') {
    return {
      managedTeamIds: teams.map(t => t.id),
      subordinateUserIds: users.map(u => u.id),
      scopedTeamsList: teams,
      scopedUsersList: users,
      assignableUsersList: users.filter(u => u.isActive)
    };
  }

  // 2. Admin: Organization-wide operational scope (Super Admin excluded from targets/subordinates)
  if (role === 'Admin') {
    return {
      managedTeamIds: teams.map(t => t.id),
      subordinateUserIds: users.filter(u => u.role !== 'Super Admin').map(u => u.id),
      scopedTeamsList: teams,
      scopedUsersList: users,
      assignableUsersList: users.filter(u => u.isActive && u.role !== 'Super Admin')
    };
  }

  // 3. Manager: Operational scope is strictly their assigned department / team hierarchy
  if (role === 'Manager') {
    const managedTeams = teams.filter(
      t => t.managerId === currentUser.id ||
           t.managerName === currentUser.name ||
           t.id === currentUser.teamId
    );
    const managedTeamIds = managedTeams.map(t => t.id);

    const subUsers = users.filter(
      u => u.id === currentUser.id ||
           (u.teamId && managedTeamIds.includes(u.teamId)) ||
           u.managerName === currentUser.name ||
           u.managerId === currentUser.id
    );
    const subordinateUserIds = subUsers.map(u => u.id);

    // Can only assign to themselves and active Team Leads / Employees within their own team/hierarchy
    const assignableUsersList = subUsers.filter(u => {
      if (!u.isActive) return false;
      if (u.id === currentUser.id) return true;
      if (u.role === 'Super Admin' || u.role === 'Admin') return false;
      if (u.role === 'Manager') return false; // Cannot assign across outside managers
      return (u.teamId && managedTeamIds.includes(u.teamId)) || u.managerName === currentUser.name;
    });

    return {
      managedTeamIds,
      subordinateUserIds,
      scopedTeamsList: managedTeams.length > 0 ? managedTeams : teams.filter(t => t.id === currentUser.teamId),
      scopedUsersList: subUsers,
      assignableUsersList
    };
  }

  // 4. Team Lead: Operational scope is strictly their assigned sub-team & direct reporting Employees
  if (role === 'Team Lead') {
    const ledTeams = teams.filter(
      t => t.leaderId === currentUser.id ||
           t.leaderName === currentUser.name ||
           t.id === currentUser.teamId
    );
    const ledTeamIds = ledTeams.map(t => t.id);

    const subUsers = users.filter(
      u => u.id === currentUser.id ||
           (u.teamId && ledTeamIds.includes(u.teamId) && u.role === 'Employee') ||
           u.teamLeadName === currentUser.name ||
           u.teamLeadId === currentUser.id
    );
    const subordinateUserIds = subUsers.map(u => u.id);

    // Can only assign to themselves and direct reporting Employees
    const assignableUsersList = subUsers.filter(u => {
      if (!u.isActive) return false;
      if (u.id === currentUser.id) return true;
      if (u.role === 'Super Admin' || u.role === 'Admin' || u.role === 'Manager') return false;
      if (u.role === 'Team Lead') return false; // Cannot assign across outside team leads
      return u.role === 'Employee' && ((u.teamId && ledTeamIds.includes(u.teamId)) || u.teamLeadName === currentUser.name);
    });

    return {
      managedTeamIds: ledTeamIds,
      subordinateUserIds,
      scopedTeamsList: ledTeams.length > 0 ? ledTeams : teams.filter(t => t.id === currentUser.teamId),
      scopedUsersList: subUsers,
      assignableUsersList
    };
  }

  // 5. Employee: Strictly locked to own account; no subordinate hierarchy; no cross-user assignment
  const selfUser = users.filter(u => u.id === currentUser.id);
  const selfTeam = teams.filter(t => t.id === currentUser.teamId);

  return {
    managedTeamIds: currentUser.teamId ? [currentUser.teamId] : [],
    subordinateUserIds: [currentUser.id],
    scopedTeamsList: selfTeam,
    scopedUsersList: selfUser,
    assignableUsersList: selfUser.filter(u => u.isActive)
  };
}

/**
 * Resolves the hard record scope for leads based strictly on organizational hierarchy.
 * Super Admin/Admin: Organization-wide.
 * Manager: Assigned department/team hierarchy (self + subordinates + managed teams).
 * Team Lead: Assigned sub-team (self + direct employees + led teams).
 * Employee: Strictly self-assigned leads.
 */
export function getHardScopedLeads(
  leads: Lead[],
  currentUser: User | null,
  hierarchy: HierarchyScope
): Lead[] {
  if (!currentUser) return [];

  if (currentUser.role === 'Super Admin' || currentUser.role === 'Admin') {
    return leads;
  }

  if (currentUser.role === 'Manager' || currentUser.role === 'Team Lead') {
    return leads.filter(l =>
      l.assignedToId === currentUser.id ||
      hierarchy.subordinateUserIds.includes(l.assignedToId) ||
      (Boolean(l.teamId) && hierarchy.managedTeamIds.includes(l.teamId))
    );
  }

  // Employee: Hard scope ceiling is STRICTLY records assigned to themselves
  return leads.filter(l => l.assignedToId === currentUser.id);
}

/**
 * Evaluates visibility of leads based on dynamic visibility capabilities applied
 * strictly within the user's hard organizational scope ceiling.
 * 
 * IMPORTANT: A capability like `canViewAllLeads` can NEVER expand beyond the hard scope ceiling.
 */
export function getScopedLeads(
  leads: Lead[],
  currentUser: User | null,
  rolePerms: RolePermission | null,
  hierarchy: HierarchyScope
): Lead[] {
  if (!currentUser || !rolePerms) return [];

  // 1. Constrain to hard organizational scope ceiling first
  const hardScopedLeads = getHardScopedLeads(leads, currentUser, hierarchy);

  // 2. Evaluate dynamic visibility capabilities within hard scope ceiling
  if (rolePerms.canViewAllLeads || rolePerms.canViewTeamLeads) {
    return hardScopedLeads;
  }

  // Assigned direct visibility (Strictly self-assigned leads within ceiling)
  if (rolePerms.canViewAssignedLeads) {
    return hardScopedLeads.filter(l => l.assignedToId === currentUser.id);
  }

  return [];
}

/**
 * Checks if the current user is authorized to edit a specific lead.
 * Requires:
 * 1. Dynamic capability `canEditAllLeads` is ON.
 * 2. Lead record is within the actor's authorized operational hierarchy.
 * 
 * Note: Global visibility alone does NOT grant edit authority over outside records.
 */
export function canEditLead(
  lead: Lead,
  currentUser: User | null,
  rolePerms: RolePermission | null,
  hierarchy: HierarchyScope
): boolean {
  if (!currentUser || !rolePerms) return false;
  if (!rolePerms.canEditAllLeads) return false;

  // Super Admin & Admin have organization-wide edit authority for scoped operational leads
  if (currentUser.role === 'Super Admin' || currentUser.role === 'Admin') {
    return true;
  }

  // Manager & Team Lead: Must be within their managed hierarchy or assigned to them
  if (currentUser.role === 'Manager' || currentUser.role === 'Team Lead') {
    return (
      lead.assignedToId === currentUser.id ||
      hierarchy.subordinateUserIds.includes(lead.assignedToId) ||
      Boolean(lead.teamId && hierarchy.managedTeamIds.includes(lead.teamId))
    );
  }

  // Employee: Strictly leads assigned to themselves
  return lead.assignedToId === currentUser.id;
}

/**
 * Checks if the current user is authorized to delete a specific lead.
 * Requires:
 * 1. Dynamic capability `canDeleteLeads` is ON.
 * 2. Lead record is within the actor's authorized operational hierarchy.
 */
export function canDeleteLead(
  lead: Lead,
  currentUser: User | null,
  rolePerms: RolePermission | null,
  hierarchy: HierarchyScope
): boolean {
  if (!currentUser || !rolePerms) return false;
  if (!rolePerms.canDeleteLeads) return false;

  // Super Admin & Admin have organization-wide delete authority
  if (currentUser.role === 'Super Admin' || currentUser.role === 'Admin') {
    return true;
  }

  // Manager & Team Lead: Must be within their managed hierarchy or assigned to them
  if (currentUser.role === 'Manager' || currentUser.role === 'Team Lead') {
    return (
      lead.assignedToId === currentUser.id ||
      hierarchy.subordinateUserIds.includes(lead.assignedToId) ||
      Boolean(lead.teamId && hierarchy.managedTeamIds.includes(lead.teamId))
    );
  }

  // Employee: Strictly own assigned leads (if capability is granted)
  return lead.assignedToId === currentUser.id;
}

/**
 * Checks if the current user is authorized to initiate reassignment for a specific lead.
 * Requires:
 * 1. Dynamic capability `canReassignLeads` is ON.
 * 2. Actor is NOT Employee (Employee has no subordinate hierarchy for cross-user assignment).
 * 3. Lead record is within the actor's authorized operational hierarchy.
 */
export function canReassignLead(
  lead: Lead,
  currentUser: User | null,
  rolePerms: RolePermission | null,
  hierarchy: HierarchyScope
): boolean {
  if (!currentUser || !rolePerms) return false;
  if (!rolePerms.canReassignLeads) return false;
  if (currentUser.role === 'Employee') return false;

  // Super Admin & Admin can reassign any lead in the pipeline
  if (currentUser.role === 'Super Admin' || currentUser.role === 'Admin') {
    return true;
  }

  // Manager & Team Lead: Must be within their managed hierarchy or assigned to them
  if (currentUser.role === 'Manager' || currentUser.role === 'Team Lead') {
    return (
      lead.assignedToId === currentUser.id ||
      hierarchy.subordinateUserIds.includes(lead.assignedToId) ||
      Boolean(lead.teamId && hierarchy.managedTeamIds.includes(lead.teamId))
    );
  }

  return false;
}

/**
 * Validates whether a target user is a valid assignment recipient for the current user.
 */
export function isUserAssignable(
  targetUser: User,
  currentUser: User | null,
  hierarchy: HierarchyScope
): boolean {
  if (!currentUser || !targetUser.isActive) return false;
  // Safeguard: Admin cannot assign to Super Admin
  if (currentUser.role === 'Admin' && targetUser.role === 'Super Admin') return false;
  return hierarchy.assignableUsersList.some(u => u.id === targetUser.id);
}

/**
 * Validates if the current user can manage a target user account.
 * Enforces the critical safeguard: Admin can NEVER manage a Super Admin account.
 */
export function canManageSuperAdminAccount(
  targetUser: User,
  currentUser: User | null,
  rolePerms: RolePermission | null
): boolean {
  if (!currentUser || !rolePerms) return false;

  // Safeguard: Super Admin accounts can ONLY be managed by a Super Admin with canManageSuperAdmin capability
  if (targetUser.role === 'Super Admin') {
    return currentUser.role === 'Super Admin' && Boolean(rolePerms.canManageSuperAdmin);
  }

  return Boolean(rolePerms.canManageUsers);
}

/**
 * Checks if the current user is authorized to manage a user account (CRUD/Status/Password).
 */
export function canManageUser(
  targetUser: User,
  currentUser: User | null,
  rolePerms: RolePermission | null,
  hierarchy: HierarchyScope
): boolean {
  if (!currentUser || !rolePerms || !rolePerms.canManageUsers) return false;

  // Safeguard against managing Super Admin accounts
  if (targetUser.role === 'Super Admin') {
    return currentUser.role === 'Super Admin' && Boolean(rolePerms.canManageSuperAdmin);
  }

  // Super Admin & Admin have broad user management authority for non-Super Admins
  if (currentUser.role === 'Super Admin' || currentUser.role === 'Admin') {
    return true;
  }

  // Other roles (if granted canManageUsers in matrix) can only manage their own subordinates
  return hierarchy.subordinateUserIds.includes(targetUser.id);
}

/**
 * Resolves the hard record scope for clients based strictly on organizational hierarchy.
 */
export function getHardScopedClients(
  clients: Client[],
  currentUser: User | null,
  hierarchy: HierarchyScope
): Client[] {
  if (!currentUser) return [];

  if (currentUser.role === 'Super Admin' || currentUser.role === 'Admin') {
    return clients;
  }

  if (currentUser.role === 'Manager' || currentUser.role === 'Team Lead') {
    return clients.filter(c =>
      !c.assignedToId ||
      c.assignedToId === currentUser.id ||
      hierarchy.subordinateUserIds.includes(c.assignedToId)
    );
  }

  // Employee: Strictly assigned clients
  return clients.filter(c => c.assignedToId === currentUser.id);
}

/**
 * Evaluates visibility and access for client accounts subject to the hard scope ceiling.
 */
export function getScopedClients(
  clients: Client[],
  currentUser: User | null,
  rolePerms: RolePermission | null,
  hierarchy: HierarchyScope
): Client[] {
  if (!currentUser || !rolePerms || !rolePerms.canViewClients) return [];
  return getHardScopedClients(clients, currentUser, hierarchy);
}

/**
 * Resolves the hard record scope for follow-ups based strictly on organizational hierarchy.
 */
export function getHardScopedFollowUps(
  followUps: FollowUp[],
  currentUser: User | null,
  hierarchy: HierarchyScope
): FollowUp[] {
  if (!currentUser) return [];

  if (currentUser.role === 'Super Admin' || currentUser.role === 'Admin') {
    return followUps;
  }

  if (currentUser.role === 'Manager' || currentUser.role === 'Team Lead') {
    return followUps.filter(f =>
      f.assignedToId === currentUser.id ||
      hierarchy.subordinateUserIds.includes(f.assignedToId)
    );
  }

  // Employee: Strictly assigned follow-ups
  return followUps.filter(f => f.assignedToId === currentUser.id);
}

/**
 * Evaluates visibility and access for follow-ups subject to the hard scope ceiling.
 */
export function getScopedFollowUps(
  followUps: FollowUp[],
  currentUser: User | null,
  rolePerms: RolePermission | null,
  hierarchy: HierarchyScope
): FollowUp[] {
  if (!currentUser || !rolePerms) return [];

  const hardScoped = getHardScopedFollowUps(followUps, currentUser, hierarchy);

  if (rolePerms.canViewAllLeads || rolePerms.canViewTeamLeads) {
    return hardScoped;
  }

  if (rolePerms.canViewAssignedLeads) {
    return hardScoped.filter(f => f.assignedToId === currentUser.id);
  }

  return [];
}
