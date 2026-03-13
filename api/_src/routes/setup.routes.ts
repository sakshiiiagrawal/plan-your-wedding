import { Router } from 'express';
import { getSetupStatus } from '../controllers/setup.controller';

const router = Router();

router.get('/', getSetupStatus);

export default router;
