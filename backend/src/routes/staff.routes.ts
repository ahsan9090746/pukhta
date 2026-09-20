import { Router } from 'express';
import { StaffController } from '../controllers/staff.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole, requirePermission } from '../middleware/role.middleware';
import { validateObjectId } from '../utils/validators';

const router = Router();

router.use(authenticate);
router.use(requireRole('super-admin', 'admin'));

router.get('/', requirePermission('staff.manage'), StaffController.getAll);
router.post('/', requirePermission('staff.manage'), StaffController.create);
router.get('/roles', StaffController.getRoles);
router.post('/roles', StaffController.createRole);
router.get('/:id', validateObjectId, StaffController.getById);
router.put('/:id', validateObjectId, StaffController.update);
router.delete('/:id', validateObjectId, StaffController.delete);
router.put('/:id/reset-password', validateObjectId, StaffController.resetPassword);

router.put('/roles/:id', validateObjectId, StaffController.updateRole);
router.delete('/roles/:id', validateObjectId, StaffController.deleteRole);

export default router;
