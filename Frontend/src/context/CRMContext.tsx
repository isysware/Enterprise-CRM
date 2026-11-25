'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useMemo, ReactNode } from 'react';
import {
  User,
  UserRole,
  Team,
  ServiceItem,
  Lead,
  FollowUp,
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
  Activity,
  Proposal,
  IncomingLead
} from '../types';
import {
  DEFAULT_USERS,
  DEFAULT_TEAMS,
  DEFAULT_SERVICES,
  DEFAULT_SOURCES,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_PRICING_MODELS,
  DEFAULT_SETTINGS,
  INITIAL_CLIENTS,
  INITIAL_LEADS,
  INITIAL_FOLLOW_UPS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_INCOMING_LEADS
} from '../data/mockData';
import { getClientRevenue, parseAmount, getLocalDateString, classifyFollowUp } from '../utils/formatters';
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

interface CRMContextType {
  // Authentication & Current User
  currentUser: User | null;
  users: User[];
  scopedUsers: User[]; // Filtered by current user hierarchy
  assignableUsers: User[]; // Visible users available for assignment/reassignment
  login: (email: string, pass: string, selectedRole?: UserRole) => { success: boolean; error?: string };
  logout: () => void;
  switchUser: (userId: string) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => { success: boolean; error?: string; user?: User };
  updateUser: (user: User) => { success: boolean; error?: string };
  toggleUserStatus: (userId: string) => { success: boolean; error?: string };
  deleteUser: (userId: string) => { success: boolean; error?: string };

  // Teams & Services & Sources & Roles
  teams: Team[];
  scopedTeams: Team[];
  addTeam: (team: Omit<Team, 'id' | 'createdAt'>) => void;
  updateTeam: (team: Team) => void;
  deleteTeam: (teamId: string) => void;

  services: ServiceItem[];
  addService: (service: Omit<ServiceItem, 'id'>) => void;
  updateService: (service: ServiceItem) => void;
  deleteService: (serviceId: string) => void;

  sources: string[];
  addSource: (source: string) => void;
  updateSource: (oldSource: string, newSource: string) => void;
  deleteSource: (source: string) => void;

  rolePermissions: RolePermission[];
  updateRolePermission: (permission: RolePermission) => void;
  saveAllRolePermissions: (permissions: RolePermission[]) => void;
  resetRolePermissionsToDefault: () => void;

  settings: SystemSettings;
  updateSettings: (settings: Partial<SystemSettings>, moduleKey?: string, moduleTitle?: string) => void;

  // Pricing Models (Configurable)
  pricingModels: PricingModelItem[];
  addPricingModel: (model: Omit<PricingModelItem, 'id'>) => void;
  updatePricingModel: (model: PricingModelItem) => void;
  deletePricingModel: (id: string) => { success: boolean; error?: string };

  // Leads
  leads: Lead[];
  scopedLeads: Lead[]; // Filtered by current user RBAC permissions
  filterState: LeadFilterState;
  setFilterState: React.Dispatch<React.SetStateAction<LeadFilterState>>;
  filteredLeads: Lead[];
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'lastContactDate' | 'activities'>) => void;
  updateLead: (lead: Lead) => void;
  deleteLead: (leadId: string) => boolean;
  reassignLead: (leadId: string, newUserId: string) => void;
  changeLeadStatus: (leadId: string, newStatus: LeadStatus) => void;
  addLeadActivity: (leadId: string, activity: Omit<Activity, 'id' | 'timestamp' | 'author'>) => void;
  importLeads: (leadsToImport: Partial<Lead>[]) => number;

  // Follow-ups
  followUps: FollowUp[];
  scopedFollowUps: FollowUp[];
  addFollowUp: (followUp: Omit<FollowUp, 'id' | 'createdAt'>) => void;
  completeFollowUp: (id: string, resultNotes?: string) => void;
  rescheduleFollowUp: (id: string, newDate: string, newTime: string, notes?: string) => void;
  deleteFollowUp: (id: string) => void;

  // Clients
  clients: Client[];
  scopedClients: Client[];
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (client: Client) => void;
  convertLeadToClient: (leadId: string, clientData: Partial<Client>) => Client;
  returnClientToLead: (clientId: string) => void;

  // Proposals
  proposals: Proposal[];
  addProposal: (proposal: Omit<Proposal, 'id' | 'createdAt'>) => Proposal;
  updateProposal: (proposal: Proposal) => void;
  deleteProposal: (id: string) => void;
  canGenerateProposals: boolean;

  // Incoming Leads
  incomingLeads: IncomingLead[];
  assignIncomingLead: (incomingId: string, assignedUserId: string) => boolean;

  // Activity Logs
  activityLogs: ActivityLog[];
  logAction: (action: string, entityType: ActivityLog['entityType'], entityTitle: string, details: string, entityId?: string) => void;

  // KPI Metrics (Calculated for Dashboard)
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
  canViewAllLeads?: boolean;
  canManageFollowUps?: boolean;
  // Phase F1.3 Canonical Capabilities
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

  // Global reset
  resetToFactoryDefaults: () => void;
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

export const CRMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Deterministic initial state (identical between server SSR and client initial hydration)
  const [currentUser, setCurrentUser] = useState<User | null>(DEFAULT_USERS[0]);
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [teams, setTeams] = useState<Team[]>(DEFAULT_TEAMS);
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
  const [sources, setSources] = useState<string[]>(DEFAULT_SOURCES);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>(DEFAULT_ROLE_PERMISSIONS);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [pricingModels, setPricingModels] = useState<PricingModelItem[]>(DEFAULT_PRICING_MODELS);
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [followUps, setFollowUps] = useState<FollowUp[]>(INITIAL_FOLLOW_UPS);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(INITIAL_ACTIVITY_LOGS);
  const [incomingLeads, setIncomingLeads] = useState<IncomingLead[]>(INITIAL_INCOMING_LEADS);

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
  const isFirstMountRef = useRef(true);

  // Hydrate persisted state from localStorage only after client mount (prevents SSR hydration mismatch)
  useEffect(() => {
    try {
      const isExplicitlyLoggedOut = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}logged_out`) === 'true';
      if (isExplicitlyLoggedOut) {
        setCurrentUser(null);
      } else {
        const savedUser = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}current_user`);
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            if (parsed && parsed.id) setCurrentUser(parsed);
          } catch { /* ignore */ }
        }
      }

      const savedUsers = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}users`);
      if (savedUsers) {
        try {
          const parsed: User[] = JSON.parse(savedUsers);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const userMap = new Map<string, User>();
            const emailMap = new Map<string, string>();
            parsed.forEach(u => {
              if (u && u.id) {
                const emailKey = (u.email || '').toLowerCase().trim();
                if (emailKey && emailMap.has(emailKey)) return;
                if (!userMap.has(u.id)) {
                  userMap.set(u.id, u);
                  if (emailKey) emailMap.set(emailKey, u.id);
                }
              }
            });
            DEFAULT_USERS.forEach(defU => {
              const emailKey = (defU.email || '').toLowerCase().trim();
              const hasId = userMap.has(defU.id);
              const hasEmail = emailKey ? emailMap.has(emailKey) : false;
              if (!hasId && !hasEmail) {
                userMap.set(defU.id, defU);
                if (emailKey) emailMap.set(emailKey, defU.id);
              }
            });
            setUsers(Array.from(userMap.values()));
          }
        } catch { /* ignore */ }
      }

      const savedTeams = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}teams`);
      if (savedTeams) {
        try {
          const parsed = JSON.parse(savedTeams);
          if (Array.isArray(parsed) && parsed.length > 0) setTeams(parsed);
        } catch { /* ignore */ }
      }

      const savedServices = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}services`);
      if (savedServices) {
        try {
          const parsed = JSON.parse(savedServices);
          if (Array.isArray(parsed) && parsed.length > 0) setServices(parsed);
        } catch { /* ignore */ }
      }

      const savedSources = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}sources`);
      if (savedSources) {
        try {
          const parsed = JSON.parse(savedSources);
          if (Array.isArray(parsed) && parsed.length > 0) setSources(parsed);
        } catch { /* ignore */ }
      }

      const savedRoles = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}roles`);
      if (savedRoles) {
        try {
          const parsed: RolePermission[] = JSON.parse(savedRoles);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const roleMap = new Map<string, RolePermission>();
            parsed.forEach(savedRole => {
              if (savedRole && savedRole.role) {
                const def = DEFAULT_ROLE_PERMISSIONS.find(d => d.role === savedRole.role);
                if (def) {
                  const merged: RolePermission = { ...def };
                  (Object.keys(savedRole) as (keyof RolePermission)[]).forEach(key => {
                    const val = savedRole[key];
                    if (val !== undefined) (merged as any)[key] = val;
                  });
                  roleMap.set(savedRole.role, merged);
                } else {
                  roleMap.set(savedRole.role, savedRole);
                }
              }
            });
            DEFAULT_ROLE_PERMISSIONS.forEach(def => {
              if (!roleMap.has(def.role)) roleMap.set(def.role, { ...def });
            });
            const canonicalRoles = DEFAULT_ROLE_PERMISSIONS.map(d => roleMap.get(d.role)!);
            const customRoles = Array.from(roleMap.values()).filter(
              r => !DEFAULT_ROLE_PERMISSIONS.some(d => d.role === r.role)
            );
            const allRoles = [...canonicalRoles, ...customRoles];
            allRoles.forEach(r => {
              if (r.role === 'Super Admin') {
                r.canManageSuperAdmin = true;
                r.canManageRoles = true;
              } else {
                r.canManageSuperAdmin = false;
              }
              if (r.role === 'Manager' || r.role === 'Team Lead' || r.role === 'Employee') {
                r.canManageRoles = false;
              }
              if (r.role === 'Employee') {
                r.canViewIncomingLeads = false;
                r.canAssignIncomingLeads = false;
                r.canManageIntegrations = false;
              }
            });
            setRolePermissions(allRoles);
          }
        } catch { /* ignore */ }
      }

      const savedMaster = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}settings`);
      const savedBranding = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}settings_branding`);
      const savedLetterhead = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}settings_letterhead`);
      const savedPricing = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}settings_pricing_config`);
      const savedComm = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}settings_communication`);

      if (savedMaster || savedBranding || savedLetterhead || savedPricing || savedComm) {
        let combined = { ...DEFAULT_SETTINGS };
        if (savedMaster) { try { combined = { ...combined, ...JSON.parse(savedMaster) }; } catch { /* ignore */ } }
        if (savedBranding) { try { combined = { ...combined, ...JSON.parse(savedBranding) }; } catch { /* ignore */ } }
        if (savedLetterhead) { try { combined = { ...combined, ...JSON.parse(savedLetterhead) }; } catch { /* ignore */ } }
        if (savedPricing) { try { combined = { ...combined, ...JSON.parse(savedPricing) }; } catch { /* ignore */ } }
        if (savedComm) { try { combined = { ...combined, ...JSON.parse(savedComm) }; } catch { /* ignore */ } }
        setSettings(combined);
      }

      const savedPricingModels = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}pricing_models`);
      if (savedPricingModels) {
        try {
          const parsed: PricingModelItem[] = JSON.parse(savedPricingModels);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPricingModels(parsed.map(pm => {
              if (!pm.fields || pm.fields.length === 0) {
                const def = DEFAULT_PRICING_MODELS.find(d => d.id === pm.id || d.name.toLowerCase() === pm.name.toLowerCase());
                if (def && def.fields) return { ...pm, fields: def.fields };
              }
              return pm;
            }));
          }
        } catch { /* ignore */ }
      }

      const savedLeads = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}leads`);
      if (savedLeads) {
        try {
          const parsed = JSON.parse(savedLeads);
          if (Array.isArray(parsed)) setLeads(parsed);
        } catch { /* ignore */ }
      }

      const savedFollowUps = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}follow_ups`);
      if (savedFollowUps) {
        try {
          const parsed = JSON.parse(savedFollowUps);
          if (Array.isArray(parsed)) setFollowUps(parsed);
        } catch { /* ignore */ }
      }

      const savedClients = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}clients`);
      if (savedClients) {
        try {
          const parsed = JSON.parse(savedClients);
          if (Array.isArray(parsed)) setClients(parsed);
        } catch { /* ignore */ }
      }

      const savedProposals = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}proposals`);
      if (savedProposals) {
        try {
          const parsed = JSON.parse(savedProposals);
          if (Array.isArray(parsed)) setProposals(parsed);
        } catch { /* ignore */ }
      }

      const savedLogs = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}activity_logs`);
      if (savedLogs) {
        try {
          const parsed = JSON.parse(savedLogs);
          if (Array.isArray(parsed)) setActivityLogs(parsed);
        } catch { /* ignore */ }
      }

      const savedIncoming = safeLocalStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}incoming_leads`);
      if (savedIncoming) {
        try {
          const parsed = JSON.parse(savedIncoming);
          if (Array.isArray(parsed)) setIncomingLeads(parsed);
        } catch { /* ignore */ }
      }
    } finally {
      isHydratedRef.current = true;
      setIsHydrated(true);
    }
  }, []);

  // Save to localStorage on changes (guarded after hydration and skipped on initial mount)
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    if (!isHydrated) return;
    if (currentUser) {
      safeLocalStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}logged_out`);
      safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}current_user`, JSON.stringify(currentUser));
    } else {
      safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}logged_out`, 'true');
      safeLocalStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}current_user`);
    }
  }, [currentUser, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}users`, JSON.stringify(users));
  }, [users, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}teams`, JSON.stringify(teams));
  }, [teams, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}services`, JSON.stringify(services));
  }, [services, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}sources`, JSON.stringify(sources));
  }, [sources, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}roles`, JSON.stringify(rolePermissions));
  }, [rolePermissions, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}settings`, JSON.stringify(settings));
  }, [settings, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}pricing_models`, JSON.stringify(pricingModels));
  }, [pricingModels, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}leads`, JSON.stringify(leads));
  }, [leads, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}follow_ups`, JSON.stringify(followUps));
  }, [followUps, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}clients`, JSON.stringify(clients));
  }, [clients, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}proposals`, JSON.stringify(proposals));
  }, [proposals, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}activity_logs`, JSON.stringify(activityLogs));
  }, [activityLogs, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}incoming_leads`, JSON.stringify(incomingLeads));
  }, [incomingLeads, isHydrated]);

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
    setActivityLogs(prev => [newLog, ...prev.slice(0, 199)]); // keep max 200 logs
  };

  // Auth methods
  const login = (email: string, pass: string, selectedRole?: UserRole) => {
    const user = users.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
    if (!user) {
      return { success: false, error: 'No account found with this email address.' };
    }
    if (!user.isActive) {
      return { success: false, error: 'This user account is currently deactivated. Please contact Super Admin.' };
    }
    if (selectedRole && user.role !== selectedRole) {
      return {
        success: false,
        error: `Role mismatch: This account belongs to "${user.role}", not "${selectedRole}". Please switch to the "${user.role}" tab or select the corresponding account.`
      };
    }
    if (user.password && user.password !== pass) {
      return { success: false, error: 'Invalid password. Please check your credentials.' };
    }

    const updatedUser = {
      ...user,
      lastLogin: new Date().toISOString()
    };
    safeLocalStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}logged_out`);
    safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}current_user`, JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
    
    // Log auth
    const authLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'User Logged In',
      entityType: 'Auth',
      entityTitle: `${user.role} Portal Session`,
      details: `Signed in as ${user.email}`
    };
    setActivityLogs(prev => [authLog, ...prev]);

    return { success: true };
  };

  const logout = () => {
    if (currentUser) {
      logAction('User Logged Out', 'Auth', `${currentUser.role} Session`, `Signed out`);
    }
    safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}logged_out`, 'true');
    safeLocalStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}current_user`);
    setCurrentUser(null);
  };

  const switchUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      safeLocalStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}logged_out`);
      safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}current_user`, JSON.stringify(target));
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

  // Scoped Pipeline & Business Records (Evaluates dynamic visibility capabilities against hierarchy)
  const scopedLeads = useMemo(() => {
    return getScopedLeads(leads, currentUser, currentRolePerms, hierarchyScope);
  }, [leads, currentUser, currentRolePerms, hierarchyScope]);

  const scopedFollowUps = useMemo(() => {
    return getScopedFollowUps(followUps, currentUser, currentRolePerms, hierarchyScope);
  }, [followUps, currentUser, currentRolePerms, hierarchyScope]);

  const scopedClients = useMemo(() => {
    return getScopedClients(clients, currentUser, currentRolePerms, hierarchyScope);
  }, [clients, currentUser, currentRolePerms, hierarchyScope]);

  // Dynamic RBAC Permission Checks (Evaluating Capability)
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

  // Phase F1.3 Canonical Capabilities
  const canViewIncomingLeads = useMemo(() => {
    if (!currentUser) return false;
    // Hard structural eligibility + dynamic capability
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

  // Centralized Action-Level Authorization Guards (Capability + Scope + Target + Safeguards)
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
      // Search
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

      // Status
      if (filterState.status !== 'All' && lead.status !== filterState.status) {
        return false;
      }

      // Assigned Agent
      if (filterState.assignedToId !== 'All' && lead.assignedToId !== filterState.assignedToId) {
        return false;
      }

      // Team
      if (filterState.teamId !== 'All' && lead.teamId !== filterState.teamId) {
        return false;
      }

      // Service
      if (filterState.service !== 'All') {
        if (!lead.services.includes(filterState.service)) {
          return false;
        }
      }

      // Source
      if (filterState.source !== 'All' && lead.source !== filterState.source) {
        return false;
      }

      // Quality
      if (filterState.quality !== 'All' && lead.quality !== filterState.quality) {
        return false;
      }

      // Priority
      if (filterState.priority !== 'All' && lead.priority !== filterState.priority) {
        return false;
      }

      // Date Range
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
    const hotLeads = scopedLeads.filter(l => l.priority === 'Urgent' && l.status !== 'Converted' && l.status !== 'Lost').length;
    const convertedLeads = scopedLeads.filter(l => l.status === 'Converted').length;
    const lostLeads = scopedLeads.filter(l => l.status === 'Lost').length;
    const newLeads = scopedLeads.filter(l => l.status === 'New').length;

    // Follow-ups breakdown
    const todayStr = getLocalDateString();
    const todayFollowUps = scopedFollowUps.filter(f => classifyFollowUp(f, todayStr) === 'today').length;
    const missedFollowUps = scopedFollowUps.filter(f => classifyFollowUp(f, todayStr) === 'missed').length;
    const pendingFollowUps = scopedFollowUps.filter(f => f.status === 'Pending').length;

    // Stale leads: leads created or contacted > settings.staleLeadDays ago without resolution
    const staleThreshold = new Date();
    staleThreshold.setDate(staleThreshold.getDate() - (settings.staleLeadDays || 7));
    const staleThresholdStr = staleThreshold.toISOString().split('T')[0];
    const staleLeads = scopedLeads.filter(l => 
      l.status !== 'Converted' && 
      l.status !== 'Lost' && 
      (l.lastContactDate <= staleThresholdStr || l.createdAt.split('T')[0] <= staleThresholdStr)
    ).length;

    // Status breakdown
    const statusBreakdown: Record<LeadStatus, number> = {
      'New': 0,
      'Contacted': 0,
      'Follow-Up Required': 0,
      'Qualified': 0,
      'Won': 0,
      'Hold': 0,
      'Cold': 0,
      'Returned': 0,
      'Converted': 0,
      'Lost': 0
    };
    scopedLeads.forEach(l => {
      if (statusBreakdown[l.status] !== undefined) {
        statusBreakdown[l.status]++;
      }
    });

    // Quality breakdown
    const qualityBreakdown: Record<LeadQuality, number> = {
      'Good': 0,
      'Average': 0,
      'Poor': 0
    };
    scopedLeads.forEach(l => {
      if (qualityBreakdown[l.quality] !== undefined) {
        qualityBreakdown[l.quality]++;
      }
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

  // Lead CRUD Operations
  const addLead = (newLeadData: Omit<Lead, 'id' | 'createdAt' | 'lastContactDate' | 'activities'>) => {
    const newId = `lead-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    const newLead: Lead = {
      ...newLeadData,
      id: newId,
      createdAt: nowIso,
      lastContactDate: todayStr,
      activities: [
        {
          id: `act-${Date.now()}`,
          type: 'note',
          title: 'Lead Created',
          notes: `Added to CRM pipeline by ${currentUser?.name || 'User'}.`,
          timestamp: nowIso,
          author: currentUser?.name || 'System'
        }
      ]
    };

    setLeads(prev => {
      const updated = [newLead, ...prev];
      safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}leads`, JSON.stringify(updated));
      return updated;
    });
    logAction('Lead Created', 'Lead', newLead.businessName || newLead.name, `New lead added with value Rs. ${(newLead.valuePKR || 0).toLocaleString()}`, newId);

    // If follow-up date specified, automatically create a follow-up record
    if (newLead.nextFollowUpDate) {
      const newFollowUp: FollowUp = {
        id: `fu-${Date.now()}`,
        leadId: newId,
        clientName: newLead.name,
        clientBusiness: newLead.businessName || newLead.name,
        phone: newLead.phone,
        scheduledDate: newLead.nextFollowUpDate,
        scheduledTime: newLead.nextFollowUpTime || '14:00',
        type: newLead.nextFollowUpType || 'Call',
        source: newLead.source,
        status: 'Pending',
        notes: newLead.notes ? `Initial Note: ${newLead.notes}` : `Initial follow-up for ${newLead.businessName || newLead.name}`,
        assignedToId: newLead.assignedToId,
        assignedToName: newLead.assignedToName,
        createdAt: nowIso
      };
      setFollowUps(prev => {
        const updatedFu = [newFollowUp, ...prev];
        safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}follow_ups`, JSON.stringify(updatedFu));
        return updatedFu;
      });
    }
  };

  const updateLead = (updatedLead: Lead) => {
    setLeads(prev => {
      const updated = prev.map(l => l.id === updatedLead.id ? updatedLead : l);
      safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}leads`, JSON.stringify(updated));
      return updated;
    });
    logAction('Lead Updated', 'Lead', updatedLead.businessName || updatedLead.name, `Details updated by ${currentUser?.name}`, updatedLead.id);
  };

  const deleteLead = (leadId: string): boolean => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return false;
    if (!canDeleteLeadItem(lead)) return false;

    setLeads(prev => {
      const updated = prev.filter(l => l.id !== leadId);
      safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}leads`, JSON.stringify(updated));
      return updated;
    });
    setFollowUps(prev => {
      const updatedFu = prev.filter(f => f.leadId !== leadId);
      safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}follow_ups`, JSON.stringify(updatedFu));
      return updatedFu;
    });
    logAction('Lead Deleted', 'Lead', lead.businessName || lead.name, `Removed from pipeline`, leadId);
    return true;
  };

  const reassignLead = (leadId: string, newUserId: string) => {
    const targetUser = users.find(u => u.id === newUserId);
    if (!targetUser) return;

    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const updatedActivities: Activity[] = [
          ...l.activities,
          {
            id: `act-${Date.now()}`,
            type: 'reassign',
            title: `Reassigned to ${targetUser.name}`,
            notes: `Transferred ownership from ${l.assignedToName} to ${targetUser.name}.`,
            timestamp: new Date().toISOString(),
            author: currentUser?.name || 'System'
          }
        ];
        return {
          ...l,
          assignedToId: targetUser.id,
          assignedToName: targetUser.name,
          teamId: targetUser.teamId || l.teamId,
          teamName: targetUser.teamName || l.teamName,
          activities: updatedActivities
        };
      }
      return l;
    }));

    // Update assigned follow-ups
    setFollowUps(prev => prev.map(f => {
      if (f.leadId === leadId && f.status === 'Pending') {
        return {
          ...f,
          assignedToId: targetUser.id,
          assignedToName: targetUser.name
        };
      }
      return f;
    }));

    logAction('Lead Reassigned', 'Lead', `Lead ID ${leadId}`, `Assigned to ${targetUser.name}`, leadId);
  };

  const changeLeadStatus = (leadId: string, newStatus: LeadStatus) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const oldStatus = l.status;
        const updatedActivities: Activity[] = [
          ...l.activities,
          {
            id: `act-${Date.now()}`,
            type: 'stage_change',
            title: `Status changed to ${newStatus}`,
            notes: `Pipeline status moved from "${oldStatus}" to "${newStatus}".`,
            timestamp: new Date().toISOString(),
            author: currentUser?.name || 'System'
          }
        ];

        // If converted, automatically offer/add to clients list if not present
        if (newStatus === 'Converted' && oldStatus !== 'Converted') {
          const clientExists = clients.some(c => c.leadId === leadId || c.businessName === l.businessName);
          if (!clientExists) {
            const todayStr = new Date().toISOString().split('T')[0];
            const newClient: Client = {
              id: `client-${Date.now()}`,
              leadId: l.id,
              businessName: l.businessName,
              clientName: l.name,
              phone: l.phone,
              email: l.email,
              city: l.city,
              services: l.services,
              source: l.source,
              pricingModel: l.pricingModel || 'Monthly Subscription Model',
              finalPrice: l.valuePKR || 85000,
              activeRevenuePKR: l.valuePKR || 85000,
              currency: 'PKR',
              assignedToName: l.assignedToName,
              assignedToId: l.assignedToId,
              generatedByName: l.assignedToName,
              closedByName: currentUser?.name || 'Super Admin',
              convertedDate: todayStr,
              startDate: todayStr,
              status: 'Active',
              notes: `Converted lead from ${l.source}.`
            };
            setClients(cPrev => [newClient, ...cPrev]);
          }
        }

        return {
          ...l,
          status: newStatus,
          lastContactDate: new Date().toISOString().split('T')[0],
          activities: updatedActivities
        };
      }
      return l;
    }));

    logAction('Lead Status Updated', 'Lead', `Status changed to ${newStatus}`, `Stage updated`, leadId);
  };

  const addLeadActivity = (leadId: string, activity: Omit<Activity, 'id' | 'timestamp' | 'author'>) => {
    const newAct: Activity = {
      ...activity,
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: currentUser?.name || 'Staff'
    };

    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          lastContactDate: new Date().toISOString().split('T')[0],
          activities: [newAct, ...l.activities]
        };
      }
      return l;
    }));

    logAction('Activity Logged', 'Lead', newAct.title, `${newAct.type.toUpperCase()}: ${newAct.notes}`, leadId);
  };

  const importLeads = (leadsToImport: Partial<Lead>[]): number => {
    // 8. Bulk import permission must fail closed
    if (!currentUser || !canBulkImportExport) {
      return 0;
    }

    const nowIso = new Date().toISOString();
    const formatted: Lead[] = [];

    for (let idx = 0; idx < leadsToImport.length; idx++) {
      const raw = leadsToImport[idx];
      const name = (raw.name || '').trim();
      const phone = (raw.phone || '').trim();

      // 3. A row without valid Name + Phone must be rejected
      if (!name || !phone) {
        continue;
      }

      // 7. Resolve ONE assignee only
      let resolvedAssignee: User | undefined;
      if (raw.assignedToId) {
        const candidate = users.find(u => u.id === raw.assignedToId && u.isActive);
        if (candidate) {
          resolvedAssignee = candidate;
        }
      }

      // Otherwise use currentUser if active
      if (!resolvedAssignee && currentUser && currentUser.isActive) {
        resolvedAssignee = currentUser;
      }

      // If currentUser is missing/inactive and no valid assignee exists: do not import row / fail safely
      if (!resolvedAssignee) {
        continue;
      }

      // Derive ALL of assignedToId, assignedToName, teamId, teamName from THAT SAME User object
      const assignedToId = resolvedAssignee.id;
      const assignedToName = resolvedAssignee.name;
      const teamId = resolvedAssignee.teamId || '';
      const teamName = resolvedAssignee.teamName || '';

      // 3. Do not invent optional customer data
      const businessName = (raw.businessName || '').trim() || name;
      const email = (raw.email || '').trim();
      const city = (raw.city || '').trim();
      const services = Array.isArray(raw.services)
        ? raw.services.map(s => String(s).trim()).filter(Boolean)
        : raw.services
        ? [String(raw.services).trim()].filter(Boolean)
        : [];
      const valuePKR = normalizeValuePKR(raw.valuePKR);

      // 9 & 10. Normalize enums safely
      const status = normalizeLeadStatus(raw.status);
      const priority = normalizePriority(raw.priority);
      const quality = normalizeLeadQuality(raw.quality);
      const source = normalizeLeadSource(raw.source);

      // 4. Do not invent follow-up data
      const nextFollowUpDate = raw.nextFollowUpDate || undefined;
      const nextFollowUpTime = raw.nextFollowUpTime || undefined;
      const nextFollowUpType = raw.nextFollowUpType || undefined;

      // 5. Do not invent pricing model (preserve only if genuinely supplied, otherwise undefined)
      const pricingModel = raw.pricingModel ? (raw.pricingModel as PricingModel) : undefined;

      formatted.push({
        id: `lead-import-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        name,
        businessName,
        phone,
        email,
        city,
        services,
        valuePKR,
        status,
        quality,
        priority,
        source,
        assignedToId,
        assignedToName,
        teamId,
        teamName,
        createdAt: nowIso,
        lastContactDate: nowIso.split('T')[0],
        nextFollowUpDate,
        nextFollowUpTime,
        nextFollowUpType,
        tags: Array.isArray(raw.tags) && raw.tags.length > 0 ? raw.tags : ['CSV Import'],
        notes: raw.notes || 'Imported via bulk CSV',
        pricingModel,
        activities: [
          {
            id: `act-imp-${Date.now()}-${idx}`,
            type: 'note',
            title: 'Lead Imported via CSV',
            notes: 'Bulk imported by ' + currentUser.name,
            timestamp: nowIso,
            author: currentUser.name
          }
        ]
      });
    }

    if (formatted.length === 0) {
      return 0;
    }

    setLeads(prev => [...formatted, ...prev]);
    logAction('Bulk Leads Imported', 'Lead', `${formatted.length} Leads`, `Successfully imported CSV batch`);
    return formatted.length;
  };

  const assignIncomingLead = (incomingId: string, assignedUserId: string): boolean => {
    // 1. Enforce dynamic capabilities independently: canViewIncomingLeads, canAssignIncomingLeads, canCreateLeads
    if (!canViewIncomingLeads || !canAssignIncomingLeads || !canCreateLeads) {
      return false;
    }

    const inc = incomingLeads.find(i => i.id === incomingId);
    if (!inc) return false;

    // 2. Reject if current incoming row is already assigned
    if (inc.status === 'assigned') {
      return false;
    }

    // 3. Reject if another assigned incoming record already has the same non-empty externalId (DO NOT use phone)
    if (inc.externalId && inc.externalId.trim()) {
      const isDuplicateExternalId = incomingLeads.some(
        other => other.id !== inc.id && other.status === 'assigned' && other.externalId && other.externalId.trim() === inc.externalId.trim()
      );
      if (isDuplicateExternalId) {
        return false;
      }
    }

    const targetUser = users.find(u => u.id === assignedUserId);
    if (!targetUser || !targetUser.isActive) return false;

    // Check scope assignment permission
    if (!isUserAssignable(targetUser)) {
      return false;
    }

    const leadSource: LeadSource = inc.source === 'meta_ads' ? 'Meta Ads' : 'WhatsApp';

    const newLeadData: Omit<Lead, 'id' | 'createdAt' | 'lastContactDate' | 'activities'> = {
      name: inc.name.trim(),
      businessName: inc.name.trim(),
      phone: inc.phone.trim(),
      email: '',
      city: '',
      services: [],
      valuePKR: 0,
      status: 'New',
      quality: 'Average',
      priority: 'Medium',
      source: leadSource,
      assignedToId: targetUser.id,
      assignedToName: targetUser.name,
      teamId: targetUser.teamId || '',
      teamName: targetUser.teamName || '',
      tags: ['Incoming', leadSource],
      notes: inc.campaignName
        ? `Incoming lead from ${leadSource} [Campaign: ${inc.campaignName}${inc.adName ? ` / Ad: ${inc.adName}` : ''}].${inc.message ? ` Message: ${inc.message}` : ''}`
        : `Incoming lead from ${leadSource}.${inc.message ? ` Message: ${inc.message}` : ''}`
    };

    addLead(newLeadData);

    const nowIso = new Date().toISOString();
    setIncomingLeads(prev => prev.map(item => {
      if (item.id === incomingId) {
        return {
          ...item,
          status: 'assigned',
          assignedToId: targetUser.id,
          assignedAt: nowIso
        };
      }
      return item;
    }));

    logAction('Incoming Lead Assigned', 'Lead', inc.name, `Assigned to ${targetUser.name} (${leadSource})`, inc.id);
    return true;
  };

  // Follow-up actions
  const addFollowUp = (followUpData: Omit<FollowUp, 'id' | 'createdAt'>) => {
    const newFu: FollowUp = {
      ...followUpData,
      id: `fu-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setFollowUps(prev => [newFu, ...prev]);
    logAction('Follow-Up Scheduled', 'FollowUp', newFu.clientBusiness || newFu.clientName, `Date: ${newFu.scheduledDate} ${newFu.scheduledTime}`, newFu.id);
  };

  const completeFollowUp = (id: string, resultNotes?: string) => {
    const fu = followUps.find(f => f.id === id);
    if (!fu) return;

    setFollowUps(prev => prev.map(f => {
      if (f.id === id) {
        return {
          ...f,
          status: 'Done',
          completedAt: new Date().toISOString(),
          resultNotes: resultNotes || 'Follow-up marked completed'
        };
      }
      return f;
    }));

    // Also add to lead's activities
    if (fu.leadId) {
      addLeadActivity(fu.leadId, {
        type: fu.type.toLowerCase() === 'call' ? 'call' : fu.type.toLowerCase() === 'whatsapp' ? 'whatsapp' : 'meeting',
        title: `Follow-Up Completed (${fu.type})`,
        notes: resultNotes || fu.notes,
        outcome: 'Completed'
      });
    }

    logAction('Follow-Up Completed', 'FollowUp', fu.clientBusiness || fu.clientName, resultNotes || 'Done', id);
  };

  const rescheduleFollowUp = (id: string, newDate: string, newTime: string, notes?: string) => {
    const fu = followUps.find(f => f.id === id);
    if (!fu) return;

    setFollowUps(prev => prev.map(f => {
      if (f.id === id) {
        return {
          ...f,
          scheduledDate: newDate,
          scheduledTime: newTime,
          status: 'Pending',
          notes: notes ? `${f.notes}\n[Rescheduled: ${notes}]` : f.notes
        };
      }
      return f;
    }));

    // Update lead's next follow up date as well
    if (fu.leadId) {
      setLeads(prev => prev.map(l => {
        if (l.id === fu.leadId) {
          return {
            ...l,
            nextFollowUpDate: newDate,
            nextFollowUpTime: newTime
          };
        }
        return l;
      }));
    }

    logAction('Follow-Up Rescheduled', 'FollowUp', fu.clientBusiness || fu.clientName, `Moved to ${newDate} at ${newTime}`, id);
  };

  const deleteFollowUp = (id: string) => {
    setFollowUps(prev => prev.filter(f => f.id !== id));
  };

  // Client actions
  const addClient = (clientData: Omit<Client, 'id'>) => {
    const newClient: Client = {
      ...clientData,
      id: `client-${Date.now()}`
    };
    setClients(prev => [newClient, ...prev]);
    logAction('Client Added', 'Client', newClient.businessName, `Active Revenue: Rs. ${(newClient.finalPrice || newClient.activeRevenuePKR || 0).toLocaleString()}`, newClient.id);
  };

  const updateClient = (client: Client) => {
    setClients(prev => prev.map(c => c.id === client.id ? client : c));
    logAction('Client Updated', 'Client', client.businessName, `Status: ${client.status}`, client.id);
  };

  const convertLeadToClient = (leadId: string, clientData: Partial<Client>): Client => {
    const lead = leads.find(l => l.id === leadId);
    const todayStr = getLocalDateString();
    const nowIso = new Date().toISOString();

    const newClient: Client = {
      id: `client-${Date.now()}`,
      leadId: leadId,
      businessName: clientData.businessName || lead?.businessName || 'Business Client',
      clientName: clientData.clientName || lead?.name || 'Contact Person',
      phone: clientData.phone || lead?.phone || '',
      email: clientData.email || lead?.email || '',
      city: clientData.city || lead?.city || 'Lahore',
      services: clientData.services || lead?.services || ['Salon Management System'],
      source: clientData.source || lead?.source || 'Call',
      pricingModel: clientData.pricingModel || lead?.pricingModel || 'One-Time Project Model',
      finalPrice: clientData.finalPrice !== undefined ? clientData.finalPrice : (lead?.valuePKR || 80000),
      activeRevenuePKR: clientData.finalPrice !== undefined ? clientData.finalPrice : (lead?.valuePKR || 80000),
      currency: clientData.currency || 'PKR',
      generatedById: clientData.generatedById || lead?.assignedToId,
      generatedByName: clientData.generatedByName || lead?.assignedToName || 'Super Admin',
      assignedToId: clientData.assignedToId || lead?.assignedToId,
      assignedToName: clientData.assignedToName || lead?.assignedToName || 'Abdur Rehman Arain',
      closedById: clientData.closedById || currentUser?.id,
      closedByName: clientData.closedByName || currentUser?.name || 'Super Admin',
      paymentTerms: clientData.paymentTerms,
      packageDetails: clientData.packageDetails,
      conversionNotes: clientData.conversionNotes,
      notes: clientData.notes || `Converted on ${todayStr}`,
      convertedDate: todayStr,
      startDate: todayStr,
      status: 'Active',
      pricingDetails: clientData.pricingDetails
    };

    // 1. Add to clients table (avoid duplicates)
    setClients(prev => {
      const filtered = prev.filter(c => c.leadId !== leadId);
      return [newClient, ...filtered];
    });

    // 2. Mark lead status as Converted / Won
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        const updatedActivities: Activity[] = [
          ...l.activities,
          {
            id: `act-${Date.now()}`,
            type: 'stage_change',
            title: `Lead Converted to Client`,
            notes: `Successfully closed deal for PKR ${(newClient.finalPrice || 0).toLocaleString()} (${newClient.pricingModel}). Closed by ${newClient.closedByName}.`,
            timestamp: nowIso,
            author: currentUser?.name || 'System'
          }
        ];
        return {
          ...l,
          status: 'Converted',
          valuePKR: newClient.finalPrice,
          pricingModel: newClient.pricingModel as any,
          lastContactDate: todayStr,
          activities: updatedActivities
        };
      }
      return l;
    }));

    // 3. Mark any pending follow-ups for this lead as Done
    setFollowUps(prev => prev.map(f => {
      if (f.leadId === leadId && f.status === 'Pending') {
        return {
          ...f,
          status: 'Done',
          completedAt: nowIso,
          resultNotes: 'Completed automatically upon lead conversion to client.'
        };
      }
      return f;
    }));

    logAction('Lead Converted to Client', 'Client', newClient.businessName, `Closed for PKR ${(newClient.finalPrice || 0).toLocaleString()} by ${newClient.closedByName}`, newClient.id);

    return newClient;
  };

  const returnClientToLead = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    // 1. Remove from clients table
    setClients(prev => prev.filter(c => c.id !== clientId));

    // 2. If lead exists, revert status back to Follow-Up Required or Contacted
    if (client.leadId) {
      setLeads(prev => prev.map(l => {
        if (l.id === client.leadId) {
          const updatedActivities: Activity[] = [
            ...l.activities,
            {
              id: `act-${Date.now()}`,
              type: 'stage_change',
              title: `Returned from Client to Active Lead`,
              notes: `Conversion reversed by ${currentUser?.name || 'Admin'}. Moved back to Follow-Up Required.`,
              timestamp: new Date().toISOString(),
              author: currentUser?.name || 'System'
            }
          ];
          return {
            ...l,
            status: 'Follow-Up Required',
            activities: updatedActivities
          };
        }
        return l;
      }));
    }

    logAction('Client Returned to Lead', 'Client', client.businessName, `Reversed conversion back to active lead status`, clientId);
  };

  // Proposals CRUD
  const addProposal = (propData: Omit<Proposal, 'id' | 'createdAt'>): Proposal => {
    const newProposal: Proposal = {
      ...propData,
      id: `prop-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    setProposals(prev => [newProposal, ...prev]);

    // Automatically log into lead's activity history
    const propTotal = newProposal.grandTotal ?? newProposal.grandTotalPKR ?? 0;
    if (newProposal.leadId) {
      addLeadActivity(newProposal.leadId, {
        type: 'meeting',
        title: `Proposal Generated: ${newProposal.refNumber}`,
        notes: `Proposal generated for ${newProposal.businessName || newProposal.clientName}. Total: PKR ${propTotal.toLocaleString()} (${newProposal.items?.length || 0} items). Validity: ${newProposal.validityDays || 14} days.`,
        outcome: 'Proposal Sent',
        duration: `${newProposal.validityDays || 14} Days Validity`
      });
    }

    logAction(
      'Generated Proposal',
      'Lead',
      newProposal.businessName || newProposal.clientName,
      `Generated proposal ${newProposal.refNumber} for PKR ${propTotal.toLocaleString()}`,
      newProposal.id
    );

    return newProposal;
  };

  const updateProposal = (updated: Proposal) => {
    setProposals(prev => prev.map(p => p.id === updated.id ? updated : p));
    const propTotal = updated.grandTotal ?? updated.grandTotalPKR ?? 0;
    logAction(
      'Updated Proposal',
      'Lead',
      updated.businessName || updated.clientName,
      `Updated proposal ${updated.refNumber} (PKR ${propTotal.toLocaleString()})`,
      updated.id
    );
  };

  const deleteProposal = (id: string) => {
    setProposals(prev => prev.filter(p => p.id !== id));
  };

  // Administration CRUD (Users, Teams, Services, Sources, Settings)
  const addUser = (userData: Omit<User, 'id' | 'createdAt'>): { success: boolean; error?: string; user?: User } => {
    if (!currentUser || !currentRolePerms?.canManageUsers) {
      return { success: false, error: 'Unauthorized: You do not have permissions to manage or create users.' };
    }

    if (!canCreateUserWithRoleAuth(userData.role, currentUser, currentRolePerms)) {
      return {
        success: false,
        error: `Security Policy Violation: ${currentUser.role} accounts are not authorized to create ${userData.role} accounts.`
      };
    }

    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setUsers(prev => [...prev, newUser]);
    logAction('User Created', 'User', newUser.name, `Role: ${newUser.role}, Email: ${newUser.email}`, newUser.id);
    return { success: true, user: newUser };
  };

  const updateUser = (user: User): { success: boolean; error?: string } => {
    const existing = users.find(u => u.id === user.id);
    if (!existing) {
      return { success: false, error: 'User not found.' };
    }

    // Must have authority to manage the target user
    if (!canManageUserAuth(existing, currentUser, currentRolePerms, hierarchyScope)) {
      return {
        success: false,
        error: `Security Policy: You are not authorized to modify this protected ${existing.role} account.`
      };
    }

    // Explicit Guard: Prevent self-role modification / promotion
    if (currentUser?.id === user.id && existing.role !== user.role && currentUser.role !== 'Super Admin') {
      return { success: false, error: 'Security Policy: Self-role escalation and role change are strictly prohibited.' };
    }

    // If role is changing, check role transition authority
    if (existing.role !== user.role) {
      if (!canTransitionUserRoleAuth(existing, user.role, currentUser, currentRolePerms, hierarchyScope)) {
        return {
          success: false,
          error: `Security Policy: You are not authorized to change role from ${existing.role} to ${user.role}.`
        };
      }
    }

    setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    if (currentUser?.id === user.id) {
      setCurrentUser(user);
    }
    logAction('User Updated', 'User', user.name, `Role: ${user.role}`, user.id);
    return { success: true };
  };

  const toggleUserStatus = (userId: string): { success: boolean; error?: string } => {
    const existing = users.find(u => u.id === userId);
    if (!existing) return { success: false, error: 'User not found.' };

    if (!canManageUserAuth(existing, currentUser, currentRolePerms, hierarchyScope)) {
      return {
        success: false,
        error: `Security Policy: You are not authorized to modify this protected ${existing.role} status.`
      };
    }

    const updatedUser = { ...existing, isActive: !existing.isActive };
    setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
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
  };

  const deleteUser = (userId: string): { success: boolean; error?: string } => {
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

    setUsers(prev => prev.filter(u => u.id !== userId));
    logAction('User Deleted', 'User', existing.name, `Account deleted by ${currentUser?.name}`, userId);
    return { success: true };
  };

  const addTeam = (teamData: Omit<Team, 'id' | 'createdAt'>) => {
    const newTeam: Team = {
      ...teamData,
      id: `team-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setTeams(prev => [...prev, newTeam]);
    
    // Sync assigned members' teamId, teamName, managerName, teamLeadName
    if (newTeam.memberIds && newTeam.memberIds.length > 0) {
      setUsers(prevUsers => prevUsers.map(u => {
        if (newTeam.memberIds.includes(u.id)) {
          return {
            ...u,
            teamId: newTeam.id,
            teamName: newTeam.name,
            managerName: newTeam.managerName || u.managerName,
            teamLeadName: newTeam.leaderName || u.teamLeadName
          };
        }
        return u;
      }));
    }
    logAction('Team Created', 'Team', newTeam.name, `Manager: ${newTeam.managerName || '-'}, Lead: ${newTeam.leaderName || '-'}, Members: ${newTeam.memberIds.length}`, newTeam.id);
    return newTeam;
  };

  const updateTeam = (team: Team) => {
    setTeams(prev => prev.map(t => t.id === team.id ? team : t));
    
    // Sync users
    setUsers(prevUsers => prevUsers.map(u => {
      if (team.memberIds.includes(u.id)) {
        return {
          ...u,
          teamId: team.id,
          teamName: team.name,
          managerName: team.managerName || u.managerName,
          teamLeadName: team.leaderName || u.teamLeadName
        };
      }
      if (u.teamId === team.id && !team.memberIds.includes(u.id)) {
        return {
          ...u,
          teamId: undefined,
          teamName: undefined
        };
      }
      return u;
    }));
    logAction('Team Updated', 'Team', team.name, `Details and members updated`, team.id);
  };

  const deleteTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    setTeams(prev => prev.filter(t => t.id !== teamId));
    setUsers(prevUsers => prevUsers.map(u => {
      if (u.teamId === teamId) {
        return {
          ...u,
          teamId: undefined,
          teamName: undefined
        };
      }
      return u;
    }));
    if (team) {
      logAction('Team Deleted', 'Team', team.name, `Team removed`, teamId);
    }
  };

  const addService = (serviceData: Omit<ServiceItem, 'id'>) => {
    const newSrv: ServiceItem = {
      ...serviceData,
      id: `srv-${Date.now()}`
    };
    setServices(prev => [...prev, newSrv]);
    const price = newSrv.defaultPricePKR ?? newSrv.basePricePKR ?? 0;
    logAction('Service Added', 'Service', newSrv.name, `Price: Rs. ${price.toLocaleString()}`, newSrv.id);
  };

  const updateService = (service: ServiceItem) => {
    setServices(prev => prev.map(s => s.id === service.id ? service : s));
    const price = service.defaultPricePKR ?? service.basePricePKR ?? 0;
    logAction('Service Updated', 'Service', service.name, `Price: Rs. ${price.toLocaleString()}`, service.id);
  };

  const deleteService = (serviceId: string) => {
    setServices(prev => prev.filter(s => s.id !== serviceId));
  };

  const addSource = (source: string) => {
    if (!sources.includes(source)) {
      setSources(prev => [...prev, source]);
      logAction('Lead Source Added', 'Source', source, `New lead source added`);
    }
  };

  const updateSource = (oldSource: string, newSource: string) => {
    setSources(prev => prev.map(s => s === oldSource ? newSource : s));
    // Also update any leads with old source
    setLeads(prev => prev.map(l => l.source === oldSource ? { ...l, source: newSource as any } : l));
    logAction('Lead Source Updated', 'Source', newSource, `Renamed from ${oldSource}`);
  };

  const deleteSource = (source: string) => {
    setSources(prev => prev.filter(s => s !== source));
  };

  const updateRolePermission = (perm: RolePermission) => {
    // Only Super Admin may update role permissions matrix
    if (!currentUser || currentUser.role !== 'Super Admin' || !canManageRoles) return;
    saveAllRolePermissions(rolePermissions.map(r => r.role === perm.role ? perm : r));
  };

  const saveAllRolePermissions = (newPermissions: RolePermission[]) => {
    // Context-level Actor Safeguards: Strictly Super Admin Only (Phase RBAC-FINAL-1A)
    if (!currentUser || currentUser.role !== 'Super Admin' || !canManageRoles) return;

    setRolePermissions(prev => {
      const sanitized: RolePermission[] = newPermissions.map(item => {
        const copy = { ...item };

        // SUPER ADMIN save: may update all roles but must force critical master controls
        if (copy.role === 'Super Admin') {
          copy.canManageSuperAdmin = true;
          copy.canManageRoles = true;
        }

        // Non-Super Admin: permanently enforce lock-off
        if (copy.role !== 'Super Admin') {
          copy.canManageSuperAdmin = false;
          copy.canManageRoles = false;
        }

        // Employee is structurally excluded from Incoming Leads integrations
        if (copy.role === 'Employee') {
          copy.canViewIncomingLeads = false;
          copy.canAssignIncomingLeads = false;
          copy.canManageIntegrations = false;
        }

        return copy;
      });

      safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}roles`, JSON.stringify(sanitized));
      return sanitized;
    });

    logAction('Role Permissions Matrix Saved', 'Setting', 'Role Capabilities', 'Updated capability matrix across all system roles');
  };

  const resetRolePermissionsToDefault = () => {
    // Context-level Reset Safeguards: Strictly Super Admin Only (Phase RBAC-FINAL-1A)
    if (!currentUser || currentUser.role !== 'Super Admin' || !canManageRoles) return;

    setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
    safeLocalStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}roles`);
    logAction('Role Permissions Reset', 'Setting', 'Default Matrix', 'Restored default capability matrix for roles');
  };

  const updateSettings = (
    newSettings: Partial<SystemSettings>,
    moduleKey?: string,
    moduleTitle?: string
  ) => {
    setSettings(prev => {
      const merged = { ...prev, ...newSettings };
      safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}settings`, JSON.stringify(merged));
      if (moduleKey) {
        safeLocalStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}settings_${moduleKey}`, JSON.stringify(newSettings));
      }
      return merged;
    });
    logAction(
      moduleTitle ? `${moduleTitle} Saved` : 'System Settings Saved',
      'Setting',
      moduleTitle || 'Company Config',
      `Updated settings configuration`
    );
  };

  const addPricingModel = (modelData: Omit<PricingModelItem, 'id'>) => {
    const newModel: PricingModelItem = {
      ...modelData,
      id: `pm-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setPricingModels(prev => [...prev, newModel]);
    logAction('Pricing Model Added', 'Setting', newModel.name, `Billing: ${newModel.billingType}`, newModel.id);
  };

  const updatePricingModel = (model: PricingModelItem) => {
    setPricingModels(prev => prev.map(m => m.id === model.id ? model : m));
    logAction('Pricing Model Updated', 'Setting', model.name, `Billing: ${model.billingType}`, model.id);
  };

  const deletePricingModel = (id: string) => {
    const target = pricingModels.find(m => m.id === id);
    if (!target) return { success: false, error: 'Pricing model not found' };

    setPricingModels(prev => prev.filter(m => m.id !== id));
    logAction('Pricing Model Deleted', 'Setting', target.name, `Pricing model removed`, id);
    return { success: true };
  };

  const resetToFactoryDefaults = () => {
    safeLocalStorage.clear();
    setUsers(DEFAULT_USERS);
    setCurrentUser(DEFAULT_USERS[0]);
    setTeams(DEFAULT_TEAMS);
    setServices(DEFAULT_SERVICES);
    setSources(DEFAULT_SOURCES);
    setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
    setPricingModels(DEFAULT_PRICING_MODELS);
    setSettings(DEFAULT_SETTINGS);
    setLeads(INITIAL_LEADS);
    setFollowUps(INITIAL_FOLLOW_UPS);
    setClients(INITIAL_CLIENTS);
    setActivityLogs(INITIAL_ACTIVITY_LOGS);
    setIncomingLeads(INITIAL_INCOMING_LEADS);
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
  };

  return (
    <CRMContext.Provider
      value={{
        currentUser,
        users,
        scopedUsers,
        assignableUsers,
        login,
        logout,
        switchUser,
        addUser,
        updateUser,
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
        canGenerateProposals,
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
        canViewAllLeads: canAccessAdmin,
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
