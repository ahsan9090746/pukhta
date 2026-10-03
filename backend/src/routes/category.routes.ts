import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';
import { validateCategory, validateObjectId } from '../utils/validators';
import { uploadCategoryImage } from '../utils/upload';

const router = Router();

router.get('/', CategoryController.getAll);
// "/home" and "/tree" must be declared BEFORE "/:id" (which would swallow them)
router.get('/home', CategoryController.getHomeCategories);
router.get('/tree', CategoryController.getTree);
router.patch(
  '/home-selection',
  authenticate,
  requirePermission('categories.manage'),
  CategoryController.updateHomeSelection
);
router.get('/:id', CategoryController.getById);

router.post(
  '/',
  authenticate,
  requirePermission('categories.manage'),
  uploadCategoryImage('image'),
  validateCategory,
  CategoryController.create
);

router.put(
  '/:id',
  authenticate,
  requirePermission('categories.manage'),
  uploadCategoryImage('image'),
  validateObjectId,
  CategoryController.update
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('categories.manage'),
  validateObjectId,
  CategoryController.delete
);

export default router;
