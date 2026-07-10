import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate.middleware';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  updateProfileSchema,
  changePasswordSchema,
  setActiveWeddingSchema,
} from '../validators/auth.validator';
import { authLimiter, resendVerificationLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.getCurrentUser);
router.post(
  '/forgot-password',
  authLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  authLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword,
);
router.post('/verify-email', validateBody(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', resendVerificationLimiter, authController.resendVerification);
router.patch('/me', validateBody(updateProfileSchema), authController.updateProfile);
router.post(
  '/change-password',
  validateBody(changePasswordSchema),
  authController.changePassword,
);
router.delete('/me', authController.deleteAccount);
router.get('/weddings', authController.listWeddings);
router.post(
  '/active-wedding',
  validateBody(setActiveWeddingSchema),
  authController.setActiveWedding,
);

export default router;
