import { Router } from 'express';
import * as ctrl from '../controllers/reminders.controller';

const router = Router();

router.get('/', ctrl.getFeed);

export default router;
