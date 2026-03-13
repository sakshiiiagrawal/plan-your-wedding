import { Router } from 'express';
import { getWeddingBySlug } from '../controllers/weddings.controller';

const router = Router();

router.get('/:slug', getWeddingBySlug);

export default router;
