import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';

const router = Router();

router.use(authenticate);
router.use(requirePermission('analytics.view'));

router.get('/stats', DashboardController.getStats);
router.get('/revenue-chart', DashboardController.getRevenueChart);
router.get('/top-products', DashboardController.getTopProducts);
router.get('/recent-orders', DashboardController.getRecentOrders);
router.get('/order-status', DashboardController.getOrderStatusDistribution);
router.get('/sales-by-category', DashboardController.getSalesByCategory);

export default router;
