import { Router } from 'express';
import { ReturnRefundController } from '../controllers/return-refund.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';
import { validateReturnRefund, validateObjectId } from '../utils/validators';

const router = Router();

router.use(authenticate);

router.get('/my-returns', ReturnRefundController.getMyReturns);
router.post('/', validateReturnRefund, ReturnRefundController.create);
router.get('/:id', validateObjectId, ReturnRefundController.getById);

router.get(
  '/',
  requirePermission('orders.manage'),
  ReturnRefundController.getAll
);

router.put(
  '/:id/status',
  requirePermission('orders.manage'),
  validateObjectId,
  ReturnRefundController.updateStatus
);

router.patch(
  '/:id',
  requirePermission('orders.manage'),
  validateObjectId,
  ReturnRefundController.updateStatus
);

export default router;
