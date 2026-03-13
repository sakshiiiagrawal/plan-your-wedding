import { Router } from 'express';
import { validateBody } from '../middleware/validate.middleware';
import { createEventSchema, updateEventSchema } from '../validators/events.validator';
import * as eventsController from '../controllers/events.controller';

const router = Router();

router.get('/', eventsController.getAll);
router.get('/:id', eventsController.getById);
router.post('/', validateBody(createEventSchema), eventsController.create);
router.put('/:id', validateBody(updateEventSchema), eventsController.update);
router.delete('/:id', eventsController.remove);
router.get('/:id/guests', eventsController.getGuests);
router.get('/:id/vendors', eventsController.getVendors);
router.get('/:id/rituals', eventsController.getRituals);

export default router;
