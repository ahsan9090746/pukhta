import { Router } from 'express';
import { AddressController } from '../controllers/address.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateAddress, validateObjectId } from '../utils/validators';

const router = Router();

router.use(authenticate);

router.get('/', AddressController.getAll);
router.post('/', validateAddress, AddressController.create);
router.get('/:id', validateObjectId, AddressController.getById);
router.put('/:id', validateObjectId, AddressController.update);
router.delete('/:id', validateObjectId, AddressController.delete);
router.put('/:id/default', validateObjectId, AddressController.setDefault);

export default router;
