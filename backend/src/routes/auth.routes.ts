import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter, passwordResetLimiter } from '../middleware/rate-limiter.middleware';
import { validateRegister, validateLogin } from '../utils/validators';

const router = Router();

router.post('/register', authLimiter, validateRegister, AuthController.register);
router.post('/login', authLimiter, validateLogin, AuthController.login);
router.post('/admin-login', authLimiter, validateLogin, AuthController.adminLogin);
router.post('/logout', authenticate, AuthController.logout);
router.post('/forgot-password', passwordResetLimiter, AuthController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, AuthController.resetPassword);
router.post('/reset-password/:token', passwordResetLimiter, AuthController.resetPasswordParam);
router.get('/verify-email/:token', AuthController.verifyEmailParam);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/refresh', AuthController.refreshToken);

router.get('/me', authenticate, AuthController.getMe);
router.put('/profile', authenticate, AuthController.updateProfile);
router.put('/change-password', authenticate, AuthController.changePassword);

export default router;
