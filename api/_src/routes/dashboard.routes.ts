import { Router } from 'express';
import * as ctrl from '../controllers/dashboard.controller';

const router = Router();

router.get('/overview', ctrl.getOverview);
router.get('/stats', ctrl.getStats);
router.get('/summary', ctrl.getSummary);
router.get('/activity', ctrl.getRecentActivity);

export default router;
