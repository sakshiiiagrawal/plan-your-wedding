import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import * as usersController from '../controllers/users.controller';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.getCurrentUser);

// User management (admin only — verifyToken applied globally in app.ts)
router.get('/users', requireAdmin, usersController.listUsers);
router.post('/create-user', requireAdmin, usersController.createUser);
router.delete('/users/:id', requireAdmin, usersController.deleteUser);

export default router;
