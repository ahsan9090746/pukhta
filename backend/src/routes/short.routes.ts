import { Router } from 'express';
import { ShortController, MAX_SHORTS } from '../controllers/short.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';
import { validateObjectId } from '../utils/validators';
import { uploadSingleVideo } from '../utils/upload';

const router = Router();

// Public
router.get('/', optionalAuth, ShortController.getAll);

// Admin
router.post(
  '/',
  authenticate,
  requirePermission('banners.manage'),
  uploadSingleVideo('video'),
  ShortController.create
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('banners.manage'),
  validateObjectId,
  ShortController.delete
);

export { MAX_SHORTS };
export default router;