import { Router } from 'express';
import { authenticate, requireActiveAccount, asyncHandler, validate } from '../../middleware';
import { NotificationsController } from './notifications.controller';
import { listNotificationsQuerySchema } from './notifications.validator';

const router = Router();

router.use(authenticate, requireActiveAccount);

router.get('/', validate({ query: listNotificationsQuerySchema }), asyncHandler(NotificationsController.getNotifications));
router.patch('/read-all', asyncHandler(NotificationsController.markAllAsRead));
router.patch('/:id/read', asyncHandler(NotificationsController.markAsRead));
router.delete('/:id', asyncHandler(NotificationsController.deleteNotification));

export const notificationRoutes = router;
