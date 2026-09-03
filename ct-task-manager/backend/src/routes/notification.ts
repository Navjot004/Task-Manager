import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/notifications
router.get('/', getNotifications);

// GET /api/notifications/unread-count
router.get('/unread-count', getUnreadCount);

// PATCH /api/notifications/read-all  (must be before /:id/read to avoid conflict)
router.patch('/read-all', markAllNotificationsRead);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', markNotificationRead);

export default router;
