import { Router } from 'express';
import { validateBody } from '../middleware/validate.middleware';
import { createVenueSchema, updateVenueSchema } from '../validators/venues.validator';
import * as venuesController from '../controllers/venues.controller';

const router = Router();

router.get('/', venuesController.getAll);
router.get('/:id', venuesController.getById);
router.post('/', validateBody(createVenueSchema), venuesController.create);
router.put('/:id', validateBody(updateVenueSchema), venuesController.update);
router.delete('/:id', venuesController.remove);

export default router;
