import { Router } from 'express';
import * as ctrl from '../controllers/geocode.controller';

const router = Router();

router.get('/search', ctrl.search);

export default router;
