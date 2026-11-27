export type UserRole = 'Super Admin' | 'Admin' | 'Manager' | 'Team Lead' | 'Employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // used for mock auth verification
  teamId?: string;
  teamName?: string;
  managerId?: string;
  managerName?: string;
  teamLeadId?: string;
  teamLeadName?: string;
  avatar: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface Team {
  id: string;
  name: string;
  code?: string;
  description: string;
  managerId?: string;
  managerName?: string;
  leaderId?: string;
  leaderName?: string;
  status?: 'active' | 'inactive' | 'archived';
  memberIds: string[];
  createdAt: string;
}

export type PricingModel = 'Monthly Subscription' | 'One-Time Project' | 'Ownership Model' | string;

export type FieldInputType = 'currency' | 'number' | 'text' | 'dropdown' | 'date';

export interface PricingModelField {
  id: string;
  label: string;
  key: string;
  type: FieldInputType;
  options?: string[]; // For dropdown options
  defaultValue?: string | number;
  placeholder?: string;
  isRequired?: boolean;
  includeInTotal?: boolean; // if true, added into total deal amount calculation
}

export interface PricingModelItem {
  id: string;
  name: string;
  billingType: 'Recurring' | 'Milestone' | 'Fixed' | 'Hybrid';
  defaultSetupFeePKR?: number;
  defaultBillingFrequency?: string; // e.g. "Monthly", "Quarterly", "Annual", "One-Time", "Lifetime License", "Milestone Based"
  description: string;
  isActive: boolean;
  isSystemDefault?: boolean;
  createdAt?: string;
  fields?: PricingModelField[];
}

export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  defaultPricePKR: number;
  basePricePKR?: number; // legacy alias
  pricingModel: PricingModel;
  description: string;
  isActive: boolean;
}

export interface SourceItem {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt?: string;
}

export type LeadStatus = 
  | 'New' 
  | 'Contacted' 
  | 'Follow-Up Required' 
  | 'Qualified'
  | 'Won'
  | 'Hold' 
  | 'Cold' 
  | 'Returned' 
  | 'Converted' 
  | 'Lost';

export type LeadQuality = 'Good' | 'Average' | 'Poor';

export type Priority = 'Urgent' | 'High' | 'Medium' | 'Low';

export type LeadSource = 
  | 'Meta Ads'
  | 'Google Ads'
  | 'WhatsApp'
  | 'Call'
  | 'Website'
  | 'Referral'
  | 'Existing Client'
  | 'Walk-in'
  | 'Other'
  | 'Social Ads' 
  | 'Inbound' 
  | 'Direct Walk-in' 
  | 'Event'
  | 'Follow-Up'
  | 'CSV Import';

export type ActivityType = 'call' | 'whatsapp' | 'email' | 'meeting' | 'note' | 'stage_change' | 'reassign' | 'demo';

export type BudgetType = 
  | 'No Budget Discussed'
  | 'Monthly Subscription Model'
  | 'Ownership Model'
  | 'One-Time Project Model'
  | string;

export interface BudgetDetails {
  budgetType: BudgetType;
  // Monthly Subscription Model
  monthlySubscriptionFee?: number;
  oneTimeSetupFee?: number;
  monthlySupportFee?: number;
  otherFeeAmount?: number;
  totalInitialPayment?: number;
  otherFeeDescription?: string;
  // Ownership Model
  ownershipPrice?: number;
  setupFee?: number;
  // One-Time Project Model
  totalProjectPrice?: number;
  advanceMilestoneAmount?: number;
  // Dynamic Custom Field Values dictionary: key -> value
  customFieldValues?: Record<string, any>;
  totalCalculatedValuePKR?: number;
  // Notes
  budgetNotes?: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  notes: string;
  timestamp: string;
  author: string;
  outcome?: string;
  duration?: string;
}

export type FollowUpType = 'Call' | 'Meeting' | 'WhatsApp' | 'Demo' | 'Visit' | 'Email';
export type FollowUpStatus = 'Pending' | 'Done' | 'Missed' | 'Cancelled';

export interface FollowUp {
  id: string;
  leadId: string;
  clientName: string;
  clientBusiness: string;
  phone: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm (e.g. 14:30)
  type: FollowUpType;
  source: LeadSource;
  status: FollowUpStatus;
  notes: string;
  assignedToId: string;
  assignedToName: string;
  completedAt?: string;
  resultNotes?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  leadId?: string;
  businessName: string;
  clientName: string;
  phone: string;
  email: string;
  city: string;
  services: string[];
  source: LeadSource;
  pricingModel: string;
  finalPrice: number;
  activeRevenuePKR?: number;
  currency: string;
  customFieldValues?: Record<string, any>;
  totalCalculatedValuePKR?: number;
  generatedById?: string;
  generatedByName?: string;
  assignedToId?: string;
  assignedToName?: string;
  closedById?: string;
  closedByName?: string;
  paymentTerms?: string;
  packageDetails?: string;
  conversionNotes?: string;
  notes?: string;
  convertedDate: string; // YYYY-MM-DD
  startDate?: string;
  createdAt?: string;
  status: 'Active' | 'Paused' | 'Cancelled';
  pricingDetails?: {
    oneTimeProjectPrice?: number;
    advancePayment?: number;
    remainingPayment?: number;
    supportFeeAfterDelivery?: number;
    otherFeeAmount?: number;
    otherFeeDescription?: string;
    pricingNotes?: string;
    monthlySubscriptionFee?: number;
    setupFee?: number;
    ownershipPrice?: number;
    customFieldValues?: Record<string, any>;
    totalCalculatedValuePKR?: number;
  };
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: 'Lead' | 'FollowUp' | 'User' | 'Team' | 'Service' | 'Setting' | 'Client' | 'Auth' | 'Source';
  entityId?: string;
  entityTitle: string;
  details: string;
}

export interface Lead {
  id: string;
  name: string;
  businessName: string;
  phone: string;
  email: string;
  city: string;
  services: string[];
  servicesOfInterest?: string[];
  valuePKR: number;
  value?: number;
  status: LeadStatus;
  quality: LeadQuality;
  priority: Priority;
  source: LeadSource;
  assignedToId: string;
  assignedToName: string;
  teamId: string;
  teamName: string;
  createdAt: string;
  updatedAt?: string;
  firstContactDate?: string;
  lastContactDate: string;
  nextFollowUpDate?: string; // YYYY-MM-DD
  nextFollowUpTime?: string; // HH:mm
  nextFollowUpType?: FollowUpType;
  tags: string[];
  notes: string;
  pricingModel?: PricingModel;
  budgetType?: BudgetType;
  budgetDetails?: BudgetDetails;
  activities: Activity[];
}

export interface LeadFilterState {
  search: string;
  status: LeadStatus | 'All';
  assignedToId: string | 'All';
  teamId: string | 'All';
  service: string | 'All';
  source: LeadSource | 'All';
  fromDate: string;
  toDate: string;
  quality: LeadQuality | 'All';
  priority: Priority | 'All';
}

export type SettingsSubTab = 'branding' | 'letterhead' | 'pricing' | 'communication';

export interface SystemSettings {
  applicationName: string;
  companyName: string;
  companyLogo?: string;
  proposalLetterheadBg?: string; // Base64 or image URL for full A4 background
  companyAddress?: string;
  companyTaxId?: string; // NTN / STRN details
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  defaultProposalValidityDays?: number; // e.g. 14 Days
  defaultProposalTerms?: string;
  authorizedSignatureName?: string;
  authorizedSignatureTitle?: string;
  authorizedSignatureImg?: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  staleLeadDays: number;
  followUpReminderMinutes: number;
  enableWhatsAppDirect: boolean;
  enableNotifications: boolean;
  whatsappGreetingTemplate?: string;
  defaultPricingModel: string;
}

/**
 * ============================================================================
 * BACKEND CONTRACT NOTE — ROLES & PERMISSIONS CANONICAL SPECIFICATION
 * ============================================================================
 * The Roles & Permissions Matrix is the UI control plane.
 * The future Node/MongoDB Atlas backend MUST persist and enforce the SAME canonical
 * permission model. There must NOT be a separate competing backend permission system.
 * Every sensitive API endpoint will check:
 *   1. Authentication
 *   2. Canonical Capability (e.g. canViewIncomingLeads, canManageIntegrations, etc.)
 *   3. Hard Data Scope (Hierarchical operational visibility)
 *   4. Protected Invariants (e.g. Super Admin master controls, Employee structural restrictions)
 * Frontend permissions are UX enforcement only, never the final security boundary.
 *
 * NOTE ON USER-SPECIFIC OVERRIDES:
 * If individual-user exceptions are later required, implement a generic per-user
 * permission override model in the Users module (e.g. UserPermissionOverride table).
 * Do NOT create integration-specific or WhatsApp-specific one-off user flags.
 * ============================================================================
 */

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
  // Phase F1.3 Canonical Capabilities
  canViewIncomingLeads: boolean;
  canAssignIncomingLeads: boolean;
  canManageIntegrations: boolean;
}

// Future WhatsApp Integration Server Status Types
export type WhatsAppConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'waiting_for_qr'
  | 'waiting_for_pairing'
  | 'connected'
  | 'error';

export interface WhatsAppSessionInfo {
  status: WhatsAppConnectionStatus;
  connectedNumber?: string;
  connectedAt?: string;
  sessionStatus?: string;
}

// Future Meta Lead Ads Integration Server Status Types
export interface MetaConnectionInfo {
  status: 'disconnected' | 'connected';
  pageName?: string;
  adAccountId?: string;
  formsStatus?: string;
  webhookStatus?: string;
  connectedAt?: string;
}

export interface ProposalItem {
  id: string;
  title: string;
  name?: string;
  description: string;
  quantity: number;
  qty?: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface PaymentMilestone {
  id: string;
  title: string;
  percentage: number;
  amount: number;
  dueDate?: string;
  dueDateDescription?: string;
}

export interface Proposal {
  id: string;
  leadId: string;
  refNumber: string; // e.g. PROP-2026-0042
  proposalNumber?: string;
  title?: string;
  issueDate: string; // YYYY-MM-DD
  validityDays: number; // e.g. 14
  expiryDate?: string; // YYYY-MM-DD
  validUntil?: string;
  clientName: string;
  businessName: string;
  clientPhone: string;
  clientEmail: string;
  clientCity?: string;
  clientAddress?: string;
  assignedRepName: string;
  assignedRepId?: string;
  
  scopeOfWork: string;
  deliverables?: string[];
  
  items: ProposalItem[];
  subtotal: number;
  taxRate?: number;
  taxRatePercent?: number; // e.g. 0, 5, 13, 16
  taxAmount: number;
  totalDiscount?: number;
  overallDiscountPKR?: number;
  grandTotal: number;
  grandTotalPKR?: number;
  currency?: string;
  currencySymbol?: string;
  
  milestones?: PaymentMilestone[];
  paymentMilestones?: PaymentMilestone[];
  termsAndConditions: string;
  notes?: string;
  
  letterheadBg?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyTaxNtn?: string;
  companyTaxId?: string;
  companyWebsite?: string;
  companyLogo?: string;
  companyLogoUrl?: string;
  authorizedSignatureName?: string;
  authorizedSignatureTitle?: string;
  authorizedSignatureImg?: string;

  status: 'Draft' | 'Sent' | 'Accepted' | 'Revised' | 'Declined';
  createdAt: string;
  createdById?: string;
  createdByName?: string;
}

export interface IncomingLead {
  id: string;
  externalId: string;
  receivedAt: string;
  name: string;
  phone: string;
  email?: string;
  campaignName?: string;
  adName?: string;
  adSetName?: string;
  customFields?: Record<string, any>;
  source: 'meta_ads' | 'whatsapp';
  message?: string;
  status: 'new' | 'assigned';
  assignedToId?: string;
  assignedToUserId?: string;
  assignedAt?: string;
}

