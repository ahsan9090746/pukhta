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
router.get('/roles', requirePermission('staff.manage'), StaffController.getRoles);
router.post('/roles', requirePermission('staff.manage'), StaffController.createRole);
router.get('/:id', validateObjectId, requirePermission('staff.manage'), StaffController.getById);
router.put('/:id', validateObjectId, requirePermission('staff.manage'), StaffController.update);
router.delete('/:id', validateObjectId, requirePermission('staff.manage'), StaffController.delete);
router.put('/:id/reset-password', validateObjectId, requirePermission('staff.manage'), StaffController.resetPassword);

router.put('/roles/:id', validateObjectId, requirePermission('staff.manage'), StaffController.updateRole);
router.delete('/roles/:id', validateObjectId, requirePermission('staff.manage'), StaffController.deleteRole);

export default router;
