import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';
import { validateProduct, validateObjectId } from '../utils/validators';
import { optionalAuth } from '../middleware/auth.middleware';
import { uploadMultipleImages } from '../utils/upload';

const router = Router();

router.get('/', optionalAuth, ProductController.getAll);
router.get('/featured', ProductController.getFeatured);
router.get('/new-arrivals', ProductController.getNewArrivals);
router.get('/best-sellers', ProductController.getBestSellers);
router.get('/compare', ProductController.getForCompare);
router.get('/:id', optionalAuth, ProductController.getById);
router.get('/slug/:slug', ProductController.getBySlug);

router.post(
  '/',
  authenticate,
  requirePermission('products.create'),
  uploadMultipleImages('images'),
  validateProduct,
  ProductController.create
);

router.put(
  '/:id',
  authenticate,
  requirePermission('products.edit'),
  uploadMultipleImages('images'),
  validateObjectId,
  ProductController.update
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('products.delete'),
  validateObjectId,
  ProductController.delete
);

export default router;
