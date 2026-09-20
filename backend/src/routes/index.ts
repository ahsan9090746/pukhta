import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import categoryRoutes from './category.routes';
import bannerRoutes from './banner.routes';
import cartRoutes from './cart.routes';
import wishlistRoutes from './wishlist.routes';
import reviewRoutes from './review.routes';
import couponRoutes from './coupon.routes';
import orderRoutes from './order.routes';
import addressRoutes from './address.routes';
import notificationRoutes from './notification.routes';
import userRoutes from './user.routes';
import adminRoutes from './admin.routes';
import dashboardRoutes from './dashboard.routes';
import staffRoutes from './staff.routes';
import returnRefundRoutes from './return-refund.routes';
import settingsRoutes from './settings.routes';
import inventoryRoutes from './inventory.routes';
import sizeRoutes from './size.routes';

const router = Router();

// Public routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/banners', bannerRoutes);

// Protected user routes
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/reviews', reviewRoutes);
router.use('/coupons', couponRoutes);
router.use('/orders', orderRoutes);
router.use('/addresses', addressRoutes);
router.use('/notifications', notificationRoutes);

// Admin routes
router.use('/admin', adminRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/staff', staffRoutes);
router.use('/returns', returnRefundRoutes);
router.use('/settings', settingsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/sizes', sizeRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
