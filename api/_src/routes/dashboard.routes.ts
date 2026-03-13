import { Router } from 'express';
import * as ctrl from '../controllers/dashboard.controller';

const router = Router();

router.get('/stats', ctrl.getStats);
router.get('/summary', ctrl.getSummary);
router.get('/countdown', ctrl.getCountdown);

export default router;
