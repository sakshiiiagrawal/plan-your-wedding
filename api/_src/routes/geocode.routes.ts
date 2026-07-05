import { Router } from 'express';
import * as ctrl from '../controllers/geocode.controller';

const router = Router();

router.get('/search', ctrl.search);
router.get('/details', ctrl.details);

export default router;
