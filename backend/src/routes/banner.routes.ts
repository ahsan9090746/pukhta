import { Router } from 'express';
import { BannerController } from '../controllers/banner.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';
import { validateBanner, validateObjectId } from '../utils/validators';
import { uploadSingleImage } from '../utils/upload';

const router = Router();

router.get('/', BannerController.getAll);
router.get('/active', BannerController.getActive);
router.get('/:id', validateObjectId, BannerController.getById);

router.post(
  '/',
  authenticate,
  requirePermission('banners.manage'),
  uploadSingleImage('image'),
  validateBanner,
  BannerController.create
);

router.put(
  '/:id',
  authenticate,
  requirePermission('banners.manage'),
  uploadSingleImage('image'),
  validateObjectId,
  BannerController.update
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('banners.manage'),
  validateObjectId,
  BannerController.delete
);

export default router;
