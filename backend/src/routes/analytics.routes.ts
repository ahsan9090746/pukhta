import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';

const router = Router();

// Public: storefront client-side event tracking (no auth required)
router.post('/track', optionalAuth, AnalyticsController.trackEvent);

// Protected admin analytics (same pattern as dashboard.routes)
router.use(authenticate);
router.use(requirePermission('analytics.view'));

router.get('/summary', AnalyticsController.getSummary);
router.get('/visitor-trends', AnalyticsController.getVisitorTrends);
router.get('/top-pages', AnalyticsController.getTopPages);
router.get('/top-products', AnalyticsController.getTopProducts);
router.get('/sales-by-category', AnalyticsController.getSalesByCategory);
router.get('/conversion-funnel', AnalyticsController.getConversionFunnel);

export default router;