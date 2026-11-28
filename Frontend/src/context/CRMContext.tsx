'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useMemo, ReactNode } from 'react';
import {
  User,
  UserRole,
  Team,
  ServiceItem,
  Lead,
  FollowUp,
  FollowUpType,
  FollowUpStatus,
  Client,
  ActivityLog,
  SystemSettings,
  RolePermission,
  LeadFilterState,
  LeadStatus,
  Priority,
  LeadQuality,
  LeadSource,
  PricingModel,
  PricingModelItem,
  PricingModelField,
  Activity,
  Proposal,
  IncomingLead
} from '../types';
import {
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_SETTINGS
} from '../data/mockData';
import { getClientRevenue, getLocalDateString, classifyFollowUp } from '../utils/formatters';
import {
  normalizeLeadSource,
  normalizeLeadStatus,
  normalizePriority,
  normalizeLeadQuality,
  normalizeValuePKR
} from '../utils/csvParser';
import {
  getEffectivePermissions,
  getHierarchyScope,
  getScopedLeads,
  getScopedClients,
  getScopedFollowUps,
  canEditLead,
  canDeleteLead,
  canReassignLead,
  isUserAssignable as isUserAssignableAuth,
  canManageSuperAdminAccount as canManageSuperAdminAccountAuth,
  canManageUser as canManageUserAuth,
  canCreateUserWithRole as canCreateUserWithRoleAuth,
  canTransitionUserRole as canTransitionUserRoleAuth,
  getAllowedTargetRoles as getAllowedTargetRolesAuth
} from '../utils/authorization';
import {
  authApi,
  setAuthToken,
  usersApi,
  teamsApi,
  servicesApi,
  sourcesApi,
  rolesApi,
  pricingModelsApi,
  leadsApi,
  incomingLeadsApi,
  followUpsApi,
  clientsApi,
  proposalsApi,
  activityLogsApi,
  reportsApi,
  settingsApi,
  AuthUserDto,
  TeamDto,
  ServiceDto,
  PricingModelDto,
  RolePermissionMatrixDto,
  LeadDbDto,
  LeadActivityDto,
  IncomingLeadDbDto,
  FollowUpDbDto,
  ClientDbDto,
  ProposalDbDto,
  ActivityLogDbDto,
  CreateLeadPayload,
  UpdateLeadPayload,
  CreateFollowUpPayload,
  ConvertLeadPayload,
  CreateProposalPayload,
  UpdateProposalPayload
} from '../api';

interface CRMContextType {
  // Authentication & Current User
  currentUser: User | null;
  isAuthLoading: boolean;
  isDataLoading: boolean;
  users: User[];
  scopedUsers: User[];
  assignableUsers: User[];
  login: (email: string, pass: string, selectedRole?: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => void;

  // Users Admin
  addUser: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string; user?: User }>;
  updateUser: (user: User) => Promise<{ success: boolean; error?: string }>;
  changeMyPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  toggleUserStatus: (userId: string) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;

  // Reference Catalogs
  teams: Team[];
  scopedTeams: Team[];
  addTeam: (teamData: Omit<Team, 'id' | 'createdAt'>) => Promise<Team | null>;
  updateTeam: (team: Team) => Promise<Team | null>;
  deleteTeam: (teamId: string) => Promise<void>;

  services: ServiceItem[];
  addService: (serviceData: Omit<ServiceItem, 'id'>) => Promise<ServiceItem | null>;
  updateService: (service: ServiceItem) => Promise<ServiceItem | null>;
  deleteService: (serviceId: string) => Promise<void>;

  sources: string[];
  addSource: (source: string) => Promise<void> | void;
  updateSource: (oldSource: string, newSource: string) => Promise<void> | void;
  deleteSource: (source: string) => Promise<void> | void;

  rolePermissions: RolePermission[];
  updateRolePermission: (permission: RolePermission) => Promise<void> | void;
  saveAllRolePermissions: (permissions: RolePermission[]) => Promise<void> | void;
  resetRolePermissionsToDefault: () => Promise<void> | void;

  settings: SystemSettings;
  updateSettings: (settings: Partial<SystemSettings>, moduleKey?: string, moduleTitle?: string) => Promise<void> | void;

  // Pricing Models (Configurable)
  pricingModels: PricingModelItem[];
  addPricingModel: (model: Omit<PricingModelItem, 'id'>) => Promise<PricingModelItem | null> | void;
  updatePricingModel: (model: PricingModelItem) => Promise<PricingModelItem | null> | void;
  deletePricingModel: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Leads
  leads: Lead[];
  scopedLeads: Lead[];
  filterState: LeadFilterState;
  setFilterState: React.Dispatch<React.SetStateAction<LeadFilterState>>;
  filteredLeads: Lead[];
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'lastContactDate' | 'activities'>) => Promise<Lead | null> | void;
  updateLead: (lead: Lead) => Promise<boolean> | void;
  deleteLead: (leadId: string) => Promise<boolean> | boolean;
  reassignLead: (leadId: string, newUserId: string) => Promise<boolean> | void;
  changeLeadStatus: (leadId: string, newStatus: LeadStatus) => Promise<boolean> | void;
  addLeadActivity: (leadId: string, activity: Omit<Activity, 'id' | 'timestamp' | 'author'>) => Promise<void> | void;
  importLeads: (leadsToImport: Partial<Lead>[]) => number;

  // Follow-ups
  followUps: FollowUp[];
  scopedFollowUps: FollowUp[];
  addFollowUp: (followUp: Omit<FollowUp, 'id' | 'createdAt'>) => Promise<FollowUp | null> | void;
  completeFollowUp: (id: string, resultNotes?: string) => Promise<boolean> | void;
  rescheduleFollowUp: (id: string, newDate: string, newTime: string, notes?: string, type?: FollowUpType, assignedToId?: string) => Promise<boolean> | void;
  deleteFollowUp: (id: string) => Promise<boolean> | void;

  // Clients
  clients: Client[];
  scopedClients: Client[];
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (client: Client) => Promise<boolean> | void;
  convertLeadToClient: (leadId: string, clientData: Partial<Client>) => Client;
  returnClientToLead: (clientId: string) => Promise<boolean> | void;

  // Proposals
  proposals: Proposal[];
  addProposal: (proposal: Omit<Proposal, 'id' | 'createdAt'>) => Proposal;
  updateProposal: (proposal: Proposal) => Promise<boolean> | void;
  deleteProposal: (id: string) => void;

  // Incoming Leads
  incomingLeads: IncomingLead[];
  assignIncomingLead: (incomingId: string, assignedUserId: string) => Promise<boolean> | boolean;

  // Activity Logs
  activityLogs: ActivityLog[];
  logAction: (
    action: string,
    entityType: ActivityLog['entityType'],
    entityTitle: string,
    details: string,
    entityId?: string
  ) => void;

  // Dashboard Metrics
  metrics: {
    totalLeads: number;
    hotLeads: number;
    convertedLeads: number;
    lostLeads: number;
    todayFollowUps: number;
    missedFollowUps: number;
    newLeads: number;
    staleLeads: number;
    pendingFollowUps: number;
    statusBreakdown: Record<LeadStatus, number>;
    qualityBreakdown: Record<LeadQuality, number>;
    totalRevenuePKR: number;
  };

  // Helper RBAC Guards
  canAccessAdmin: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canManageTeams: boolean;
  canManageServices: boolean;
  canViewReports: boolean;
  canViewClients: boolean;
  canViewAuditLogs: boolean;
  canAccessSettings: boolean;
  canBulkImportExport: boolean;
  canCreateLeads: boolean;
  canViewAllLeads: boolean;
  canGenerateProposals: boolean;
  canManageFollowUps?: boolean;
  canViewIncomingLeads: boolean;
  canAssignIncomingLeads: boolean;
  canManageIntegrations: boolean;
  canManageSuperAdminAccount: (targetUser: User) => boolean;
  canManageUser: (targetUser: User) => boolean;
  canCreateUserWithRole: (targetRole: 'Super Admin' | 'Admin' | 'Manager' | 'Team Lead' | 'Employee') => boolean;
  canTransitionUserRole: (targetUser: User, newRole: 'Super Admin' | 'Admin' | 'Manager' | 'Team Lead' | 'Employee') => boolean;
  getAllowedTargetRoles: () => ('Super Admin' | 'Admin' | 'Manager' | 'Team Lead' | 'Employee')[];
  canEditLeadItem: (lead: Lead) => boolean;
  canDeleteLeadItem: (lead: Lead) => boolean;
  canReassignLeadItem: (lead: Lead) => boolean;
  isUserAssignable: (targetUser: User) => boolean;

  // Data Refresh
  refetchReferenceData: () => Promise<void>;
  refetchOperationalData?: () => Promise<void>;

  // Global reset
  resetToFactoryDefaults: () => Promise<void> | void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_PREFIX = 'apex_crm_enterprise_';

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
  clear: (): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  },
};

// Known legacy keys from prior development/mock storage
const OBSOLETE_LEGACY_KEYS = [
  // Session & Authentication
  'apex_crm_enterprise_current_user',
  'apex_crm_current_user',
  // Users & Roles
  'apex_crm_enterprise_users',
  'apex_crm_users',
  'apex_crm_enterprise_roles',
  'apex_crm_roles',
  // Notifications
  'apex_crm_read_notifications',
  'crm_notifications_read',
  // Reference Data
  'apex_crm_enterprise_teams',
  'apex_crm_teams',
  'apex_crm_enterprise_services',
  'apex_crm_services',
  'apex_crm_enterprise_sources',
  'apex_crm_sources',
  'apex_crm_enterprise_pricing_models',
  'apex_crm_pricing_models',
  // Operational Collections
  'apex_crm_enterprise_leads',
  'apex_crm_leads',
  'apex_crm_enterprise_follow_ups',
  'apex_crm_follow_ups',
  'apex_crm_enterprise_clients',
  'apex_crm_clients',
  'apex_crm_enterprise_proposals',
  'apex_crm_proposals',
  'apex_crm_enterprise_activity_logs',
  'apex_crm_activity_logs',
  'apex_crm_enterprise_incoming_leads',
  'apex_crm_incoming_leads',
  // Settings & Configuration
  'apex_crm_enterprise_settings',
  'apex_crm_settings',
  'apex_crm_enterprise_settings_branding',
  'apex_crm_enterprise_settings_letterhead',
  'apex_crm_enterprise_settings_pricing_config',
  'apex_crm_enterprise_settings_communication'
];

/**
 * Permanently purge all obsolete business/authentication/reference/settings localStorage keys.
 * Ensures PostgreSQL via REST API remains the single source of truth.
 */
export const purgeObsoleteLocalStorageKeys = (): void => {
  if (typeof window === 'undefined') return;
  try {
    // 1. Explicit targeted removal of known legacy keys
    for (const key of OBSOLETE_LEGACY_KEYS) {
      localStorage.removeItem(key);
    }
    // 2. Comprehensive sweep for any other apex_crm_ or crm_ keys that are NOT UI sidebar state
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('apex_crm_') || key.startsWith('crm_'))) {
        if (key !== 'crm_sidebar_collapsed') {
          toRemove.push(key);
        }
      }
    }
    for (const k of toRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
};

// Immediately invoke on script execution if in browser
if (typeof window !== 'undefined') {
  purgeObsoleteLocalStorageKeys();
}

// UUID / Email Validators & Normalizers
const toValidUuidOrNull = (id?: string | null): string | null => {
  if (!id) return null;
  const trimmed = id.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed) ? trimmed : null;
};

const normalizeDateOnly = (value?: string | null): string | null => {
  if (!value || !value.trim()) return null;
  const raw = value.trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/);
  if (!match) throw new Error(`Invalid date format: ${raw}`);
  const dateOnly = match[1];
  const parsed = new Date(`${dateOnly}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dateOnly) {
    throw new Error(`Invalid calendar date: ${raw}`);
  }
  return dateOnly;
};

const toValidEmailOrNull = (email?: string | null): string | null => {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
};

const mapFrontendActivityTypeToBackend = (type: string): 'Call' | 'Meeting' | 'Note' | 'Email' | 'WhatsApp' | 'Status Change' | 'Assignment' => {
  const lower = (type || '').toLowerCase();
  if (lower === 'call') return 'Call';
  if (lower === 'meeting') return 'Meeting';
  if (lower === 'whatsapp') return 'WhatsApp';
  if (lower === 'email') return 'Email';
  if (lower === 'stage_change' || lower === 'status change') return 'Status Change';
  if (lower === 'reassign' || lower === 'assignment') return 'Assignment';
  return 'Note';
};

// Reference DTO Mappers
const mapUserDto = (u: any): User => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone ? String(u.phone).replace(/\D/g, '').slice(0, 11) : '',
  role: u.role || u.role_name || u.roleName,
  isActive: u.status === 'active' || u.isActive === true || (u.is_active !== undefined ? u.is_active : true),
  teamId: u.teamId || u.team_id || undefined,
  teamName: u.teamName || u.team_name || undefined,
  managerId: u.managerId || u.manager_id || undefined,
  managerName: u.managerName || u.manager_name || undefined,
  teamLeadId: u.teamLeadId || u.team_lead_id || undefined,
  teamLeadName: u.teamLeadName || u.team_lead_name || undefined,
  avatar: u.avatarUrl || u.avatar_url || u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`,
  createdAt: u.createdAt || u.created_at || new Date().toISOString(),
  lastLogin: u.lastLogin || u.last_login
});

const mapTeamDto = (t: any): Team => ({
  id: t.id,
  name: t.name,
  code: t.code,
  description: t.description || '',
  managerId: t.managerId || t.manager_id || undefined,
  managerName: t.managerName || t.manager_name || undefined,
  leaderId: t.leaderId || t.teamLeadId || t.team_lead_id || undefined,
  leaderName: t.leaderName || t.teamLeadName || t.team_lead_name || undefined,
  status: t.status || (t.is_active === false ? 'inactive' : 'active'),
  memberIds: t.memberIds || t.member_ids || [],
  createdAt: t.createdAt || t.created_at || new Date().toISOString()
});

const mapServiceDto = (s: any): ServiceItem => {
  const price = Number(s.defaultPricePKR ?? s.default_price_pkr ?? s.basePricePKR ?? 0);
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    defaultPricePKR: price,
    basePricePKR: price,
    pricingModel: (s.pricingModelName || s.pricing_model_name || s.pricingModel || 'Monthly Subscription') as any,
    description: s.description || '',
    isActive: s.isActive !== undefined ? s.isActive !== false : (s.is_active !== false)
  };
};

const mapPricingModelDto = (pm: any): PricingModelItem => {
  const defaultVals = pm.defaultValues || pm.default_values || {};
  const rawFields = pm.fieldSchema || pm.field_schema || pm.fields || [];
  const fields: PricingModelField[] = Array.isArray(rawFields)
    ? rawFields.map((f: any, idx: number) => ({
      id: f.id || `f-${idx}-${Date.now()}`,
      label: f.label || 'Field',
      key: f.key || `field_${idx}`,
      type: f.type || 'text',
      options: f.options || [],
      defaultValue: f.defaultValue ?? f.default_value,
      placeholder: f.placeholder,
      isRequired: Boolean(f.isRequired ?? f.required),
      includeInTotal: Boolean(f.includeInTotal ?? f.include_in_total)
    }))
    : [];

  return {
    id: pm.id,
    name: pm.name,
    billingType: (pm.billingType || pm.billing_type || 'Recurring') as any,
    defaultSetupFeePKR: Number(defaultVals.defaultSetupFeePKR ?? pm.defaultSetupFeePKR ?? 0),
    defaultBillingFrequency: defaultVals.defaultBillingFrequency || pm.defaultBillingFrequency || 'Monthly',
    description: pm.description || '',
    isActive: (pm.isActive !== undefined ? pm.isActive : pm.is_active) !== false,
    isSystemDefault: Boolean(pm.isDefault ?? pm.is_default ?? pm.isSystemDefault),
    createdAt: pm.createdAt || pm.created_at,
    fields
  };
};

const mapRoleMatrices = (matrices: RolePermissionMatrixDto[]): RolePermission[] => {
  return matrices.map(m => {
    const def = DEFAULT_ROLE_PERMISSIONS.find(d => d.role === m.role);
    return {
      role: m.role,
      description: m.description || def?.description || '',
      canViewAllLeads: Boolean(m.capabilities.canViewAllLeads),
      canViewTeamLeads: Boolean(m.capabilities.canViewTeamLeads),
      canViewAssignedLeads: Boolean(m.capabilities.canViewAssignedLeads),
      canEditAllLeads: Boolean(m.capabilities.canEditAllLeads),
      canCreateLeads: Boolean(m.capabilities.canCreateLeads),
      canDeleteLeads: Boolean(m.capabilities.canDeleteLeads),
      canReassignLeads: Boolean(m.capabilities.canReassignLeads),
      canGenerateProposals: Boolean(m.capabilities.canGenerateProposals),
      canManageUsers: Boolean(m.capabilities.canManageUsers),
      canManageSuperAdmin: Boolean(m.capabilities.canManageSuperAdmin),
      canManageRoles: Boolean(m.capabilities.canManageRoles),
      canManageTeams: Boolean(m.capabilities.canManageTeams),
      canManageServices: Boolean(m.capabilities.canManageServices),
      canViewReports: Boolean(m.capabilities.canViewReports),
      canViewClients: Boolean(m.capabilities.canViewClients),
      canViewAuditLogs: Boolean(m.capabilities.canViewAuditLogs),
      canAccessSettings: Boolean(m.capabilities.canAccessSettings),
      canBulkImportExport: Boolean(m.capabilities.canBulkImportExport),
      canViewIncomingLeads: Boolean(m.capabilities.canViewIncomingLeads),
      canAssignIncomingLeads: Boolean(m.capabilities.canAssignIncomingLeads),
      canManageIntegrations: Boolean(m.capabilities.canManageIntegrations)
    };
  });
};

// Phase 2 Operational DTO Mappers
const mapLeadDto = (l: LeadDbDto): Lead => {
  const serviceList: string[] = [];
  if (Array.isArray(l.service_snapshot) && l.service_snapshot.length > 0) {
    for (const item of l.service_snapshot) {
      if (typeof item === 'string') serviceList.push(item);
      else if (item && typeof item === 'object' && 'name' in item) serviceList.push(String((item as any).name));
    }
  } else if (Array.isArray((l as any).services)) {
    serviceList.push(...(l as any).services);
  }

  let quality: LeadQuality = 'Average';
  if (l.quality === 'High' || (l.quality as string) === 'Good') quality = 'Good';
  else if (l.quality === 'Low' || (l.quality as string) === 'Poor') quality = 'Poor';

  const mappedActivities: Activity[] = (l.activities || []).map(act => ({
    id: act.id,
    type: (act.type?.toLowerCase() === 'status change' ? 'stage_change' : act.type?.toLowerCase() === 'assignment' ? 'reassign' : act.type?.toLowerCase() || 'note') as any,
    title: act.title,
    notes: act.notes || '',
    timestamp: act.created_at || new Date().toISOString(),
    author: act.actor_name || 'Staff',
    outcome: act.outcome || undefined,
    duration: act.duration_minutes ? `${act.duration_minutes}m` : undefined,
  }));

  const createdAtIso = typeof l.created_at === 'string' ? l.created_at : new Date(l.created_at).toISOString();

  return {
    id: l.id,
    name: l.name,
    businessName: l.business_name || l.name,
    phone: l.phone,
    email: l.email || '',
    city: l.city || '',
    services: serviceList,
    valuePKR: Number(l.value_pkr || 0),
    status: (l.status || 'New') as LeadStatus,
    quality,
    priority: (l.priority || 'Medium') as Priority,
    source: normalizeLeadSource(l.source),
    assignedToId: l.assigned_to_id || '',
    assignedToName: l.assigned_to_name || '',
    teamId: l.team_id || '',
    teamName: l.team_name || '',
    createdAt: createdAtIso,
    lastContactDate: createdAtIso.split('T')[0],
    nextFollowUpDate: normalizeDateOnly(l.next_follow_up_date) || undefined,
    nextFollowUpTime: l.next_follow_up_time || undefined,
    nextFollowUpType: (l as any).next_follow_up_type || undefined,
    tags: l.tags || [],
    notes: l.notes || '',
    pricingModelId: l.pricing_model_id || undefined,
    pricingModelName: (l as any).pricing_model_name || (l.budget_details as any)?.budgetType || undefined,
    pricingModel: ((l as any).pricing_model_name || (l.budget_details as any)?.budgetType || undefined) as any,
    budgetType: ((l.budget_details as any)?.budgetType || (l as any).pricing_model_name || undefined) as any,
    budgetDetails: {
      budgetType: ((l.budget_details as any)?.budgetType || (l as any).pricing_model_name || '') as any,
      budgetNotes: (l.budget_details as any)?.budgetNotes || '',
      customFieldValues: (l.budget_details as any)?.customFieldValues || {},
      totalCalculatedValuePKR: Number((l.budget_details as any)?.totalCalculatedValuePKR || l.value_pkr || 0)
    },
    activities: mappedActivities
  };
};

const mapIncomingLeadDto = (il: IncomingLeadDbDto): IncomingLead => {
  const contact = (il.contact_data || {}) as Record<string, any>;
  const campaign = (il.campaign_data || {}) as Record<string, any>;

  const name = contact.name || contact.leadName || 'Incoming Lead';
  const phone = contact.phone || '';
  const message = contact.message || contact.notes || undefined;
  const campaignName = campaign.campaignName || campaign.campaign_name || campaign.name || undefined;
  const adName = campaign.adName || campaign.ad_name || undefined;

  let source: 'meta_ads' | 'whatsapp' = 'meta_ads';
  const srcLower = (il.source || '').toLowerCase();
  if (srcLower.includes('whatsapp')) {
    source = 'whatsapp';
  }

  let status: 'new' | 'assigned' = 'new';
  const stLower = (il.status || '').toLowerCase();
  if (stLower === 'assigned' || stLower === 'converted') {
    status = 'assigned';
  }

  return {
    id: il.id,
    externalId: il.external_id,
    source,
    name,
    phone,
    receivedAt: il.received_at || il.created_at || new Date().toISOString(),
    campaignName,
    adName,
    message,
    status,
    assignedToId: il.assigned_user_id || undefined,
    assignedToUserId: il.assigned_user_id || undefined
  };
};

const mapFollowUpDto = (f: FollowUpDbDto): FollowUp => {
  const rawStatus = (f.status || '').toLowerCase();
  const status: FollowUpStatus =
    rawStatus === 'completed'
      ? 'Completed'
      : rawStatus === 'done'
        ? 'Done'
        : rawStatus === 'missed'
          ? 'Missed'
          : 'Pending';
  return {
    id: f.id,
    leadId: f.lead_id || '',
    clientName: f.lead_name || f.client_business_snapshot || 'Lead Contact',
    clientBusiness: f.client_business_snapshot || f.lead_name || 'Business',
    phone: f.phone || '',
    scheduledDate: f.scheduled_date ? String(f.scheduled_date).slice(0, 10) : '',
    scheduledTime: f.scheduled_time || '14:00',
    type: (f.type || 'Call') as any,
    source: 'Call',
    status,
    notes: f.notes || '',
    resultNotes: f.result_outcome || undefined,
    assignedToId: f.assigned_to_id,
    assignedToName: f.assigned_to_name || '',
    createdAt: f.created_at,
    completedAt: f.completed_at || undefined
  };
};

const mapClientDto = (c: ClientDbDto): Client => {
  const serviceList: string[] = [];
  if (Array.isArray(c.services_snapshot) && c.services_snapshot.length > 0) {
    for (const item of c.services_snapshot) {
      if (typeof item === 'string') serviceList.push(item);
      else if (item && typeof item === 'object' && 'name' in item) serviceList.push(String((item as any).name));
    }
  }

  const finalVal = Number(c.final_value_pkr || 0);
  const clientStatus: 'Active' | 'Paused' | 'Cancelled' =
    c.status === 'Active' ? 'Active' :
      c.status === 'Suspended' ? 'Paused' : 'Cancelled';

  return {
    id: c.id,
    leadId: c.originating_lead_id || undefined,
    businessName: c.business_name,
    clientName: c.contact_name,
    phone: c.phone || '',
    email: c.email || '',
    city: c.city || 'Lahore',
    services: serviceList,
    source: normalizeLeadSource(c.source || undefined),
    pricingModelId: c.pricing_model_id || undefined,
    pricingModelName: c.pricing_model_name || undefined,
    pricingModel: (c.pricing_model_name || 'Monthly Subscription Model') as any,
    finalPrice: finalVal,
    activeRevenuePKR: finalVal,
    currency: 'PKR',
    assignedToName: c.assigned_owner_name || 'Staff',
    assignedToId: c.assigned_owner_id || '',
    generatedByName: c.assigned_owner_name || 'Staff',
    closedByName: c.closed_by_name || 'Super Admin',
    convertedDate: c.converted_date || c.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    startDate: c.converted_date || c.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    status: clientStatus,
    notes: c.terms_details || ''
  };
};

const mapProposalDto = (p: ProposalDbDto): Proposal => {
  const clientSnap = (p.client_snapshot || {}) as Record<string, any>;
  const total = Number(p.total_pkr || 0);
  const discount = Number(p.discount_pkr || 0);
  const tax = Number(p.tax_pkr || 0);

  let mappedStatus: 'Draft' | 'Sent' | 'Accepted' | 'Revised' | 'Declined' = 'Draft';
  if (p.status === 'Sent') mappedStatus = 'Sent';
  else if (p.status === 'Accepted') mappedStatus = 'Accepted';
  else if (p.status === 'Rejected') mappedStatus = 'Declined';
  else if (p.status === 'Expired') mappedStatus = 'Declined';

  return {
    id: p.id,
    leadId: p.lead_id || '',
    refNumber: p.proposal_number,
    proposalNumber: p.proposal_number,
    title: `Proposal ${p.proposal_number}`,
    issueDate: p.issue_date,
    expiryDate: p.expiry_date || undefined,
    validityDays: 14,
    clientName: clientSnap.clientName || clientSnap.contactName || 'Client',
    businessName: clientSnap.businessName || 'Business',
    clientPhone: clientSnap.phone || clientSnap.clientPhone || '',
    clientEmail: clientSnap.email || clientSnap.clientEmail || '',
    clientCity: clientSnap.city || clientSnap.clientCity || '',
    assignedRepName: p.assigned_rep_name || 'Sales Representative',
    assignedRepId: p.assigned_rep_id || undefined,
    scopeOfWork: p.scope_deliverables || '',
    items: ((p.line_items || []) as any[]).map((item, idx) => ({
      id: item.id || `item-${idx}`,
      title: item.name || item.title || 'Item',
      name: item.name || item.title || 'Item',
      description: item.description || '',
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPricePKR || item.unitPrice || 0),
      discount: Number(item.discount || 0),
      total: Number(item.totalPKR || item.total || 0),
    })),
    subtotal: total + discount - tax,
    taxAmount: tax,
    totalDiscount: discount,
    grandTotal: total,
    grandTotalPKR: total,
    currency: 'PKR',
    currencySymbol: 'Rs.',
    termsAndConditions: p.terms || '',
    milestones: ((p.milestones || []) as any[]).map((m, idx) => ({
      id: m.id || `ms-${idx}`,
      title: m.title || 'Milestone',
      percentage: Number(m.percentage || 0),
      amount: Number(m.amountPKR || m.amount || 0),
      dueDate: m.dueDate || undefined,
    })),
    status: mappedStatus,
    createdAt: p.created_at,
  };
};

const mapActivityLogDto = (a: ActivityLogDbDto): ActivityLog => {
  let detailsStr = '';
  if (typeof a.details === 'string') {
    detailsStr = a.details;
  } else if (a.details && typeof a.details === 'object') {
    detailsStr = JSON.stringify(a.details);
  }

  let entityType: ActivityLog['entityType'] = 'Setting';
  const etLower = (a.entity_type || '').toLowerCase();
  if (etLower.includes('lead')) entityType = 'Lead';
  else if (etLower.includes('follow')) entityType = 'FollowUp';
  else if (etLower.includes('user')) entityType = 'User';
  else if (etLower.includes('team')) entityType = 'Team';
  else if (etLower.includes('service')) entityType = 'Service';
  else if (etLower.includes('client')) entityType = 'Client';
  else if (etLower.includes('auth')) entityType = 'Auth';
  else if (etLower.includes('source')) entityType = 'Source';

  return {
    id: a.id,
    timestamp: typeof a.timestamp === 'string' ? a.timestamp : new Date(a.timestamp).toISOString(),
    userId: a.actor_id || '',
    userName: a.actor_name || 'System',
    userRole: (a.actor_role || 'Super Admin') as UserRole,
    action: a.action,
    entityType,
    entityId: a.entity_id || undefined,
    entityTitle: a.entity_title || '',
    details: detailsStr
  };
};

export const CRMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Session & Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Core Reference Data States (Cut over to REST API)
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>(DEFAULT_ROLE_PERMISSIONS);
  const [pricingModels, setPricingModels] = useState<PricingModelItem[]>([]);

  // Phase 2 Operational States (Cut over to PostgreSQL REST APIs - Initialized to empty arrays)
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [incomingLeads, setIncomingLeads] = useState<IncomingLead[]>([]);

  // Filter State for Leads Table
  const [filterState, setFilterState] = useState<LeadFilterState>({
    search: '',
    status: 'All',
    assignedToId: 'All',
    teamId: 'All',
    service: 'All',
    source: 'All',
    fromDate: '',
    toDate: '',
    quality: 'All',
    priority: 'All'
  });

  const [isHydrated, setIsHydrated] = useState(false);
  const isHydratedRef = useRef(false);

  // Centralized reference data fetcher from real backend APIs
  const fetchReferenceData = async () => {
    setIsDataLoading(true);
    try {
      const [usersRes, teamsRes, srvRes, srcRes, pmRes, rolesRes, settingsRes] = await Promise.allSettled([
        usersApi.listUsers({ limit: 200 }),
        teamsApi.listTeams({ limit: 100 }),
        servicesApi.listServices(),
        sourcesApi.listSources(),
        pricingModelsApi.listPricingModels(),
        rolesApi.getAllMatrices(),
        settingsApi.getSettings()
      ]);

      let mappedUsers: User[] | null = null;
      let mappedTeams: Team[] | null = null;

      if (usersRes.status === 'fulfilled') {
        const rawUsers = Array.isArray(usersRes.value)
          ? usersRes.value
          : Array.isArray((usersRes.value as any)?.users)
            ? (usersRes.value as any).users
            : [];
        mappedUsers = rawUsers.map(mapUserDto);
      }

      if (teamsRes.status === 'fulfilled') {
        const rawTeams = Array.isArray(teamsRes.value)
          ? teamsRes.value
          : Array.isArray((teamsRes.value as any)?.teams)
            ? (teamsRes.value as any).teams
            : [];
        mappedTeams = rawTeams.map(mapTeamDto);
      }

      // Keep frontend hierarchy fully hydrated from the live PostgreSQL/API records.
      // The team list endpoint may not always include memberIds, while the users
      // endpoint carries each user's primary team. Derive the relationship here so
      // Manager/Team Lead scope calculations receive the complete hierarchy.
      if (mappedUsers && mappedTeams) {
        const teamById = new Map(mappedTeams.map(team => [team.id, team]));

        mappedUsers = mappedUsers.map(user => {
          const team = user.teamId ? teamById.get(user.teamId) : undefined;

          return {
            ...user,
            managerId: user.managerId || team?.managerId,
            managerName: user.managerName || team?.managerName,
            teamLeadId: user.teamLeadId || team?.leaderId,
            teamLeadName: user.teamLeadName || team?.leaderName,
          };
        });

        mappedTeams = mappedTeams.map(team => {
          const derivedMemberIds = mappedUsers!
            .filter(user => user.teamId === team.id)
            .map(user => user.id);

          return {
            ...team,
            memberIds: Array.from(
              new Set([...(team.memberIds || []), ...derivedMemberIds])
            ),
          };
        });
      }

      if (mappedUsers) {
        setUsers(mappedUsers);
      }

      if (mappedTeams) {
        setTeams(mappedTeams);
      }
      if (srvRes.status === 'fulfilled') {
        const rawServices = Array.isArray(srvRes.value)
          ? srvRes.value
          : Array.isArray((srvRes.value as any)?.services)
            ? (srvRes.value as any).services
            : [];
        setServices(rawServices.map(mapServiceDto));
      }
      if (srcRes.status === 'fulfilled') {
        const rawSources = Array.isArray(srcRes.value)
          ? srcRes.value
          : Array.isArray((srcRes.value as any)?.sources)
            ? (srcRes.value as any).sources
            : [];
        setSources(rawSources.map((s: any) => (typeof s === 'string' ? s : s.name)));
      }
      if (pmRes.status === 'fulfilled') {
        const rawPms = Array.isArray(pmRes.value)
          ? pmRes.value
          : Array.isArray((pmRes.value as any)?.pricingModels)
            ? (pmRes.value as any).pricingModels
            : [];
        setPricingModels(rawPms.map(mapPricingModelDto));
      }
      if (rolesRes.status === 'fulfilled') {
        const rawRoles = Array.isArray(rolesRes.value)
          ? rolesRes.value
          : Array.isArray((rolesRes.value as any)?.rolePermissions)
            ? (rolesRes.value as any).rolePermissions
            : [];
        if (rawRoles.length > 0) {
          setRolePermissions(mapRoleMatrices(rawRoles));
        }
      }
      if (settingsRes.status === 'fulfilled' && settingsRes.value) {
        setSettings(settingsRes.value);
      }
    } catch (err) {
      console.warn('Reference data API fetch completed with warnings:', err);
    } finally {
      setIsDataLoading(false);
    }
  };

  // Centralized operational data fetcher from real backend APIs
  const fetchOperationalData = async (userRole?: string) => {
    try {
      const activeRole = userRole || currentUser?.role;
      const canViewLogs = activeRole === 'Super Admin' || activeRole === 'Admin';
      const canViewInc = activeRole !== 'Employee';

      const [leadsRes, fuRes, clientsRes, propRes, logsRes, incRes] = await Promise.allSettled([
        leadsApi.listLeads({ limit: 1000 }),
        followUpsApi.listFollowUps(),
        clientsApi.listClients({ limit: 1000 }),
        proposalsApi.listProposals(),
        canViewLogs ? activityLogsApi.listLogs({ limit: 200 }) : Promise.resolve({ items: [] }),
        canViewInc ? incomingLeadsApi.listIncomingLeads() : Promise.resolve([])
      ]);

      if (leadsRes.status === 'fulfilled' && leadsRes.value) {
        const items = (leadsRes.value as any).items || (leadsRes.value as any).leads || [];
        setLeads(items.map(mapLeadDto));
      }
      if (fuRes.status === 'fulfilled' && Array.isArray(fuRes.value)) {
        setFollowUps(fuRes.value.map(mapFollowUpDto));
      }
      if (clientsRes.status === 'fulfilled' && clientsRes.value) {
        const items = (clientsRes.value as any).items || (clientsRes.value as any).clients || [];
        setClients(items.map(mapClientDto));
      }
      if (propRes.status === 'fulfilled' && Array.isArray(propRes.value)) {
        setProposals(propRes.value.map(mapProposalDto));
      }
      if (logsRes && logsRes.status === 'fulfilled' && logsRes.value) {
        const items = (logsRes.value as any).items || (logsRes.value as any).logs || [];
        setActivityLogs(items.map(mapActivityLogDto));
      }
      if (incRes && incRes.status === 'fulfilled' && Array.isArray(incRes.value)) {
        setIncomingLeads(incRes.value.map(mapIncomingLeadDto));
      }
    } catch (err) {
      console.warn('Operational data API fetch completed with warnings:', err);
    }
  };

  // Restore authenticated session on mount via /api/v1/auth/me
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        setIsAuthLoading(true);
        let meRes = await authApi.getMe().catch(async () => {
          try {
            const refreshed = await authApi.refresh();
            if (refreshed?.accessToken) {
              setAuthToken(refreshed.accessToken);
              return await authApi.getMe();
            }
          } catch {
            // Not authenticated
          }
          return null;
        });

        if (meRes?.user && isMounted) {
          const mapped = mapUserDto(meRes.user);
          setCurrentUser(mapped);
          await Promise.allSettled([
            fetchReferenceData(),
            fetchOperationalData(mapped.role)
          ]);
        } else if (isMounted) {
          setCurrentUser(null);
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Permanently purge legacy keys on hydration; settings are loaded from PostgreSQL
  useEffect(() => {
    purgeObsoleteLocalStorageKeys();
    isHydratedRef.current = true;
    setIsHydrated(true);
  }, []);

  // Logger helper
  const logAction = (
    action: string,
    entityType: ActivityLog['entityType'],
    entityTitle: string,
    details: string,
    entityId?: string
  ) => {
    if (!currentUser) return;
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      entityType,
      entityId,
      entityTitle,
      details
    };
    setActivityLogs(prev => [newLog, ...prev.slice(0, 199)]);
  };

  // Real API Authentication methods
  const login = async (email: string, pass: string, selectedRole?: UserRole): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authApi.login({
        email: email.trim().toLowerCase(),
        password: pass
      });

      if (res?.accessToken) {
        setAuthToken(res.accessToken);
      }

      if (!res.user) {
        return { success: false, error: 'Login failed: no user data returned.' };
      }

      if (res.user.status === 'inactive' || !res.user.isActive) {
        return { success: false, error: 'This user account is currently deactivated. Please contact Super Admin.' };
      }

      if (selectedRole && res.user.role !== selectedRole) {
        return {
          success: false,
          error: `Role mismatch: This account belongs to "${res.user.role}", not "${selectedRole}". Please switch to the "${res.user.role}" tab or select the corresponding account.`
        };
      }

      const mappedUser = mapUserDto(res.user);
      mappedUser.lastLogin = new Date().toISOString();
      setCurrentUser(mappedUser);

      // Invalidate and refetch all reference and operational data for authenticated user's scope
      await Promise.allSettled([
        fetchReferenceData(),
        fetchOperationalData(mappedUser.role)
      ]);

      // Log auth action
      const authLog: ActivityLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: mappedUser.id,
        userName: mappedUser.name,
        userRole: mappedUser.role,
        action: 'User Logged In',
        entityType: 'Auth',
        entityTitle: `${mappedUser.role} Portal Session`,
        details: `Signed in as ${mappedUser.email}`
      };
      setActivityLogs(prev => [authLog, ...prev]);

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please verify email and password.';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      if (currentUser) {
        logAction('User Logged Out', 'Auth', `${currentUser.role} Session`, 'Signed out');
      }
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      purgeObsoleteLocalStorageKeys();
      setCurrentUser(null);
      setLeads([]);
      setFollowUps([]);
      setClients([]);
      setProposals([]);
      setActivityLogs([]);
      setIncomingLeads([]);
      setServices([]);
      setSources([]);
      setPricingModels([]);
      setUsers([]);
      setTeams([]);
    }
  };

  const switchUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      setCurrentUser(target);
      logAction('Switched Role Portal', 'Auth', target.role, `Switched view to ${target.name} (${target.role})`);
    }
  };

  // Dynamic RBAC Role Permissions Matrix Resolution
  const currentRolePerms = useMemo<RolePermission>(() => {
    return getEffectivePermissions(currentUser, rolePermissions) || DEFAULT_ROLE_PERMISSIONS[0];
  }, [currentUser, rolePermissions]);

  // Strict Hierarchy & Operational Scope (Separated from Visibility)
  const hierarchyScope = useMemo(() => {
    return getHierarchyScope(currentUser, users, teams);
  }, [currentUser, users, teams]);

  // Derived Scoped Entities
  const scopedUsers = hierarchyScope.scopedUsersList;
  const scopedTeams = hierarchyScope.scopedTeamsList;
  const assignableUsers = hierarchyScope.assignableUsersList;

  // Scoped Pipeline & Business Records
  const scopedLeads = useMemo(() => {
    return getScopedLeads(leads, currentUser, currentRolePerms, hierarchyScope);
  }, [leads, currentUser, currentRolePerms, hierarchyScope]);

  const scopedFollowUps = useMemo(() => {
    return getScopedFollowUps(followUps, currentUser, currentRolePerms, hierarchyScope);
  }, [followUps, currentUser, currentRolePerms, hierarchyScope]);

  const scopedClients = useMemo(() => {
    return getScopedClients(clients, currentUser, currentRolePerms, hierarchyScope);
  }, [clients, currentUser, currentRolePerms, hierarchyScope]);

  // Dynamic RBAC Permission Checks
  const canAccessAdmin = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentRolePerms.canManageUsers ||
      currentRolePerms.canManageRoles ||
      currentRolePerms.canManageTeams ||
      currentRolePerms.canManageServices ||
      currentRolePerms.canAccessSettings ||
      currentRolePerms.canViewAuditLogs
    );
  }, [currentUser, currentRolePerms]);

  const canManageUsers = useMemo(() => {
    return !!currentUser && currentRolePerms.canManageUsers;
  }, [currentUser, currentRolePerms]);

  const canManageRoles = useMemo(() => {
    return !!currentUser && currentUser.role === 'Super Admin' && Boolean(currentRolePerms.canManageRoles);
  }, [currentUser, currentRolePerms]);

  const canManageTeams = useMemo(() => {
    return !!currentUser && currentRolePerms.canManageTeams;
  }, [currentUser, currentRolePerms]);

  const canManageServices = useMemo(() => {
    return !!currentUser && currentRolePerms.canManageServices;
  }, [currentUser, currentRolePerms]);

  const canViewReports = useMemo(() => {
    return !!currentUser && currentRolePerms.canViewReports;
  }, [currentUser, currentRolePerms]);

  const canViewClients = useMemo(() => {
    return !!currentUser && currentRolePerms.canViewClients;
  }, [currentUser, currentRolePerms]);

  const canViewAuditLogs = useMemo(() => {
    return !!currentUser && currentRolePerms.canViewAuditLogs;
  }, [currentUser, currentRolePerms]);

  const canAccessSettings = useMemo(() => {
    return !!currentUser && currentRolePerms.canAccessSettings;
  }, [currentUser, currentRolePerms]);

  const canBulkImportExport = useMemo(() => {
    return !!currentUser && currentRolePerms.canBulkImportExport;
  }, [currentUser, currentRolePerms]);

  const canCreateLeads = useMemo(() => {
    return !!currentUser && currentRolePerms.canCreateLeads;
  }, [currentUser, currentRolePerms]);

  const canViewAllLeads = useMemo(() => {
    return !!currentUser && Boolean(currentRolePerms.canViewAllLeads);
  }, [currentUser, currentRolePerms]);

  const canViewIncomingLeads = useMemo(() => {
    if (!currentUser) return false;
    const isEligibleRole = ['Super Admin', 'Admin', 'Manager', 'Team Lead'].includes(currentUser.role);
    return isEligibleRole && !!currentRolePerms.canViewIncomingLeads;
  }, [currentUser, currentRolePerms]);

  const canAssignIncomingLeads = useMemo(() => {
    if (!currentUser) return false;
    const isEligibleRole = ['Super Admin', 'Admin', 'Manager', 'Team Lead'].includes(currentUser.role);
    return isEligibleRole && !!currentRolePerms.canAssignIncomingLeads;
  }, [currentUser, currentRolePerms]);

  const canManageIntegrations = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'Employee') return false;
    return !!currentRolePerms.canManageIntegrations;
  }, [currentUser, currentRolePerms]);

  const canGenerateProposals = useMemo(() => {
    return !!currentUser && !!currentRolePerms.canGenerateProposals;
  }, [currentUser, currentRolePerms]);

  // Centralized Action-Level Authorization Guards
  const canManageSuperAdminAccount = (targetUser: User): boolean => {
    return canManageSuperAdminAccountAuth(targetUser, currentUser, currentRolePerms);
  };

  const canManageUser = (targetUser: User): boolean => {
    return canManageUserAuth(targetUser, currentUser, currentRolePerms, hierarchyScope);
  };

  const canCreateUserWithRole = (targetRole: 'Super Admin' | 'Admin' | 'Manager' | 'Team Lead' | 'Employee'): boolean => {
    return canCreateUserWithRoleAuth(targetRole, currentUser, currentRolePerms);
  };

  const canTransitionUserRole = (
    targetUser: User,
    newRole: 'Super Admin' | 'Admin' | 'Manager' | 'Team Lead' | 'Employee'
  ): boolean => {
    return canTransitionUserRoleAuth(targetUser, newRole, currentUser, currentRolePerms, hierarchyScope);
  };

  const getAllowedTargetRoles = (): ('Super Admin' | 'Admin' | 'Manager' | 'Team Lead' | 'Employee')[] => {
    return getAllowedTargetRolesAuth(currentUser);
  };

  const canEditLeadItem = (lead: Lead): boolean => {
    return canEditLead(lead, currentUser, currentRolePerms, hierarchyScope);
  };

  const canDeleteLeadItem = (lead: Lead): boolean => {
    return canDeleteLead(lead, currentUser, currentRolePerms, hierarchyScope);
  };

  const canReassignLeadItem = (lead: Lead): boolean => {
    return canReassignLead(lead, currentUser, currentRolePerms, hierarchyScope);
  };

  const isUserAssignable = (targetUser: User): boolean => {
    return isUserAssignableAuth(targetUser, currentUser, hierarchyScope);
  };

  // Filtered leads calculation for Leads table
  const filteredLeads = useMemo(() => {
    return scopedLeads.filter(lead => {
      if (filterState.search.trim()) {
        const query = filterState.search.toLowerCase().trim();
        const matchesName = lead.name.toLowerCase().includes(query);
        const matchesBusiness = lead.businessName.toLowerCase().includes(query);
        const matchesPhone = lead.phone.toLowerCase().includes(query);
        const matchesEmail = lead.email.toLowerCase().includes(query);
        const matchesCity = lead.city.toLowerCase().includes(query);
        if (!matchesName && !matchesBusiness && !matchesPhone && !matchesEmail && !matchesCity) {
          return false;
        }
      }
      if (filterState.status !== 'All' && lead.status !== filterState.status) return false;
      if (filterState.assignedToId !== 'All' && lead.assignedToId !== filterState.assignedToId) return false;
      if (filterState.teamId !== 'All' && lead.teamId !== filterState.teamId) return false;
      if (filterState.service !== 'All' && !lead.services.includes(filterState.service)) return false;
      if (filterState.source !== 'All' && lead.source !== filterState.source) return false;
      if (filterState.quality !== 'All' && lead.quality !== filterState.quality) return false;
      if (filterState.priority !== 'All' && lead.priority !== filterState.priority) return false;
      if (filterState.fromDate) {
        const leadDate = new Date(lead.createdAt).toISOString().split('T')[0];
        if (leadDate < filterState.fromDate) return false;
      }
      if (filterState.toDate) {
        const leadDate = new Date(lead.createdAt).toISOString().split('T')[0];
        if (leadDate > filterState.toDate) return false;
      }
      return true;
    });
  }, [scopedLeads, filterState]);

  // Dashboard Metrics Calculation
  const metrics = useMemo(() => {
    const totalLeads = scopedLeads.length;

    const hotLeads = scopedLeads.filter(l =>
      (l.quality === 'Good' || l.priority === 'Urgent') &&
      l.status !== 'Converted' &&
      l.status !== 'Lost'
    ).length;

    const convertedLeads = scopedLeads.filter(l => l.status === 'Converted').length;

    const lostLeads = scopedLeads.filter(l => l.status === 'Lost').length;

    const newLeads = scopedLeads.filter(l => l.status === 'New').length;

    const todayStr = getLocalDateString();
    const todayFollowUps = scopedFollowUps.filter(f => classifyFollowUp(f, todayStr) === 'today').length;
    const missedFollowUps = scopedFollowUps.filter(f => classifyFollowUp(f, todayStr) === 'missed').length;
    const pendingFollowUps = scopedFollowUps.filter(f => f.status === 'Pending').length;

    const staleThreshold = new Date();
    staleThreshold.setDate(staleThreshold.getDate() - (settings.staleLeadDays || 7));
    const staleThresholdStr = staleThreshold.toISOString().split('T')[0];
    const staleLeads = scopedLeads.filter(l =>
      l.status !== 'Converted' &&
      l.status !== 'Lost' &&
      (l.lastContactDate <= staleThresholdStr || l.createdAt.split('T')[0] <= staleThresholdStr)
    ).length;

    const statusBreakdown: Record<LeadStatus, number> = {
      'New': 0, 'Contacted': 0, 'Follow-Up Required': 0, 'Qualified': 0,
      'Won': 0, 'Hold': 0, 'Cold': 0, 'Returned': 0, 'Converted': 0, 'Lost': 0
    };
    scopedLeads.forEach(l => {
      if (statusBreakdown[l.status] !== undefined) statusBreakdown[l.status]++;
    });

    const qualityBreakdown: Record<LeadQuality, number> = { 'Good': 0, 'Average': 0, 'Poor': 0 };
    scopedLeads.forEach(l => {
      if (qualityBreakdown[l.quality] !== undefined) qualityBreakdown[l.quality]++;
    });

    const totalRevenuePKR = scopedClients.reduce((sum, c) => sum + getClientRevenue(c), 0);

    return {
      totalLeads,
      hotLeads,
      convertedLeads,
      lostLeads,
      todayFollowUps,
      missedFollowUps,
      newLeads,
      staleLeads,
      pendingFollowUps,
      statusBreakdown,
      qualityBreakdown,
      totalRevenuePKR
    };
  }, [scopedLeads, scopedFollowUps, scopedClients, settings.staleLeadDays]);

  // Lead CRUD Operations Connected to Express REST API
  const addLead = async (newLeadData: Omit<Lead, 'id' | 'createdAt' | 'lastContactDate' | 'activities'>): Promise<Lead | null> => {
    try {
      const qualityBackend = newLeadData.quality === 'Good' ? 'High' : newLeadData.quality === 'Poor' ? 'Low' : 'Normal';
      const resolvedPricingModelId = toValidUuidOrNull(
        (newLeadData as any).pricingModelId ||
        pricingModels.find(pm => pm.name === newLeadData.pricingModel || pm.name === newLeadData.budgetType)?.id
      );

      const payload: CreateLeadPayload = {
        name: newLeadData.name.trim(),
        businessName: newLeadData.businessName?.trim() || null,
        phone: newLeadData.phone.trim(),
        email: toValidEmailOrNull(newLeadData.email),
        city: newLeadData.city?.trim() || null,
        serviceSnapshot: newLeadData.services || [],
        valuePKR: Number(newLeadData.valuePKR || 0),
        status: newLeadData.status || 'New',
        quality: qualityBackend,
        priority: newLeadData.priority || 'Medium',
        source: newLeadData.source || 'Direct',
        assignedToId: toValidUuidOrNull(newLeadData.assignedToId),
        teamId: toValidUuidOrNull(newLeadData.teamId),
        pricingModelId: resolvedPricingModelId,
        budgetDetails: (newLeadData.budgetDetails as any) || {},
        notes: newLeadData.notes?.trim() || null,
        tags: newLeadData.tags || [],
        nextFollowUpDate: normalizeDateOnly(newLeadData.nextFollowUpDate),
        nextFollowUpTime: newLeadData.nextFollowUpTime || null
      };

      const createdDto = await leadsApi.createLead(payload);
      const newLead = mapLeadDto(createdDto);
      setLeads(prev => [newLead, ...prev.filter(l => l.id !== newLead.id)]);

      if (newLeadData.nextFollowUpDate) {
        try {
          const freshFu = await followUpsApi.listFollowUps();
          if (Array.isArray(freshFu)) setFollowUps(freshFu.map(mapFollowUpDto));
        } catch { /* ignore */ }
      }

      logAction('Lead Created', 'Lead', newLead.businessName || newLead.name, `New lead added with value Rs. ${(newLead.valuePKR || 0).toLocaleString()}`, newLead.id);
      return newLead;
    } catch (err) {
      console.error('Failed to create lead via API:', err);
      return null;
    }
  };

  const updateLead = async (updatedLead: Lead): Promise<boolean> => {
    try {
      const qualityBackend = updatedLead.quality === 'Good' ? 'High' : updatedLead.quality === 'Poor' ? 'Low' : 'Normal';
      const resolvedPricingModelId = toValidUuidOrNull(
        (updatedLead as any).pricingModelId ||
        pricingModels.find(pm => pm.name === updatedLead.pricingModel || pm.name === updatedLead.budgetType)?.id
      );

      const payload: UpdateLeadPayload = {
        name: updatedLead.name.trim(),
        businessName: updatedLead.businessName?.trim() || null,
        phone: updatedLead.phone.trim(),
        email: toValidEmailOrNull(updatedLead.email),
        city: updatedLead.city?.trim() || null,
        serviceSnapshot: updatedLead.services || [],
        valuePKR: Number(updatedLead.valuePKR || 0),
        status: updatedLead.status,
        quality: qualityBackend,
        priority: updatedLead.priority,
        source: updatedLead.source,
        assignedToId: toValidUuidOrNull(updatedLead.assignedToId),
        teamId: toValidUuidOrNull(updatedLead.teamId),
        pricingModelId: resolvedPricingModelId,
        budgetDetails: (updatedLead.budgetDetails as any) || {},
        notes: updatedLead.notes?.trim() || null,
        tags: updatedLead.tags || [],
        nextFollowUpDate: normalizeDateOnly(updatedLead.nextFollowUpDate),
        nextFollowUpTime: updatedLead.nextFollowUpTime || null
      };

      const updatedDto = await leadsApi.updateLead(updatedLead.id, payload);
      const mapped = mapLeadDto(updatedDto);
      setLeads(prev => prev.map(l => (l.id === updatedLead.id ? mapped : l)));

      if (updatedLead.nextFollowUpDate !== undefined) {
        try {
          const freshFu = await followUpsApi.listFollowUps();
          if (Array.isArray(freshFu)) setFollowUps(freshFu.map(mapFollowUpDto));
        } catch { /* ignore */ }
      }

      logAction('Lead Updated', 'Lead', updatedLead.businessName || updatedLead.name, `Details updated by ${currentUser?.name}`, updatedLead.id);
      return true;
    } catch (err) {
      console.error('Failed to update lead via API:', err);
      return false;
    }
  };

  const deleteLead = async (leadId: string): Promise<boolean> => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || !canDeleteLeadItem(lead)) return false;

    try {
      await leadsApi.deleteLead(leadId);
      setLeads(prev => prev.filter(l => l.id !== leadId));
      setFollowUps(prev => prev.filter(f => f.leadId !== leadId));
      logAction('Lead Deleted', 'Lead', lead.businessName || lead.name, 'Removed from pipeline', leadId);
      return true;
    } catch (err) {
      console.error('Failed to delete lead via API:', err);
      return false;
    }
  };

  const reassignLead = async (leadId: string, newUserId: string): Promise<boolean> => {
    const targetUser = users.find(u => u.id === newUserId);
    if (!targetUser) return false;

    try {
      const updatedDto = await leadsApi.reassignLead(
        leadId,
        newUserId,
        toValidUuidOrNull(targetUser.teamId),
        `Reassigned to ${targetUser.name}`
      );
      const mapped = mapLeadDto(updatedDto);
      setLeads(prev => prev.map(l => (l.id === leadId ? mapped : l)));

      try {
        const freshFu = await followUpsApi.listFollowUps();
        if (Array.isArray(freshFu)) setFollowUps(freshFu.map(mapFollowUpDto));
      } catch { /* ignore */ }

      logAction('Lead Reassigned', 'Lead', `Lead ID ${leadId}`, `Assigned to ${targetUser.name}`, leadId);
      return true;
    } catch (err) {
      console.error('Failed to reassign lead via API:', err);
      return false;
    }
  };

  const changeLeadStatus = async (leadId: string, newStatus: LeadStatus): Promise<boolean> => {
    try {
      const updatedDto = await leadsApi.changeStatus(
        leadId,
        newStatus,
        `Pipeline status moved to "${newStatus}"`
      );
      const mapped = mapLeadDto(updatedDto);
      setLeads(prev => prev.map(l => (l.id === leadId ? mapped : l)));

      if (newStatus === 'Converted') {
        try {
          const freshClients = await clientsApi.listClients({ limit: 1000 });
          const items = (freshClients as any).items || (freshClients as any).clients || [];
          setClients(items.map(mapClientDto));
        } catch { /* ignore */ }
      }

      logAction('Lead Status Updated', 'Lead', `Status changed to ${newStatus}`, 'Stage updated', leadId);
      return true;
    } catch (err) {
      console.error('Failed to change lead status via API:', err);
      return false;
    }
  };

  const addLeadActivity = async (leadId: string, activity: Omit<Activity, 'id' | 'timestamp' | 'author'>): Promise<void> => {
    try {
      const backendType = mapFrontendActivityTypeToBackend(activity.type);
      await leadsApi.addActivity(leadId, {
        type: backendType,
        title: activity.title,
        notes: activity.notes || null,
        outcome: activity.outcome || null
      });

      const nowIso = new Date().toISOString();
      const newAct: Activity = {
        ...activity,
        id: `act-${Date.now()}`,
        timestamp: nowIso,
        author: currentUser?.name || 'Staff'
      };

      setLeads(prev => prev.map(l => {
        if (l.id === leadId) {
          return {
            ...l,
            lastContactDate: nowIso.split('T')[0],
            activities: [newAct, ...l.activities]
          };
        }
        return l;
      }));

      logAction('Activity Logged', 'Lead', newAct.title, `${newAct.type.toUpperCase()}: ${newAct.notes}`, leadId);
    } catch (err) {
      console.error('Failed to add activity via API:', err);
    }
  };

  const importLeads = (leadsToImport: Partial<Lead>[]): number => {
    if (!currentUser || !canBulkImportExport) return 0;
    let importedCount = 0;

    for (let idx = 0; idx < leadsToImport.length; idx++) {
      const raw = leadsToImport[idx];
      const name = (raw.name || '').trim();
      const phone = (raw.phone || '').trim();
      if (!name || !phone) continue;

      let resolvedAssignee: User | undefined;
      if (raw.assignedToId) {
        const candidate = users.find(u => u.id === raw.assignedToId && u.isActive);
        if (candidate) resolvedAssignee = candidate;
      }
      if (!resolvedAssignee && currentUser && currentUser.isActive) {
        resolvedAssignee = currentUser;
      }
      if (!resolvedAssignee) continue;

      const servicesArr = Array.isArray(raw.services)
        ? raw.services.map(s => String(s).trim()).filter(Boolean)
        : raw.services ? [String(raw.services).trim()].filter(Boolean) : [];

      addLead({
        name,
        businessName: (raw.businessName || '').trim() || name,
        phone,
        email: (raw.email || '').trim(),
        city: (raw.city || '').trim(),
        services: servicesArr,
        valuePKR: normalizeValuePKR(raw.valuePKR),
        status: normalizeLeadStatus(raw.status),
        quality: normalizeLeadQuality(raw.quality),
        priority: normalizePriority(raw.priority),
        source: normalizeLeadSource(raw.source),
        assignedToId: resolvedAssignee.id,
        assignedToName: resolvedAssignee.name,
        teamId: resolvedAssignee.teamId || '',
        teamName: resolvedAssignee.teamName || '',
        nextFollowUpDate: raw.nextFollowUpDate,
        nextFollowUpTime: raw.nextFollowUpTime,
        nextFollowUpType: raw.nextFollowUpType,
        tags: Array.isArray(raw.tags) && raw.tags.length > 0 ? raw.tags : ['CSV Import'],
        notes: raw.notes || 'Imported via bulk CSV',
        pricingModel: raw.pricingModel as PricingModel | undefined
      });
      importedCount++;
    }

    if (importedCount > 0) {
      logAction('Bulk Leads Imported', 'Lead', `${importedCount} Leads`, 'Successfully processed CSV batch');
    }
    return importedCount;
  };

  const assignIncomingLead = async (incomingId: string, assignedUserId: string): Promise<boolean> => {
    if (!canViewIncomingLeads || !canAssignIncomingLeads || !canCreateLeads) return false;

    const inc = incomingLeads.find(i => i.id === incomingId);
    if (!inc || inc.status === 'assigned') return false;

    const targetUser = users.find(u => u.id === assignedUserId);
    if (!targetUser || !targetUser.isActive || !isUserAssignable(targetUser)) return false;

    try {
      await incomingLeadsApi.assignAndConvert(incomingId, {
        assignedUserId: targetUser.id,
        teamId: toValidUuidOrNull(targetUser.teamId),
        leadName: inc.name.trim() || 'Incoming Lead',
        phone: inc.phone.trim() || '+92 300 0000000',
        valuePKR: 0,
        notes: inc.campaignName
          ? `Incoming lead from ${inc.source} [Campaign: ${inc.campaignName}${inc.adName ? ` / Ad: ${inc.adName}` : ''}].${inc.message ? ` Message: ${inc.message}` : ''}`
          : `Incoming lead from ${inc.source}.${inc.message ? ` Message: ${inc.message}` : ''}`
      });

      setIncomingLeads(prev => prev.map(item => {
        if (item.id === incomingId) {
          return {
            ...item,
            status: 'assigned',
            assignedToId: targetUser.id,
            assignedToUserId: targetUser.id
          };
        }
        return item;
      }));

      try {
        const freshLeads = await leadsApi.listLeads({ limit: 1000 });
        const items = (freshLeads as any).items || (freshLeads as any).leads || [];
        setLeads(items.map(mapLeadDto));
      } catch { /* ignore */ }

      logAction('Incoming Lead Assigned', 'Lead', inc.name, `Assigned to ${targetUser.name} (${inc.source})`, inc.id);
      return true;
    } catch (err) {
      console.error('Failed to assign incoming lead via API:', err);
      return false;
    }
  };

  // Follow-up actions connected to Express REST API
  const addFollowUp = async (followUpData: Omit<FollowUp, 'id' | 'createdAt'>): Promise<FollowUp | null> => {
    try {
      const validLeadId = toValidUuidOrNull(followUpData.leadId);
      if (!validLeadId) {
        console.warn('Cannot schedule follow-up without valid UUID leadId');
        return null;
      }

      const payload: CreateFollowUpPayload = {
        leadId: validLeadId,
        clientBusinessSnapshot: followUpData.clientBusiness || followUpData.clientName || null,
        phone: followUpData.phone || null,
        scheduledDate: followUpData.scheduledDate,
        scheduledTime: followUpData.scheduledTime || '14:00',
        type: (followUpData.type || 'Call') as any,
        assignedToId: toValidUuidOrNull(followUpData.assignedToId) || undefined,
        notes: followUpData.notes || null
      };

      const createdDto = await followUpsApi.createFollowUp(payload);
      const newFu = mapFollowUpDto(createdDto);
      setFollowUps(prev => [newFu, ...prev.filter(f => f.id !== newFu.id)]);
      logAction('Follow-Up Scheduled', 'FollowUp', newFu.clientBusiness || newFu.clientName, `Date: ${newFu.scheduledDate} ${newFu.scheduledTime}`, newFu.id);
      return newFu;
    } catch (err) {
      console.error('Failed to schedule follow-up via API:', err);
      return null;
    }
  };

  const completeFollowUp = async (id: string, resultNotes?: string): Promise<boolean> => {
    try {
      const targetFu = followUps.find(f => f.id === id);
      if (targetFu && (targetFu.status === 'Done' || (targetFu.status as string) === 'Completed')) {
        console.warn('Follow-up is already completed');
        return false;
      }

      const updatedDto = await followUpsApi.completeFollowUp(id, {
        resultOutcome: resultNotes || 'Follow-up marked completed'
      });
      const mapped = mapFollowUpDto(updatedDto);
      setFollowUps(prev => prev.map(f => (f.id === id ? mapped : f)));

      if (mapped.leadId) {
        addLeadActivity(mapped.leadId, {
          type: mapped.type.toLowerCase() === 'call' ? 'call' : mapped.type.toLowerCase() === 'whatsapp' ? 'whatsapp' : 'meeting',
          title: `Follow-Up Completed (${mapped.type})`,
          notes: resultNotes || mapped.notes,
          outcome: 'Completed'
        });
      }

      logAction('Follow-Up Completed', 'FollowUp', mapped.clientBusiness || mapped.clientName, resultNotes || 'Done', id);
      return true;
    } catch (err) {
      console.error('Failed to complete follow-up via API:', err);
      return false;
    }
  };

  const rescheduleFollowUp = async (
    id: string,
    newDate: string,
    newTime: string,
    notes?: string,
    type?: FollowUpType,
    assignedToId?: string
  ): Promise<boolean> => {
    try {
      const targetFu = followUps.find(f => f.id === id);
      if (targetFu && (targetFu.status === 'Done' || (targetFu.status as string) === 'Completed')) {
        console.warn('Cannot reschedule a completed follow-up');
        return false;
      }

      const updatedDto = await followUpsApi.rescheduleFollowUp(id, {
        scheduledDate: newDate,
        scheduledTime: newTime || '14:00',
        reason: notes || undefined,
        notes: notes || undefined,
        type: (type as any) || undefined,
        assignedToId: toValidUuidOrNull(assignedToId) || undefined
      });
      const mapped = mapFollowUpDto(updatedDto);
      setFollowUps(prev => prev.map(f => (f.id === id ? mapped : f)));

      if (mapped.leadId) {
        setLeads(prev => prev.map(l => {
          if (l.id === mapped.leadId) {
            return { ...l, nextFollowUpDate: newDate, nextFollowUpTime: newTime };
          }
          return l;
        }));
      }

      try {
        const [freshFu, freshLeads] = await Promise.all([
          followUpsApi.listFollowUps(),
          leadsApi.listLeads({ limit: 1000 })
        ]);
        if (Array.isArray(freshFu)) setFollowUps(freshFu.map(mapFollowUpDto));
        const leadItems = (freshLeads as any).items || (freshLeads as any).leads || [];
        if (Array.isArray(leadItems)) setLeads(leadItems.map(mapLeadDto));
      } catch { /* ignore */ }

      logAction('Follow-Up Rescheduled', 'FollowUp', mapped.clientBusiness || mapped.clientName, `Moved to ${newDate} at ${newTime}`, id);
      return true;
    } catch (err) {
      console.error('Failed to reschedule follow-up via API:', err);
      return false;
    }
  };

  const deleteFollowUp = async (id: string): Promise<boolean> => {
    try {
      await followUpsApi.deleteFollowUp(id);
      setFollowUps(prev => prev.filter(f => f.id !== id));
      return true;
    } catch (err) {
      console.error('Failed to delete follow-up via API:', err);
      return false;
    }
  };

  // Client actions connected to Express REST API
  const addClient = (clientData: Omit<Client, 'id'>) => {
    if (clientData.leadId && toValidUuidOrNull(clientData.leadId)) {
      convertLeadToClient(clientData.leadId, clientData);
    } else {
      const localClient: Client = {
        ...clientData,
        id: `client-${Date.now()}`
      };
      setClients(prev => [localClient, ...prev]);
    }
  };

  const updateClient = async (client: Client): Promise<boolean> => {
    try {
      const backendStatus: 'Active' | 'Inactive' | 'Suspended' | 'Completed' =
        client.status === 'Active' ? 'Active' :
          client.status === 'Paused' ? 'Suspended' : 'Inactive';

      const updatedDto = await clientsApi.updateClient(client.id, {
        businessName: client.businessName,
        contactName: client.clientName,
        email: toValidEmailOrNull(client.email),
        phone: client.phone,
        city: client.city,
        finalValuePKR: Number(client.finalPrice || client.activeRevenuePKR || 0),
        status: backendStatus,
        termsDetails: client.notes
      });
      const mapped = mapClientDto(updatedDto);
      setClients(prev => prev.map(c => (c.id === client.id ? mapped : c)));
      logAction('Client Updated', 'Client', client.businessName, `Status: ${client.status}`, client.id);
      return true;
    } catch (err) {
      console.error('Failed to update client via API:', err);
      return false;
    }
  };

  const convertLeadToClient = (leadId: string, clientData: Partial<Client>): Client => {
    const lead = leads.find(l => l.id === leadId);
    const todayStr = getLocalDateString();

    const effectivePricingModel = clientData.pricingModel || lead?.pricingModel || 'Monthly Subscription Model';
    const resolvedPricingModelId = toValidUuidOrNull(
      (clientData as any).pricingModelId ||
      lead?.pricingModelId ||
      pricingModels.find(pm => pm.name === effectivePricingModel || pm.id === (clientData as any).pricingModelId)?.id
    );

    const newClient: Client = {
      id: `client-${Date.now()}`,
      leadId: leadId,
      businessName: clientData.businessName || lead?.businessName || 'Business Client',
      clientName: clientData.clientName || lead?.name || 'Contact Person',
      phone: (clientData.phone || lead?.phone || '+92 300 0000000').trim(),
      email: clientData.email || lead?.email || '',
      city: clientData.city || lead?.city || 'Lahore',
      services: clientData.services || lead?.services || [],
      source: (clientData.source || lead?.source || 'Call') as LeadSource,
      pricingModelId: resolvedPricingModelId || undefined,
      pricingModelName: effectivePricingModel,
      pricingModel: effectivePricingModel,
      finalPrice: Number(clientData.finalPrice ?? lead?.valuePKR ?? 80000),
      activeRevenuePKR: Number(clientData.finalPrice ?? lead?.valuePKR ?? 80000),
      currency: 'PKR',
      assignedToName: clientData.assignedToName || lead?.assignedToName || 'Super Admin',
      assignedToId: clientData.assignedToId || lead?.assignedToId || 'u-1',
      generatedByName: lead?.assignedToName || 'Super Admin',
      closedByName: currentUser?.name || 'Super Admin',
      convertedDate: todayStr,
      startDate: todayStr,
      status: 'Active',
      notes: clientData.notes || `Converted from ${lead?.source || 'Call'} lead on ${todayStr}.`
    };

    setClients(prev => [newClient, ...prev]);

    if (toValidUuidOrNull(leadId)) {
      const payload: ConvertLeadPayload = {
        leadId: leadId,
        businessName: newClient.businessName,
        contactName: newClient.clientName,
        email: toValidEmailOrNull(newClient.email),
        phone: newClient.phone,
        city: newClient.city,
        servicesSnapshot: newClient.services,
        source: newClient.source,
        pricingModelId: resolvedPricingModelId,
        finalValuePKR: newClient.finalPrice,
        assignedOwnerId: toValidUuidOrNull(newClient.assignedToId),
        termsDetails: newClient.notes
      };

      clientsApi.convertLead(payload).then(createdDto => {
        const mapped = mapClientDto(createdDto);
        setClients(prev => prev.map(c => c.id === newClient.id ? mapped : c));
        leadsApi.listLeads({ limit: 1000 }).then(res => {
          const items = (res as any).items || (res as any).leads || [];
          setLeads(items.map(mapLeadDto));
        }).catch(() => {
          setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: 'Converted' } : l));
        });
      }).catch(err => {
        console.error('Failed to convert lead to client via API:', err);
      });
    }

    logAction('Lead Converted to Client', 'Client', newClient.businessName, `Converted by ${currentUser?.name} with contract value PKR ${(newClient.finalPrice || 0).toLocaleString()}`, newClient.id);
    return newClient;
  };

  const returnClientToLead = async (clientId: string): Promise<boolean> => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return false;

    try {
      await clientsApi.revertClient(clientId, {
        reason: `Client account "${client.businessName}" reversed to active pipeline stage by ${currentUser?.name}.`,
        revertLeadStatusTo: 'Follow-Up Required'
      });

      setClients(prev => prev.filter(c => c.id !== clientId));

      try {
        const freshLeads = await leadsApi.listLeads({ limit: 1000 });
        const items = (freshLeads as any).items || (freshLeads as any).leads || [];
        setLeads(items.map(mapLeadDto));
      } catch {
        if (client.leadId) {
          setLeads(prev => prev.map(l => l.id === client.leadId ? { ...l, status: 'Follow-Up Required' } : l));
        }
      }

      logAction('Client Returned to Lead', 'Client', client.businessName, 'Reversed conversion back to active lead status', clientId);
      return true;
    } catch (err) {
      console.error('Failed to revert client via API:', err);
      return false;
    }
  };

  // Proposals CRUD Connected to Express REST API
  const addProposal = (propData: Omit<Proposal, 'id' | 'createdAt'>): Proposal => {
    const newId = `prop-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const propTotal = Number(propData.grandTotal ?? propData.grandTotalPKR ?? 0);

    const newProposal: Proposal = {
      ...propData,
      id: newId,
      createdAt: nowIso
    };

    setProposals(prev => [newProposal, ...prev]);

    const validLeadId = toValidUuidOrNull(propData.leadId);
    const payload: CreateProposalPayload = {
      leadId: validLeadId,
      proposalNumber: propData.refNumber || propData.proposalNumber || `PROP-${Date.now().toString().slice(-4)}`,
      issueDate: propData.issueDate || nowIso.split('T')[0],
      expiryDate: propData.expiryDate || null,
      clientSnapshot: {
        clientName: propData.clientName,
        businessName: propData.businessName,
        phone: propData.clientPhone,
        email: propData.clientEmail,
        city: propData.clientCity
      },
      assignedRepId: toValidUuidOrNull(propData.assignedRepId),
      scopeDeliverables: propData.scopeOfWork || null,
      lineItems: (propData.items || []).map(i => ({
        id: i.id,
        name: i.title || i.name || 'Item',
        description: i.description,
        quantity: i.quantity,
        unitPricePKR: i.unitPrice,
        totalPKR: i.total
      })),
      discountPKR: Number(propData.totalDiscount || propData.overallDiscountPKR || 0),
      taxPKR: Number(propData.taxAmount || 0),
      totalPKR: propTotal,
      milestones: (propData.milestones || propData.paymentMilestones || []).map(m => ({
        title: m.title,
        percentage: m.percentage,
        amountPKR: m.amount,
        dueDate: m.dueDate || null
      })),
      terms: propData.termsAndConditions || null,
      status: (propData.status === 'Declined' ? 'Rejected' : propData.status) as any
    };

    proposalsApi.createProposal(payload).then(createdDto => {
      const mapped = mapProposalDto(createdDto);
      setProposals(prev => prev.map(p => p.id === newId ? mapped : p));
    }).catch(err => {
      console.error('Failed to persist proposal to API:', err);
    });

    if (newProposal.leadId) {
      addLeadActivity(newProposal.leadId, {
        type: 'meeting',
        title: `Proposal Generated: ${newProposal.refNumber}`,
        notes: `Proposal generated for ${newProposal.businessName || newProposal.clientName}. Total: PKR ${propTotal.toLocaleString()} (${newProposal.items?.length || 0} items). Validity: ${newProposal.validityDays || 14} days.`,
        outcome: 'Proposal Sent',
        duration: `${newProposal.validityDays || 14} Days Validity`
      });
    }

    logAction('Generated Proposal', 'Lead', newProposal.businessName || newProposal.clientName, `Generated proposal ${newProposal.refNumber} for PKR ${propTotal.toLocaleString()}`, newProposal.id);
    return newProposal;
  };

  const updateProposal = async (updated: Proposal): Promise<boolean> => {
    try {
      const propTotal = Number(updated.grandTotal ?? updated.grandTotalPKR ?? 0);
      const payload: UpdateProposalPayload = {
        expiryDate: updated.expiryDate || null,
        clientSnapshot: {
          clientName: updated.clientName,
          businessName: updated.businessName,
          phone: updated.clientPhone,
          email: updated.clientEmail,
          city: updated.clientCity
        },
        assignedRepId: toValidUuidOrNull(updated.assignedRepId),
        scopeDeliverables: updated.scopeOfWork || null,
        lineItems: (updated.items || []).map(i => ({
          id: i.id,
          name: i.title || i.name || 'Item',
          description: i.description,
          quantity: i.quantity,
          unitPricePKR: i.unitPrice,
          totalPKR: i.total
        })),
        discountPKR: Number(updated.totalDiscount || updated.overallDiscountPKR || 0),
        taxPKR: Number(updated.taxAmount || 0),
        totalPKR: propTotal,
        milestones: (updated.milestones || updated.paymentMilestones || []).map(m => ({
          title: m.title,
          percentage: m.percentage,
          amountPKR: m.amount,
          dueDate: m.dueDate || null
        })),
        terms: updated.termsAndConditions || null,
        status: (updated.status === 'Declined' ? 'Rejected' : updated.status) as any
      };

      const updatedDto = await proposalsApi.updateProposal(updated.id, payload);
      const mapped = mapProposalDto(updatedDto);
      setProposals(prev => prev.map(p => (p.id === updated.id ? mapped : p)));
      logAction('Updated Proposal', 'Lead', updated.businessName || updated.clientName, `Updated proposal ${updated.refNumber} (PKR ${propTotal.toLocaleString()})`, updated.id);
      return true;
    } catch (err) {
      console.error('Failed to update proposal via API:', err);
      return false;
    }
  };

  const deleteProposal = (id: string) => {
    setProposals(prev => prev.filter(p => p.id !== id));
  };

  // Administration CRUD (Connected to Express REST APIs)
  const addUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string; user?: User }> => {
    if (!currentUser || !currentRolePerms?.canManageUsers) {
      return { success: false, error: 'Unauthorized: You do not have permissions to manage or create users.' };
    }

    if (!canCreateUserWithRoleAuth(userData.role, currentUser, currentRolePerms)) {
      return {
        success: false,
        error: `Security Policy Violation: ${currentUser.role} accounts are not authorized to create ${userData.role} accounts.`
      };
    }

    try {
      const createdDto = await usersApi.createUser({
        name: userData.name.trim(),
        email: userData.email.trim().toLowerCase(),
        phone: userData.phone?.trim(),
        role: userData.role,
        teamId: userData.teamId || null,
        managerId: userData.managerId || null,
        teamLeadId: userData.teamLeadId || null,
        password: userData.password || 'Emp@1234!'
      });

      const newUser = mapUserDto(createdDto);
      setUsers(prev => [...prev.filter(u => u.id !== newUser.id), newUser]);
      logAction('User Created', 'User', newUser.name, `Role: ${newUser.role}, Email: ${newUser.email}`, newUser.id);
      return { success: true, user: newUser };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create user on server.';
      return { success: false, error: message };
    }
  };

  const updateUser = async (user: User): Promise<{ success: boolean; error?: string }> => {
    const existing = users.find(u => u.id === user.id) || (currentUser?.id === user.id ? currentUser : null);
    if (!existing) {
      return { success: false, error: 'User not found.' };
    }

    const isSelf = currentUser?.id === user.id;

    if (!isSelf && !canManageUserAuth(existing, currentUser, currentRolePerms, hierarchyScope)) {
      return {
        success: false,
        error: `Security Policy: You are not authorized to modify this protected ${existing.role} account.`
      };
    }

    if (isSelf && existing.role !== user.role && currentUser.role !== 'Super Admin') {
      return { success: false, error: 'Security Policy: Self-role escalation and role change are strictly prohibited.' };
    }

    if (existing.role !== user.role) {
      if (!canTransitionUserRoleAuth(existing, user.role, currentUser, currentRolePerms, hierarchyScope)) {
        return {
          success: false,
          error: `Security Policy: You are not authorized to change role from ${existing.role} to ${user.role}.`
        };
      }
    }

    try {
      const updatedDto = await usersApi.updateUser(user.id, {
        name: user.name.trim(),
        email: user.email.trim().toLowerCase(),
        phone: user.phone?.trim() || null,
        role: user.role,
        teamId: user.teamId || null,
        managerId: user.managerId || null,
        teamLeadId: user.teamLeadId || null,
        avatarUrl: user.avatar || null
      });

      const mapped = mapUserDto(updatedDto);
      setUsers(prev => prev.map(u => (u.id === user.id ? mapped : u)));
      if (currentUser?.id === user.id) {
        setCurrentUser(mapped);
      }
      logAction('User Updated', 'User', user.name, `Role: ${user.role}`, user.id);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update user on server.';
      return { success: false, error: message };
    }
  };

  const changeMyPassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      logAction('Password Changed', 'Auth', currentUser?.name || 'Self', 'User changed their account password', currentUser?.id);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change password.';
      return { success: false, error: message };
    }
  };

  const resetUserPassword = async (userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await usersApi.resetPassword(userId, newPassword);
      logAction('Password Reset', 'Auth', 'User Account', `Password reset for user ${userId}`, userId);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset password.';
      return { success: false, error: message };
    }
  };

  const toggleUserStatus = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    const existing = users.find(u => u.id === userId);
    if (!existing) return { success: false, error: 'User not found.' };

    if (!canManageUserAuth(existing, currentUser, currentRolePerms, hierarchyScope)) {
      return {
        success: false,
        error: `Security Policy: You are not authorized to modify this protected ${existing.role} status.`
      };
    }

    try {
      const newStatus = existing.isActive ? 'inactive' : 'active';
      const updatedDto = await usersApi.updateStatus(userId, newStatus);
      const updatedUser = mapUserDto(updatedDto);
      setUsers(prev => prev.map(u => (u.id === userId ? updatedUser : u)));
      if (currentUser?.id === userId) {
        setCurrentUser(updatedUser);
      }
      logAction(
        updatedUser.isActive ? 'User Activated' : 'User Deactivated',
        'User',
        existing.name,
        `Status changed to ${updatedUser.isActive ? 'Active' : 'Inactive'}`,
        userId
      );
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to toggle user status on server.';
      return { success: false, error: message };
    }
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    const existing = users.find(u => u.id === userId);
    if (!existing) return { success: false, error: 'User not found.' };

    if (!canManageUserAuth(existing, currentUser, currentRolePerms, hierarchyScope)) {
      return {
        success: false,
        error: `Security Policy: You cannot delete a protected ${existing.role} account.`
      };
    }

    if (existing.id === currentUser?.id) {
      return { success: false, error: 'You cannot delete your own active user account.' };
    }

    try {
      await usersApi.updateStatus(userId, 'inactive');
      setUsers(prev => prev.filter(u => u.id !== userId));
      logAction('User Deleted', 'User', existing.name, `Account deactivated by ${currentUser?.name}`, userId);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete user on server.';
      return { success: false, error: message };
    }
  };

  const addTeam = async (teamData: Omit<Team, 'id' | 'createdAt'>): Promise<Team | null> => {
    try {
      const createdDto = await teamsApi.createTeam({
        name: teamData.name.trim(),
        code: teamData.code?.trim().toUpperCase() || teamData.name.trim().substring(0, 3).toUpperCase(),
        description: teamData.description?.trim(),
        managerId: teamData.managerId || null,
        teamLeadId: teamData.leaderId || null,
        memberIds: teamData.memberIds || []
      });
      const newTeam = mapTeamDto(createdDto);
      newTeam.memberIds = (createdDto as any).member_ids || (createdDto as any).memberIds || teamData.memberIds || [];

      setTeams(prev => [...prev.filter(t => t.id !== newTeam.id), newTeam]);
      await fetchReferenceData();
      logAction('Team Created', 'Team', newTeam.name, `Manager: ${newTeam.managerName || '-'}, Lead: ${newTeam.leaderName || '-'}, Members: ${newTeam.memberIds.length}`, newTeam.id);
      return newTeam;
    } catch (err) {
      console.error('Failed to create team via API:', err);
      return null;
    }
  };

  const updateTeam = async (team: Team): Promise<Team | null> => {
    try {
      const updatedDto = await teamsApi.updateTeam(team.id, {
        name: team.name.trim(),
        code: team.code?.trim().toUpperCase(),
        description: team.description?.trim(),
        managerId: team.managerId || null,
        teamLeadId: team.leaderId || null,
        status: (team.status as 'active' | 'inactive' | 'archived') || 'active',
        memberIds: team.memberIds || []
      });
      const updatedTeam = mapTeamDto(updatedDto);
      updatedTeam.memberIds = (updatedDto as any).member_ids || (updatedDto as any).memberIds || team.memberIds || [];

      setTeams(prev => prev.map(t => (t.id === team.id ? updatedTeam : t)));
      await fetchReferenceData();
      logAction('Team Updated', 'Team', team.name, 'Details and members updated', team.id);
      return updatedTeam;
    } catch (err) {
      console.error('Failed to update team via API:', err);
      return null;
    }
  };

  const deleteTeam = async (teamId: string): Promise<void> => {
    try {
      await teamsApi.deleteTeam(teamId);
      setTeams(prev => prev.filter(t => t.id !== teamId));
      await fetchReferenceData();
      logAction('Team Deleted', 'Team', `Team ID ${teamId}`, 'Team removed from system', teamId);
    } catch (err) {
      console.error('Failed to delete team via API:', err);
    }
  };

  const addService = async (serviceData: Omit<ServiceItem, 'id'>): Promise<ServiceItem | null> => {
    try {
      const createdDto = await servicesApi.createService({
        name: serviceData.name.trim(),
        category: serviceData.category.trim(),
        defaultPricePKR: serviceData.defaultPricePKR ?? serviceData.basePricePKR ?? 0,
        description: serviceData.description?.trim(),
        isActive: serviceData.isActive !== false
      });
      const newService = mapServiceDto(createdDto);
      setServices(prev => [...prev.filter(s => s.id !== newService.id), newService]);
      const price = newService.defaultPricePKR;
      logAction('Service Added', 'Service', newService.name, `Price: Rs. ${price.toLocaleString()}`, newService.id);
      return newService;
    } catch (err) {
      console.error('Failed to add service via API:', err);
      return null;
    }
  };

  const updateService = async (service: ServiceItem): Promise<ServiceItem | null> => {
    try {
      const updatedDto = await servicesApi.updateService(service.id, {
        name: service.name.trim(),
        category: service.category.trim(),
        defaultPricePKR: service.defaultPricePKR ?? service.basePricePKR ?? 0,
        description: service.description?.trim(),
        isActive: service.isActive !== false
      });
      const updatedService = mapServiceDto(updatedDto);
      setServices(prev => prev.map(s => (s.id === service.id ? updatedService : s)));
      const price = updatedService.defaultPricePKR;
      logAction('Service Updated', 'Service', service.name, `Price: Rs. ${price.toLocaleString()}`, service.id);
      return updatedService;
    } catch (err) {
      console.error('Failed to update service via API:', err);
      return null;
    }
  };

  const deleteService = async (serviceId: string): Promise<void> => {
    try {
      await servicesApi.deleteService(serviceId);
      setServices(prev => prev.filter(s => s.id !== serviceId));
      logAction('Service Deleted', 'Service', `Service ID ${serviceId}`, 'Service removed', serviceId);
    } catch (err) {
      console.error('Failed to delete service via API:', err);
    }
  };

  const addSource = async (source: string): Promise<void> => {
    const trimmed = source.trim();
    if (!trimmed || sources.includes(trimmed)) return;
    try {
      await sourcesApi.createSource({ name: trimmed, isActive: true });
      setSources(prev => [...prev.filter(s => s !== trimmed), trimmed]);
      logAction('Lead Source Added', 'Source', trimmed, 'New lead source added');
    } catch (err) {
      console.error('Failed to add source via API:', err);
    }
  };

  const updateSource = async (oldSource: string, newSource: string): Promise<void> => {
    const trimmedNew = newSource.trim();
    if (!trimmedNew) return;
    try {
      const list = await sourcesApi.listSources();
      const existingDto = list.find(s => s.name === oldSource);
      if (existingDto) {
        await sourcesApi.updateSource(existingDto.id, { name: trimmedNew });
      }
      setSources(prev => prev.map(s => (s === oldSource ? trimmedNew : s)));
      setLeads(prev => prev.map(l => (l.source === oldSource ? { ...l, source: normalizeLeadSource(trimmedNew) } : l)));
      logAction('Lead Source Updated', 'Source', trimmedNew, `Renamed from ${oldSource}`);
    } catch (err) {
      console.error('Failed to update source via API:', err);
    }
  };

  const deleteSource = async (source: string): Promise<void> => {
    try {
      const list = await sourcesApi.listSources();
      const existingDto = list.find(s => s.name === source);
      if (existingDto) {
        await sourcesApi.deleteSource(existingDto.id);
      }
      setSources(prev => prev.filter(s => s !== source));
      logAction('Lead Source Deleted', 'Source', source, 'Source removed from system');
    } catch (err) {
      console.error('Failed to delete source via API:', err);
    }
  };

  const updateRolePermission = async (perm: RolePermission): Promise<void> => {
    if (!currentUser || currentUser.role !== 'Super Admin' || !canManageRoles) return;
    try {
      const currentDef = rolePermissions.find(r => r.role === perm.role);
      if (currentDef) {
        const keys = Object.keys(perm) as (keyof RolePermission)[];
        for (const k of keys) {
          if (k !== 'role' && k !== 'description' && perm[k] !== currentDef[k]) {
            await rolesApi.updateCapability(perm.role, k, Boolean(perm[k]));
          }
        }
      }
      const freshMatrices = await rolesApi.getAllMatrices();
      setRolePermissions(mapRoleMatrices(freshMatrices));
      logAction('Role Permissions Updated', 'Setting', perm.role, `Updated capabilities for ${perm.role}`);
    } catch (err) {
      console.error('Failed to update role permissions via API:', err);
    }
  };

  const saveAllRolePermissions = async (newPermissions: RolePermission[]): Promise<void> => {
    if (!currentUser || currentUser.role !== 'Super Admin' || !canManageRoles) return;
    try {
      for (const newPerm of newPermissions) {
        const currentDef = rolePermissions.find(r => r.role === newPerm.role);
        if (currentDef) {
          const keys = Object.keys(newPerm) as (keyof RolePermission)[];
          for (const k of keys) {
            if (k !== 'role' && k !== 'description' && newPerm[k] !== currentDef[k]) {
              await rolesApi.updateCapability(newPerm.role, k, Boolean(newPerm[k]));
            }
          }
        }
      }
      const freshMatrices = await rolesApi.getAllMatrices();
      setRolePermissions(mapRoleMatrices(freshMatrices));
      logAction('Role Permissions Matrix Saved', 'Setting', 'Role Capabilities', 'Updated capability matrix across all system roles');
    } catch (err) {
      console.error('Failed to save role permissions matrix via API:', err);
    }
  };

  const resetRolePermissionsToDefault = async (): Promise<void> => {
    if (!currentUser || currentUser.role !== 'Super Admin' || !canManageRoles) return;
    try {
      const freshMatrices = await rolesApi.resetDefaults();
      setRolePermissions(mapRoleMatrices(freshMatrices));
      logAction('Role Permissions Reset', 'Setting', 'Default Matrix', 'Restored default capability matrix for roles');
    } catch (err) {
      console.error('Failed to reset role permissions via API:', err);
    }
  };

  const updateSettings = async (
    newSettings: Partial<SystemSettings>,
    moduleKey?: string,
    moduleTitle?: string
  ): Promise<void> => {
    // Optimistic UI update
    setSettings(prev => ({ ...prev, ...newSettings }));
    try {
      const category = moduleKey || 'general';
      const updated = await settingsApi.updateCategory(category, newSettings);
      if (updated) {
        setSettings(updated);
      }
    } catch (err) {
      console.error('Failed to update settings in PostgreSQL:', err);
    }
    logAction(
      moduleTitle ? `${moduleTitle} Saved` : 'System Settings Saved',
      'Setting',
      moduleTitle || 'Company Config',
      'Updated settings configuration'
    );
  };

  const addPricingModel = async (modelData: Omit<PricingModelItem, 'id'>): Promise<PricingModelItem | null> => {
    try {
      const createdDto = await pricingModelsApi.createPricingModel({
        name: modelData.name.trim(),
        billingType: modelData.billingType,
        description: modelData.description?.trim(),
        isActive: modelData.isActive !== false,
        isDefault: Boolean(modelData.isSystemDefault),
        defaultValues: {
          defaultSetupFeePKR: modelData.defaultSetupFeePKR || 0,
          defaultBillingFrequency: modelData.defaultBillingFrequency || 'Monthly'
        },
        fieldSchema: (modelData.fields || []).map(f => ({
          ...f,
          key: f.key?.trim() || f.label?.toLowerCase().replace(/[^a-zA-Z0-9]/g, '') || `field_${Date.now()}`,
          label: f.label?.trim() || 'Field',
          type: f.type || 'text',
          required: Boolean(f.isRequired ?? (f as any).required),
          isRequired: Boolean(f.isRequired ?? (f as any).required),
          includeInTotal: Boolean(f.includeInTotal)
        })) as any
      });
      const newPm = mapPricingModelDto(createdDto);
      setPricingModels(prev => [...prev.filter(m => m.id !== newPm.id), newPm]);
      logAction('Pricing Model Added', 'Setting', newPm.name, `Billing: ${newPm.billingType}`, newPm.id);
      return newPm;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add pricing model';
      console.error('Failed to add pricing model via API:', message);
      throw err;
    }
  };

  const updatePricingModel = async (model: PricingModelItem): Promise<PricingModelItem | null> => {
    try {
      const updatedDto = await pricingModelsApi.updatePricingModel(model.id, {
        name: model.name.trim(),
        billingType: model.billingType,
        description: model.description?.trim(),
        isActive: model.isActive !== false,
        isDefault: Boolean(model.isSystemDefault),
        defaultValues: {
          defaultSetupFeePKR: model.defaultSetupFeePKR || 0,
          defaultBillingFrequency: model.defaultBillingFrequency || 'Monthly'
        },
        fieldSchema: (model.fields || []).map(f => ({
          ...f,
          key: f.key?.trim() || f.label?.toLowerCase().replace(/[^a-zA-Z0-9]/g, '') || `field_${Date.now()}`,
          label: f.label?.trim() || 'Field',
          type: f.type || 'text',
          required: Boolean(f.isRequired ?? (f as any).required),
          isRequired: Boolean(f.isRequired ?? (f as any).required),
          includeInTotal: Boolean(f.includeInTotal)
        })) as any
      });
      const updatedPm = mapPricingModelDto(updatedDto);
      setPricingModels(prev => prev.map(m => (m.id === model.id ? updatedPm : m)));
      logAction('Pricing Model Updated', 'Setting', model.name, `Billing: ${model.billingType}`, model.id);
      return updatedPm;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update pricing model';
      console.error('Failed to update pricing model via API:', message);
      throw err;
    }
  };

  const deletePricingModel = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await pricingModelsApi.deletePricingModel(id);
      setPricingModels(prev => prev.filter(m => m.id !== id));
      logAction('Pricing Model Deleted', 'Setting', `Model ID ${id}`, 'Pricing model removed', id);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete pricing model via API.';
      return { success: false, error: message };
    }
  };

  const resetToFactoryDefaults = async (): Promise<void> => {
    safeLocalStorage.clear();
    purgeObsoleteLocalStorageKeys();
    try {
      const defaults = await settingsApi.resetToDefaults();
      setSettings(defaults || DEFAULT_SETTINGS);
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
    setUsers([]);
    setTeams([]);
    setServices([]);
    setSources([]);
    setPricingModels([]);
    setLeads([]);
    setFollowUps([]);
    setClients([]);
    setProposals([]);
    setActivityLogs([]);
    setIncomingLeads([]);
    setFilterState({
      search: '',
      status: 'All',
      assignedToId: 'All',
      teamId: 'All',
      service: 'All',
      source: 'All',
      fromDate: '',
      toDate: '',
      quality: 'All',
      priority: 'All'
    });
    fetchReferenceData();
    if (currentUser) {
      fetchOperationalData(currentUser.role);
    }
  };

  return (
    <CRMContext.Provider
      value={{
        currentUser,
        isAuthLoading,
        isDataLoading,
        users,
        scopedUsers,
        assignableUsers,
        login,
        logout,
        switchUser,
        addUser,
        updateUser,
        changeMyPassword,
        resetUserPassword,
        toggleUserStatus,
        deleteUser,
        teams,
        scopedTeams,
        addTeam,
        updateTeam,
        deleteTeam,
        services,
        addService,
        updateService,
        deleteService,
        sources,
        addSource,
        updateSource,
        deleteSource,
        rolePermissions,
        updateRolePermission,
        saveAllRolePermissions,
        resetRolePermissionsToDefault,
        settings,
        updateSettings,
        pricingModels,
        addPricingModel,
        updatePricingModel,
        deletePricingModel,
        leads,
        scopedLeads,
        filterState,
        setFilterState,
        filteredLeads,
        addLead,
        updateLead,
        deleteLead,
        reassignLead,
        changeLeadStatus,
        addLeadActivity,
        importLeads,
        followUps,
        scopedFollowUps,
        addFollowUp,
        completeFollowUp,
        rescheduleFollowUp,
        deleteFollowUp,
        clients,
        scopedClients,
        addClient,
        updateClient,
        convertLeadToClient,
        returnClientToLead,
        proposals,
        addProposal,
        updateProposal,
        deleteProposal,
        incomingLeads,
        assignIncomingLead,
        activityLogs,
        logAction,
        metrics,
        canAccessAdmin,
        canManageUsers,
        canManageRoles,
        canManageTeams,
        canManageServices,
        canViewReports,
        canViewClients,
        canViewAuditLogs,
        canAccessSettings,
        canBulkImportExport,
        canCreateLeads,
        canViewAllLeads,
        canGenerateProposals,
        canManageFollowUps: true,
        canViewIncomingLeads,
        canAssignIncomingLeads,
        canManageIntegrations,
        canManageSuperAdminAccount,
        canManageUser,
        canCreateUserWithRole,
        canTransitionUserRole,
        getAllowedTargetRoles,
        canEditLeadItem,
        canDeleteLeadItem,
        canReassignLeadItem,
        isUserAssignable,
        refetchReferenceData: fetchReferenceData,
        refetchOperationalData: () => fetchOperationalData(currentUser?.role),
        resetToFactoryDefaults
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
