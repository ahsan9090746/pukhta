import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';
import { validateProduct, validateProductUpdate, validateObjectId } from '../utils/validators';
import { optionalAuth } from '../middleware/auth.middleware';
import { uploadProductImages } from '../utils/upload';

const router = Router();

router.get('/', optionalAuth, ProductController.getAll);
  router.get('/featured', ProductController.getFeatured);
  router.get('/new-arrivals', ProductController.getNewArrivals);
  router.get('/best-sellers', ProductController.getBestSellers);
  router.get('/compare', ProductController.getForCompare);
  router.get('/next-sku', optionalAuth, ProductController.getNextSku);

router.patch(
  '/new-arrivals',
  authenticate,
  requirePermission('products.edit'),
  ProductController.toggleNewArrivals
);
router.get('/:id', optionalAuth, ProductController.getById);
router.get('/slug/:slug', ProductController.getBySlug);

router.post(
  '/',
  authenticate,
  requirePermission('products.create'),
  uploadProductImages('images'),
  validateProduct,
  ProductController.create
);

router.put(
  '/:id',
  authenticate,
  requirePermission('products.edit'),
  uploadProductImages('images'),
  validateObjectId,
  validateProductUpdate,
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
