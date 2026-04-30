import { Router } from 'express';
import multer from 'multer';
import { validateBody } from '../middleware/validate.middleware';
import {
  createGuestSchema,
  updateGuestSchema,
  bulkCreateGuestsSchema,
  bulkDeleteGuestsSchema,
  updateRsvpSchema,
  createGroupSchema,
} from '../validators/guests.validator';
import * as guestsController from '../controllers/guests.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', guestsController.getAll);
router.get('/summary', guestsController.getSummary);
router.get('/groups', guestsController.getGroups);
router.post('/groups', validateBody(createGroupSchema), guestsController.createGroup);
router.get('/template/download', guestsController.downloadTemplate);
router.post('/import', upload.single('file'), guestsController.importGuests);
router.get('/:id', guestsController.getById);
router.post('/', validateBody(createGuestSchema), guestsController.create);
router.post('/bulk', validateBody(bulkCreateGuestsSchema), guestsController.bulkCreate);
router.put('/:id', validateBody(updateGuestSchema), guestsController.update);
router.delete('/bulk', validateBody(bulkDeleteGuestsSchema), guestsController.bulkRemove);
router.delete('/:id', guestsController.remove);
router.put('/:id/rsvp/:eventId', validateBody(updateRsvpSchema), guestsController.updateRsvp);

export default router;
