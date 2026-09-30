import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';
import { validateReview, validateObjectId } from '../utils/validators';
import { reviewLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

router.get('/product/:productId', optionalAuth, ReviewController.getProductReviews);
router.get('/featured', optionalAuth, ReviewController.getFeatured);
router.get('/', authenticate, requirePermission('reviews.manage'), ReviewController.getAll);

router.post(
  '/',
  optionalAuth,
  reviewLimiter,
  validateReview,
  ReviewController.create
);

router.post(
  '/fake',
  authenticate,
  requirePermission('reviews.manage'),
  ReviewController.createFakeReview
);

router.put(
  '/:id/status',
  authenticate,
  requirePermission('reviews.manage'),
  validateObjectId,
  ReviewController.updateStatus
);

router.patch(
  '/:id',
  authenticate,
  requirePermission('reviews.manage'),
  validateObjectId,
  ReviewController.updateStatus
);

router.patch(
  '/:id/status',
  authenticate,
  requirePermission('reviews.manage'),
  validateObjectId,
  ReviewController.updateStatus
);

router.delete(
  '/:id',
  authenticate,
  validateObjectId,
  ReviewController.delete
);

router.post(
  '/:id/helpful',
  authenticate,
  validateObjectId,
  ReviewController.markHelpful
);

export default router;
