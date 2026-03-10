const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events.controller');

router.get('/', eventsController.getAll);
router.get('/:id', eventsController.getById);
router.post('/', eventsController.create);
router.put('/:id', eventsController.update);
router.delete('/:id', eventsController.delete);
router.get('/:id/guests', eventsController.getGuests);
router.get('/:id/vendors', eventsController.getVendors);
router.get('/:id/rituals', eventsController.getRituals);

module.exports = router;
