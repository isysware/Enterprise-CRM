import { apiClient } from './client';

export interface ReportQueryDto {
  fromDate?: string;
  toDate?: string;
  teamId?: string;
  userId?: string;
  source?: string;
  status?: string;
}

export interface SalesPipelineReportDto {
  summary: {
    totalLeads: number;
    totalPipelineValuePKR: number;
    averageDealValuePKR: number;
    wonCount: number;
    lostCount: number;
    conversionRate: number;
  };
  stages: {
    status: string;
    count: number;
    totalValuePKR: number;
  }[];
  priorityBreakdown: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  qualityBreakdown: {
    high: number;
    normal: number;
    low: number;
  };
}

export interface TeamStaffReportDto {
  staff: {
    userId: string;
    userName: string;
    role: string;
    teamName: string;
    assignedLeads: number;
    wonLeads: number;
    conversionRate: number;
    totalPipelineValuePKR: number;
    wonValuePKR: number;
  }[];
}

export interface FollowUpsActivityReportDto {
  totalFollowUps: number;
  completedCount: number;
  missedCount: number;
  upcomingCount: number;
  completionRate: number;
  byType: {
    call: number;
    meeting: number;
    whatsapp: number;
    email: number;
    demo: number;
    visit: number;
  };
}

export interface ClientsConversionsReportDto {
  summary: {
    totalClients: number;
    activeClients: number;
    inactiveClients: number;
    pausedClients: number;
    cancelledClients: number;
    totalContractValuePKR: number;
    averageContractValuePKR: number;
  };
  clients: Record<string, unknown>[];
}

export interface SourceServiceReportDto {
  sources: {
    source: string;
    totalLeads: number;
    wonLeads: number;
    conversionRate: number;
    totalValuePKR: number;
    wonValuePKR: number;
  }[];
}

export interface CommercialRevenueReportDto {
  realizedRevenuePKR: number;
  activeClientsCount: number;
  pipelinePotentialPKR: number;
  openLeadsCount: number;
  byPricingModel: {
    pricingModelName: string;
    billingType: string;
    clientCount: number;
    totalRevenuePKR: number;
  }[];
}

export const reportsApi = {
  getSalesPipeline: (params?: ReportQueryDto) =>
    apiClient.get<SalesPipelineReportDto>('/reports/sales-pipeline', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    }),

  getTeamStaff: (params?: ReportQueryDto) =>
    apiClient.get<TeamStaffReportDto>('/reports/team-staff', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    }),

  getFollowUpsActivity: (params?: ReportQueryDto) =>
    apiClient.get<FollowUpsActivityReportDto>('/reports/follow-ups', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    }),

  getClientsConversions: (params?: ReportQueryDto) =>
    apiClient.get<ClientsConversionsReportDto>('/reports/clients-conversions', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    }),

  getSourceService: (params?: ReportQueryDto) =>
    apiClient.get<SourceServiceReportDto>('/reports/source-service', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    }),

  getCommercialRevenue: (params?: ReportQueryDto) =>
    apiClient.get<CommercialRevenueReportDto>('/reports/commercial-revenue', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    }),
};
