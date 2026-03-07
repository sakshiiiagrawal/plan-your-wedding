const express = require('express');
const router = express.Router();
const vendorsController = require('../controllers/vendors.controller');

router.get('/', vendorsController.getAll);
router.get('/categories', vendorsController.getCategories);
router.get('/:id', vendorsController.getById);
router.post('/', vendorsController.create);
router.put('/:id', vendorsController.update);
router.delete('/:id', vendorsController.delete);
router.post('/:id/assign/:eventId', vendorsController.assignToEvent);
router.delete('/:id/assign/:eventId', vendorsController.removeFromEvent);
router.get('/:id/payments', vendorsController.getPayments);

module.exports = router;
