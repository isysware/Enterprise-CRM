import { UserRole } from '../../types';

export type AIScopeType = 
  | 'Organization Scope'
  | 'Operational Scope'
  | 'Managed Hierarchy'
  | 'Led Team Scope'
  | 'Personal Scope';

export interface AISafeCurrentUser {
  id: string;
  displayName: string;
  role: UserRole;
  teamName?: string;
}

export interface AISafeAuthorizationContext {
  scopeType: AIScopeType;
  capabilities: {
    canViewAllLeads: boolean;
    canViewReports: boolean;
    canGenerateProposals: boolean;
    canManageFollowUps: boolean;
    canBulkImportExport: boolean;
    canViewIncomingLeads: boolean;
    canAccessAdmin: boolean;
  };
}

export interface SafeBusinessSummaryContext {
  totalScopedLeads: number;
  activeLeadsCount: number;
  urgentLeadsCount: number;
  totalPipelineValuePKR: number;
  overdueFollowUpsCount: number;
  todayFollowUpsCount: number;
  totalScopedClients: number;
  topServices?: string[];
  statusDistribution?: Record<string, number>;
}

export interface SafeLeadContext {
  id: string;
  businessName: string;
  contactName: string;
  status: string;
  priority: string;
  valuePKR: number;
  city?: string;
  services?: string[];
  assignedToName?: string;
}

export interface SafeClientContext {
  id: string;
  businessName: string;
  clientName: string;
  status: string;
  services: string[];
  finalPrice: number;
}

export interface SafeBusinessContext {
  summary: SafeBusinessSummaryContext;
  currentPage: string;
  pageDetails?: Record<string, any>;
  selectedEntity?: {
    entityType: 'lead' | 'client' | 'followup';
    entityId: string;
    safeSummary: Record<string, any>;
  };
}

export interface AIAssistantRequest {
  pageContext: string;
  currentUser: AISafeCurrentUser;
  authorizationContext: AISafeAuthorizationContext;
  safeBusinessContext: SafeBusinessContext;
  userMessage: string;
}

export type AIActionType = 
  | 'NAVIGATE'
  | 'OPEN_LEAD'
  | 'OPEN_FOLLOWUPS'
  | 'DRAFT_MESSAGE'
  | 'DRAFT_PROPOSAL';

export interface AISuggestedAction {
  id: string;
  type: AIActionType;
  label: string;
  description: string;
  payload?: Record<string, any>;
  requiresConfirmation: boolean;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isNotice?: boolean;
  suggestedActions?: AISuggestedAction[];
}

export interface AIAssistantResponse {
  success: boolean;
  message?: string;
  errorCode?: 'AI_BACKEND_NOT_CONNECTED' | 'UNAUTHORIZED' | 'INVALID_REQUEST';
  actions?: AISuggestedAction[];
}

export interface SuggestedPrompt {
  id: string;
  label: string;
  prompt: string;
  category: 'summary' | 'action' | 'draft' | 'analysis';
}
