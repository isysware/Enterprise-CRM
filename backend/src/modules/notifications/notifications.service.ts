import { query } from '../../database/connection';
import { AuthUser } from '../../types';

export interface NotificationRow {
  id: string;
  userId: string;
  type: string;
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

export class NotificationsService {
  public static async getUserNotifications(
    user: AuthUser,
    options: { unreadOnly?: boolean; limit?: number } = {}
  ): Promise<{ items: NotificationRow[]; unreadCount: number }> {
    const unreadOnly = Boolean(options.unreadOnly);
    const limit = options.limit || 30;

    let sql = `
      SELECT id, user_id as "userId", type, title, message, time_label as "timeLabel",
             priority, target_tab as "targetTab", target_id as "targetId",
             is_read as "isRead", read_at as "readAt", created_at as "createdAt", updated_at as "updatedAt"
      FROM notifications
      WHERE user_id = $1
    `;
    const params: (string | number | boolean)[] = [user.id];

    if (unreadOnly) {
      sql += ` AND is_read = false`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $2`;
    params.push(limit);

    const res = await query<NotificationRow>(sql, params);

    const countRes = await query<{ count: string }>(
      `SELECT count(*)::int as count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [user.id]
    );
    const unreadCount = parseInt(countRes.rows[0]?.count || '0', 10);

    return {
      items: res.rows,
      unreadCount,
    };
  }

  public static async markAsRead(user: AuthUser, notificationId: string): Promise<boolean> {
    const res = await query(
      `UPDATE notifications
       SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2`,
      [notificationId, user.id]
    );
    return (res.rowCount || 0) > 0;
  }

  public static async markAllAsRead(user: AuthUser): Promise<number> {
    const res = await query(
      `UPDATE notifications
       SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_read = false`,
      [user.id]
    );
    return res.rowCount || 0;
  }

  public static async deleteNotification(user: AuthUser, notificationId: string): Promise<boolean> {
    const res = await query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [notificationId, user.id]
    );
    return (res.rowCount || 0) > 0;
  }

  public static async createNotification(input: {
    userId: string;
    type: string;
    title: string;
    message: string;
    timeLabel?: string;
    priority?: 'high' | 'medium' | 'low';
    targetTab?: string;
    targetId?: string;
  }): Promise<NotificationRow> {
    const res = await query<NotificationRow>(
      `INSERT INTO notifications (user_id, type, title, message, time_label, priority, target_tab, target_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, user_id as "userId", type, title, message, time_label as "timeLabel",
                 priority, target_tab as "targetTab", target_id as "targetId",
                 is_read as "isRead", read_at as "readAt", created_at as "createdAt", updated_at as "updatedAt"`,
      [
        input.userId,
        input.type,
        input.title,
        input.message,
        input.timeLabel || null,
        input.priority || 'medium',
        input.targetTab || null,
        input.targetId || null,
      ]
    );
    return res.rows[0];
  }
}
