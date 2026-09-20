import { Router } from 'express';
import { SizeController } from '../controllers/size.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';

const router = Router();

router.get('/', SizeController.getAll);

router.post(
  '/',
  authenticate,
  requirePermission('products.create'),
  SizeController.create
);

export default router;
