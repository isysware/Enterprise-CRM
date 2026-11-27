import { apiClient } from './client';
import { PaginatedResponse } from './types';

export interface ActivityLogDbDto {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_title: string;
  details: string | Record<string, unknown>;
  ip_address: string | null;
  timestamp: string;
  created_at: string;
}

export interface ListActivityLogsQuery {
  entityType?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const activityLogsApi = {
  listLogs: (params?: ListActivityLogsQuery) =>
    apiClient.get<PaginatedResponse<ActivityLogDbDto>>('/activity-logs', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    }),
};
