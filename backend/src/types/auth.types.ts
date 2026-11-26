import { Request } from 'express';

export type UserRole = 'Super Admin' | 'Admin' | 'Manager' | 'Team Lead' | 'Employee';

export type AccountStatus = 'active' | 'restricted' | 'inactive';

export interface RolePermission {
  role: UserRole;
  description: string;
  canViewAllLeads: boolean;
  canViewTeamLeads: boolean;
  canViewAssignedLeads: boolean;
  canEditAllLeads: boolean;
  canCreateLeads: boolean;
  canDeleteLeads: boolean;
  canReassignLeads: boolean;
  canGenerateProposals: boolean;
  canManageUsers: boolean;
  canManageSuperAdmin: boolean;
  canManageRoles: boolean;
  canManageTeams: boolean;
  canManageServices: boolean;
  canViewReports: boolean;
  canViewClients: boolean;
  canViewAuditLogs: boolean;
  canAccessSettings: boolean;
  canBulkImportExport: boolean;
  canViewIncomingLeads: boolean;
  canAssignIncomingLeads: boolean;
  canManageIntegrations: boolean;
}

export type CapabilityKey = keyof Omit<RolePermission, 'role' | 'description'>;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  isActive: boolean;
  teamId?: string;
  teamName?: string;
  managerId?: string;
  managerName?: string;
  teamLeadId?: string;
  teamLeadName?: string;
  secondaryTeamIds?: string[];
  avatar?: string;
  phone?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface HierarchyScope {
  managedTeamIds: string[];
  subordinateUserIds: string[];
  scopedTeamIds: string[];
  assignableUserIds: string[];
}

export interface JwtAccessPayload {
  userId: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  teamId?: string;
  type: 'access';
}

export interface JwtRefreshPayload {
  userId: string;
  tokenVersion: number;
  type: 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  permissions: RolePermission;
  scope: HierarchyScope;
}
