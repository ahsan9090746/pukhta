import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';

const router = Router();

router.use(authenticate);
router.use(requirePermission('inventory.manage'));

router.get('/', InventoryController.getInventory);
router.post('/update-stock', InventoryController.updateStock);
router.post('/bulk-update', InventoryController.bulkUpdateStock);
router.get('/movements', InventoryController.getMovements);
router.get('/low-stock', InventoryController.getLowStockProducts);

export default router;
