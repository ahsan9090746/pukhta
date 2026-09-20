import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';
import { validateCategory, validateObjectId } from '../utils/validators';
import { uploadSingleImage } from '../utils/upload';

const router = Router();

router.get('/', CategoryController.getAll);
router.get('/tree', CategoryController.getTree);
router.get('/:id', CategoryController.getById);

router.post(
  '/',
  authenticate,
  requirePermission('categories.manage'),
  uploadSingleImage('image'),
  validateCategory,
  CategoryController.create
);

router.put(
  '/:id',
  authenticate,
  requirePermission('categories.manage'),
  uploadSingleImage('image'),
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
