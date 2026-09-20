import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';

const router = Router();

// Public read access (storefront needs site settings)
router.get('/', SettingsController.getSettings);

// Admin-only updates
router.use(authenticate);
router.use(requirePermission('settings.manage'));
router.put('/', SettingsController.updateSettings);

export default router;
