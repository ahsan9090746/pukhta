import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';
import { validateOrder, validateObjectId, validateTrackOrder } from '../utils/validators';
import { orderLimiter, trackLimiter } from '../middleware/rate-limiter.middleware';
import { NotFoundError } from '../utils/AppError';

const router = Router();

// Guest checkout — no authentication required (must be before router.use(authenticate))
router.post('/guest', orderLimiter, validateOrder, OrderController.createGuest);
router.get('/guest/:orderNumber', OrderController.getGuestOrder);

// Public order tracking — no authentication required
router.post('/track', trackLimiter, validateTrackOrder, OrderController.track);

router.use(authenticate);

router.get('/my-orders', OrderController.getUserOrders);
router.post('/', orderLimiter, validateOrder, OrderController.create);
router.get('/:id', validateObjectId, OrderController.getById);
router.get('/number/:orderNumber', OrderController.getByOrderNumber);
router.put('/:id/cancel', validateObjectId, OrderController.cancel);

router.get(
  '/',
  requirePermission('orders.view'),
  OrderController.getAll
);

router.put(
  '/:id/status',
  requirePermission('orders.manage'),
  validateObjectId,
  OrderController.updateStatus
);

router.patch(
  '/:id/status',
  requirePermission('orders.manage'),
  validateObjectId,
  OrderController.updateStatus
);

router.patch(
  '/:id/payment-status',
  requirePermission('orders.manage'),
  validateObjectId,
  OrderController.updatePaymentStatus
);

router.patch(
  '/:id/cancel',
  validateObjectId,
  OrderController.cancel
);

export default router;
