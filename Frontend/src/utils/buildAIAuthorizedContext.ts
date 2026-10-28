import { Lead, Client, FollowUp, User } from '../types';
import {
  AIScopeType,
  AISafeCurrentUser,
  AISafeAuthorizationContext,
  SafeBusinessSummaryContext,
  SafeBusinessContext,
  AIAssistantRequest
} from '../components/ai/types';

export interface BuildAIContextParams {
  currentUser: User;
  currentPage: string;
  scopedLeads: Lead[];
  scopedClients: Client[];
  scopedFollowUps: FollowUp[];
  capabilities: {
    canViewAllLeads: boolean;
    canViewReports: boolean;
    canGenerateProposals: boolean;
    canManageFollowUps: boolean;
    canBulkImportExport: boolean;
    canViewIncomingLeads: boolean;
    canAccessAdmin: boolean;
  };
  selectedLead?: Lead | null;
  selectedClient?: Client | null;
}

/**
 * Determines the human-readable authorized scope type based on role.
 */
export const getAIScopeType = (role: string): AIScopeType => {
  switch (role) {
    case 'Super Admin':
      return 'Organization Scope';
    case 'Admin':
      return 'Operational Scope';
    case 'Manager':
      return 'Managed Hierarchy';
    case 'Team Lead':
      return 'Led Team Scope';
    case 'Employee':
    default:
      return 'Personal Scope';
  }
};

/**
 * Builds safe, sanitized, role-scoped AI business context.
 * Strictly guarantees that passwords, secrets, tokens, and un-scoped raw records are NEVER included.
 */
export const buildAIAuthorizedContext = (
  params: BuildAIContextParams,
  userMessage: string
): AIAssistantRequest => {
  const {
    currentUser,
    currentPage,
    scopedLeads,
    scopedClients,
    scopedFollowUps,
    capabilities,
    selectedLead,
    selectedClient
  } = params;

  // 1. Sanitized Current User
  const safeCurrentUser: AISafeCurrentUser = {
    id: currentUser.id,
    displayName: currentUser.name,
    role: currentUser.role,
    teamName: currentUser.teamName
  };

  // 2. Safe Authorization Context
  const scopeType = getAIScopeType(currentUser.role);
  const safeAuthContext: AISafeAuthorizationContext = {
    scopeType,
    capabilities: {
      canViewAllLeads: !!capabilities.canViewAllLeads,
      canViewReports: !!capabilities.canViewReports,
      canGenerateProposals: !!capabilities.canGenerateProposals,
      canManageFollowUps: !!capabilities.canManageFollowUps,
      canBulkImportExport: !!capabilities.canBulkImportExport,
      canViewIncomingLeads: !!capabilities.canViewIncomingLeads,
      canAccessAdmin: !!capabilities.canAccessAdmin
    }
  };

  // 3. Compute High-Level Bounded Metrics from ALREADY SCOPED data
  const todayStr = new Date().toISOString().split('T')[0];

  const totalPipelineValuePKR = scopedLeads.reduce(
    (sum, l) => sum + (Number(l.valuePKR) || 0),
    0
  );

  const activeLeadsCount = scopedLeads.filter(
    l => !['Lost', 'Converted', 'Cold', 'Returned'].includes(l.status)
  ).length;

  const urgentLeadsCount = scopedLeads.filter(
    l => l.priority === 'Urgent' || l.priority === 'High'
  ).length;

  const overdueFollowUpsCount = scopedFollowUps.filter(
    fu => fu.status === 'Pending' && fu.scheduledDate < todayStr
  ).length;

  const todayFollowUpsCount = scopedFollowUps.filter(
    fu => fu.status === 'Pending' && fu.scheduledDate === todayStr
  ).length;

  // Status distribution
  const statusDistribution: Record<string, number> = {};
  scopedLeads.forEach(l => {
    statusDistribution[l.status] = (statusDistribution[l.status] || 0) + 1;
  });

  const summary: SafeBusinessSummaryContext = {
    totalScopedLeads: scopedLeads.length,
    activeLeadsCount,
    urgentLeadsCount,
    totalPipelineValuePKR,
    overdueFollowUpsCount,
    todayFollowUpsCount,
    totalScopedClients: scopedClients.length,
    statusDistribution
  };

  // 4. Page-Specific Safe Details (Bounded, no massive dumps)
  let pageDetails: Record<string, any> | undefined;

  switch (currentPage) {
    case 'dashboard':
      pageDetails = {
        activePipelineValuePKR: totalPipelineValuePKR,
        pendingFollowUpsToday: todayFollowUpsCount,
        overdueFollowUps: overdueFollowUpsCount
      };
      break;

    case 'leads':
      pageDetails = {
        visibleCount: scopedLeads.length,
        leadStatuses: Object.keys(statusDistribution)
      };
      break;

    case 'followups':
      pageDetails = {
        totalScheduled: scopedFollowUps.length,
        overdueCount: overdueFollowUpsCount,
        todayCount: todayFollowUpsCount
      };
      break;

    case 'clients':
      pageDetails = {
        totalActiveClients: scopedClients.filter(c => c.status === 'Active').length,
        totalConvertedClients: scopedClients.length
      };
      break;

    case 'reports':
    case 'reports-sales-pipeline':
    case 'reports-team-staff':
    case 'reports-followups-activity':
    case 'reports-clients-conversions':
    case 'reports-source-service':
    case 'reports-commercial-revenue':
      pageDetails = {
        activeReport: currentPage.startsWith('reports-') ? currentPage.replace('reports-', '') : 'sales-pipeline',
        canViewReports: capabilities.canViewReports,
        scope: scopeType
      };
      break;

    default:
      pageDetails = {
        view: currentPage
      };
  }

  // 5. Optional Selected Entity (Bounded Safe Summary)
  let selectedEntity: SafeBusinessContext['selectedEntity'] | undefined;

  if (selectedLead) {
    selectedEntity = {
      entityType: 'lead',
      entityId: selectedLead.id,
      safeSummary: {
        businessName: selectedLead.businessName,
        contactName: selectedLead.name,
        status: selectedLead.status,
        priority: selectedLead.priority,
        valuePKR: selectedLead.valuePKR,
        city: selectedLead.city,
        services: selectedLead.services,
        assignedToName: selectedLead.assignedToName
      }
    };
  } else if (selectedClient) {
    selectedEntity = {
      entityType: 'client',
      entityId: selectedClient.id,
      safeSummary: {
        businessName: selectedClient.businessName,
        clientName: selectedClient.clientName,
        status: selectedClient.status,
        services: selectedClient.services,
        finalPrice: selectedClient.finalPrice
      }
    };
  }

  const safeBusinessContext: SafeBusinessContext = {
    summary,
    currentPage,
    pageDetails,
    selectedEntity
  };

  return {
    pageContext: currentPage,
    currentUser: safeCurrentUser,
    authorizationContext: safeAuthContext,
    safeBusinessContext,
    userMessage
  };
};
