const express = require('express');
const router = express.Router();
const venuesController = require('../controllers/venues.controller');

router.get('/', venuesController.getAll);
router.get('/:id', venuesController.getById);
router.post('/', venuesController.create);
router.put('/:id', venuesController.update);
router.delete('/:id', venuesController.delete);

module.exports = router;
