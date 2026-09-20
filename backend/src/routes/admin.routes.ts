import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

import productRoutes from './product.routes';
import categoryRoutes from './category.routes';
import bannerRoutes from './banner.routes';
import couponRoutes from './coupon.routes';
import orderRoutes from './order.routes';
import reviewRoutes from './review.routes';
import userRoutes from './user.routes';
import staffRoutes from './staff.routes';
import dashboardRoutes from './dashboard.routes';
import inventoryRoutes from './inventory.routes';
import returnRefundRoutes from './return-refund.routes';
import settingsRoutes from './settings.routes';
import { DashboardController } from '../controllers/dashboard.controller';
import { UserController } from '../controllers/user.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole('super-admin', 'admin', 'staff'));

// Dashboard aliases (frontend-friendly paths)
router.get('/stats', DashboardController.getStats);
router.get('/charts/revenue', DashboardController.getRevenueChart);
router.get('/charts/orders', DashboardController.getOrderStatusDistribution);
router.get('/top-products', DashboardController.getTopProducts);

// Customers alias
router.get('/customers', UserController.getAll);

router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/banners', bannerRoutes);
router.use('/coupons', couponRoutes);
router.use('/orders', orderRoutes);
router.use('/reviews', reviewRoutes);
router.use('/users', userRoutes);
router.use('/staff', staffRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/returns', returnRefundRoutes);
router.use('/settings', settingsRoutes);

export default router;
