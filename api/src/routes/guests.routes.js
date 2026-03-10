const express = require('express');
const multer = require('multer');
const router = express.Router();
const guestsController = require('../controllers/guests.controller');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', guestsController.getAll);
router.get('/summary', guestsController.getSummary);
router.get('/groups', guestsController.getGroups);
router.post('/groups', guestsController.createGroup);
router.get('/template/download', guestsController.downloadTemplate);
router.post('/import', upload.single('file'), guestsController.importGuests);
router.get('/:id', guestsController.getById);
router.post('/', guestsController.create);
router.post('/bulk', guestsController.bulkCreate);
router.put('/:id', guestsController.update);
router.delete('/:id', guestsController.delete);
router.put('/:id/rsvp/:eventId', guestsController.updateRsvp);

module.exports = router;
