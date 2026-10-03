import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';
import { validateObjectId } from '../utils/validators';

const router = Router();

router.use(authenticate);
router.use(requirePermission('customers.view'));

router.get('/', UserController.getAll);
router.get('/stats', UserController.getStats);
router.get('/:id', validateObjectId, UserController.getById);

router.put(
  '/:id',
  requirePermission('customers.manage'),
  validateObjectId,
  UserController.update
);

router.delete(
  '/:id',
  requirePermission('customers.manage'),
  validateObjectId,
  UserController.delete
);

export default router;
