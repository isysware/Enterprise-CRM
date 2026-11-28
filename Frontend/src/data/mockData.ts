import { 
  User, 
  Team, 
  ServiceItem, 
  Lead, 
  FollowUp, 
  Client, 
  ActivityLog, 
  SystemSettings, 
  RolePermission,
  PricingModelItem,
  IncomingLead
} from '../types';

/**
 * CANONICAL SYSTEM DEFAULTS & SCHEMAS
 * 
 * All operational CRM entities (Leads, Follow-ups, Clients, Proposals, Activity Logs, Incoming Leads, Users, Teams)
 * are populated dynamically and solely through the live PostgreSQL REST API under /api/v1.
 * 
 * Mock datasets and demo business records have been completely purged per production cutover requirements.
 */

// Canonical Roles & Capabilities Matrix Default Schema (21 capabilities)
export const DEFAULT_ROLE_PERMISSIONS: RolePermission[] = [
  {
    role: 'Super Admin',
    description: 'Full, unrestricted master access across all company leads, financial metrics, users, roles, and administrative configurations.',
    canViewAllLeads: true,
    canViewTeamLeads: true,
    canViewAssignedLeads: true,
    canEditAllLeads: true,
    canCreateLeads: true,
    canDeleteLeads: true,
    canReassignLeads: true,
    canManageUsers: true,
    canManageSuperAdmin: true,
    canManageRoles: true,
    canManageTeams: true,
    canManageServices: true,
    canViewReports: true,
    canViewClients: true,
    canViewAuditLogs: true,
    canAccessSettings: true,
    canBulkImportExport: true,
    canGenerateProposals: true,
    canViewIncomingLeads: true,
    canAssignIncomingLeads: true,
    canManageIntegrations: true
  },
  {
    role: 'Admin',
    description: 'System administrator with operational user, team, service, and lead management rights. Cannot manage Super Admin or Admin accounts, and cannot edit Roles & Permissions.',
    canViewAllLeads: true,
    canViewTeamLeads: true,
    canViewAssignedLeads: true,
    canEditAllLeads: true,
    canCreateLeads: true,
    canDeleteLeads: true,
    canReassignLeads: true,
    canManageUsers: true,
    canManageSuperAdmin: false,
    canManageRoles: false,
    canManageTeams: true,
    canManageServices: true,
    canViewReports: true,
    canViewClients: true,
    canViewAuditLogs: true,
    canAccessSettings: true,
    canBulkImportExport: true,
    canGenerateProposals: true,
    canViewIncomingLeads: true,
    canAssignIncomingLeads: true,
    canManageIntegrations: true
  },
  {
    role: 'Manager',
    description: 'Branch and team sales director. Manages department leads, reassignments, staff performance analytics, and follow-up quality.',
    canViewAllLeads: true,
    canViewTeamLeads: true,
    canViewAssignedLeads: true,
    canEditAllLeads: true,
    canCreateLeads: true,
    canDeleteLeads: false,
    canReassignLeads: true,
    canManageUsers: false,
    canManageSuperAdmin: false,
    canManageRoles: false,
    canManageTeams: false,
    canManageServices: false,
    canViewReports: true,
    canViewClients: true,
    canViewAuditLogs: false,
    canAccessSettings: false,
    canBulkImportExport: false,
    canGenerateProposals: true,
    canViewIncomingLeads: true,
    canAssignIncomingLeads: true,
    canManageIntegrations: true
  },
  {
    role: 'Team Lead',
    description: 'Team supervisor managing assigned group leads, coaching representatives, approving deals, and executing escalated follow-ups.',
    canViewAllLeads: false,
    canViewTeamLeads: true,
    canViewAssignedLeads: false,
    canEditAllLeads: true,
    canCreateLeads: true,
    canDeleteLeads: false,
    canReassignLeads: true,
    canManageUsers: false,
    canManageSuperAdmin: false,
    canManageRoles: false,
    canManageTeams: false,
    canManageServices: false,
    canViewReports: true,
    canViewClients: true,
    canViewAuditLogs: false,
    canAccessSettings: false,
    canBulkImportExport: false,
    canGenerateProposals: false,
    canViewIncomingLeads: true,
    canAssignIncomingLeads: true,
    canManageIntegrations: true
  },
  {
    role: 'Employee',
    description: 'Direct sales representative. Access is strictly scoped to assigned leads, pending follow-ups, and individual calendar appointments.',
    canViewAllLeads: false,
    canViewTeamLeads: false,
    canViewAssignedLeads: true,
    canEditAllLeads: false,
    canCreateLeads: true,
    canDeleteLeads: false,
    canReassignLeads: false,
    canManageUsers: false,
    canManageSuperAdmin: false,
    canManageRoles: false,
    canManageTeams: false,
    canManageServices: false,
    canViewReports: false,
    canViewClients: false,
    canViewAuditLogs: false,
    canAccessSettings: false,
    canBulkImportExport: false,
    canGenerateProposals: false,
    canViewIncomingLeads: false,
    canAssignIncomingLeads: false,
    canManageIntegrations: false
  }
];

// Canonical System Branding & Configuration Defaults
export const DEFAULT_SETTINGS: SystemSettings = {
  applicationName: 'CRM',
  companyName: '',
  companyLogo: '/isysware-logo.png',
  proposalLetterheadBg: '',
  companyAddress: 'Suite #402, Business Executive Center, Main Shahrah-e-Faisal, Karachi, Pakistan',
  companyTaxId: 'NTN: 8294719-4 | STRN: 3277876123456',
  companyPhone: '+92 300 1234567 / +92 21 34567890',
  companyEmail: 'proposals@isysware.com',
  companyWebsite: 'https://isysware.com',
  defaultProposalValidityDays: 14,
  defaultProposalTerms: '1. Validity: This commercial quotation is valid for 14 calendar days from the date of issuance.\n2. Payment Terms: 40% advance milestone on contract signing, 30% on beta milestone preview, and 30% upon final delivery & handover.\n3. Taxes: Quoted prices are in Pakistani Rupees (PKR) and exclusive of applicable provincial sales tax (GST/PST) unless explicitly itemized.\n4. Support & Warranty: 3 months of complimentary technical bug-fixing and cloud maintenance support is included post-launch.\n5. Intellectual Property: Complete source code ownership and database rights will be transferred upon settlement of final invoice.',
  authorizedSignatureName: 'Abdur Rehman Arain',
  authorizedSignatureTitle: 'Director of Enterprise Solutions',
  authorizedSignatureImg: '',
  currency: 'PKR',
  currencySymbol: 'Rs.',
  timezone: 'Asia/Karachi (UTC+5)',
  staleLeadDays: 7,
  followUpReminderMinutes: 30,
  enableWhatsAppDirect: true,
  enableNotifications: true,
  whatsappGreetingTemplate: 'Assalam-o-Alaikum {{clientName}}, this is {{repName}} from {{companyName}}. We are following up regarding your inquiry for {{serviceName}}. How can we assist you today?',
  defaultPricingModel: 'Monthly Subscription (SaaS)'
};

// All reference and operational business collections are empty arrays; data is sourced exclusively from PostgreSQL
export const DEFAULT_SERVICES: ServiceItem[] = [];
export const DEFAULT_SOURCES: string[] = [];
export const DEFAULT_PRICING_MODELS: PricingModelItem[] = [];

// All operational business collections are empty arrays; data is sourced exclusively from PostgreSQL
export const DEFAULT_USERS: User[] = [];
export const DEFAULT_TEAMS: Team[] = [];
export const INITIAL_LEADS: Lead[] = [];
export const INITIAL_FOLLOW_UPS: FollowUp[] = [];
export const INITIAL_CLIENTS: Client[] = [];
export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [];
export const INITIAL_INCOMING_LEADS: IncomingLead[] = [];
