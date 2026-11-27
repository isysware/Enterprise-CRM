import { apiClient } from './client';

export interface NotificationDto {
  id: string;
  userId: string;
  type: 'missed_followup' | 'today_followup' | 'lead_assigned' | 'system' | 'urgent_lead';
  title: string;
  message: string;
  timeLabel: string | null;
  priority: 'high' | 'medium' | 'low';
  targetTab: string | null;
  targetId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListNotificationsResponse {
  items: NotificationDto[];
  unreadCount: number;
}

export const notificationsApi = {
  getNotifications: (params?: { unreadOnly?: boolean; limit?: number }) =>
    apiClient.get<ListNotificationsResponse>('/notifications', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    }),

  markAsRead: (id: string) =>
    apiClient.patch<{ success: boolean }>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    apiClient.patch<{ updatedCount: number }>('/notifications/read-all'),

  deleteNotification: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/notifications/${id}`),
};
