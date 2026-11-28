import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { sendSuccess } from '../../utils';
import { NotificationsService } from './notifications.service';

export class NotificationsController {
  public static async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 30;

    const result = await NotificationsService.getUserNotifications(req.user, { unreadOnly, limit });
    sendSuccess(res, result, 'Notifications retrieved successfully', 200);
  }

  public static async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const success = await NotificationsService.markAsRead(req.user, id);
    sendSuccess(res, { success }, 'Notification marked as read', 200);
  }

  public static async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const count = await NotificationsService.markAllAsRead(req.user);
    sendSuccess(res, { updatedCount: count }, 'All notifications marked as read', 200);
  }

  public static async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const success = await NotificationsService.deleteNotification(req.user, id);
    sendSuccess(res, { success }, 'Notification deleted successfully', 200);
  }
}
