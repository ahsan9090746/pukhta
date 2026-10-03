import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', CartController.getCart);
router.post('/add', CartController.addItem);
router.post('/items', CartController.addItem);
router.put('/item/:itemId', CartController.updateItemQuantity);
router.patch('/items/:itemId', CartController.updateItemQuantity);
router.delete('/item/:itemId', CartController.removeItem);
router.delete('/items/:itemId', CartController.removeItem);
router.delete('/clear', CartController.clearCart);
router.post('/coupon/apply', CartController.applyCoupon);
router.post('/coupon', CartController.applyCoupon);
router.delete('/coupon/remove', CartController.removeCoupon);

export default router;
