const express = require('express');
const multer = require('multer');
const router = express.Router();
const accommodationsController = require('../controllers/accommodations.controller');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', accommodationsController.getAll);
router.get('/:id', accommodationsController.getById);
router.post('/', accommodationsController.create);
router.put('/:id', accommodationsController.update);
router.delete('/:id', accommodationsController.delete);
router.get('/:id/rooms', accommodationsController.getRooms);
router.post('/:id/rooms', accommodationsController.addRoom);

// Room allocations
router.get('/allocations', accommodationsController.getAllocations);
router.get('/allocations/matrix', accommodationsController.getAllocationMatrix);
router.get('/allocations/template/download', accommodationsController.downloadAllocationTemplate);
router.get('/allocations/template/all-venues/download', accommodationsController.downloadAllVenuesTemplate);
router.post('/allocations/import', upload.single('file'), accommodationsController.importAllocations);
router.post('/allocations/import/all-venues', upload.single('file'), accommodationsController.importAllVenuesAllocations);
router.post('/allocations', accommodationsController.createAllocation);
router.put('/allocations/:id', accommodationsController.updateAllocation);
router.delete('/allocations/:id', accommodationsController.deleteAllocation);
router.get('/allocations/unassigned', accommodationsController.getUnassignedGuests);

module.exports = router;
