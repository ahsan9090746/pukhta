import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateObjectId } from '../utils/validators';

const router = Router();

router.use(authenticate);

router.get('/', NotificationController.getAll);
router.get('/unread-count', NotificationController.getUnreadCount);
router.put('/:id/read', validateObjectId, NotificationController.markAsRead);
router.put('/read-all', NotificationController.markAllAsRead);
router.delete('/:id', validateObjectId, NotificationController.delete);

export default router;
