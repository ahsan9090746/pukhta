import { Router } from 'express';
import { CouponController } from '../controllers/coupon.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';
import { validateCoupon, validateObjectId } from '../utils/validators';

const router = Router();

router.post('/validate', authenticate, CouponController.validate);

router.get('/', authenticate, requirePermission('coupons.manage'), CouponController.getAll);
router.get('/:id', authenticate, requirePermission('coupons.manage'), validateObjectId, CouponController.getById);

router.post(
  '/',
  authenticate,
  requirePermission('coupons.manage'),
  validateCoupon,
  CouponController.create
);

router.put(
  '/:id',
  authenticate,
  requirePermission('coupons.manage'),
  validateObjectId,
  CouponController.update
);

router.patch(
  '/:id',
  authenticate,
  requirePermission('coupons.manage'),
  validateObjectId,
  CouponController.update
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('coupons.manage'),
  validateObjectId,
  CouponController.delete
);

export default router;
