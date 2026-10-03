import { Router } from 'express';
import { WishlistController } from '../controllers/wishlist.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', WishlistController.getWishlist);
router.post('/add', WishlistController.addToWishlist);
router.post('/', WishlistController.addToWishlist);
router.delete('/remove/:productId', WishlistController.removeFromWishlist);
router.delete('/:productId', WishlistController.removeFromWishlist);
router.delete('/clear', WishlistController.clearWishlist);

export default router;
