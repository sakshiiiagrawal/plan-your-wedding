import { Router } from 'express';
import multer from 'multer';
import { validateBody } from '../middleware/validate.middleware';
import {
  createVenueSchema,
  updateVenueSchema,
  addRoomSchema,
  updateRoomSchema,
  createAllocationSchema,
  updateAllocationSchema,
  createPaymentSchema,
} from '../validators/venues.validator';
import * as ctrl from '../controllers/venues.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Allocation sub-routes must come before /:id to avoid route conflicts
router.get('/allocations/matrix', ctrl.getAllocationMatrix);
router.get('/allocations/unassigned', ctrl.getUnassignedGuests);
router.get('/allocations/template/download', ctrl.downloadAllocationTemplate);
router.get('/allocations/template/all-venues/download', ctrl.downloadAllVenuesTemplate);
router.post('/allocations/import', upload.single('file'), ctrl.importAllocations);
router.post('/allocations/import/all-venues', upload.single('file'), ctrl.importAllVenuesAllocations);
router.post('/allocations', validateBody(createAllocationSchema), ctrl.createAllocation);
router.put('/allocations/:id', validateBody(updateAllocationSchema), ctrl.updateAllocation);
router.delete('/allocations/:id', ctrl.deleteAllocation);

// Venue CRUD
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validateBody(createVenueSchema), ctrl.create);
router.put('/:id', validateBody(updateVenueSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

// Rooms
router.get('/:id/rooms', ctrl.getRooms);
router.post('/:id/rooms', validateBody(addRoomSchema), ctrl.addRoom);
router.put('/rooms/:id', validateBody(updateRoomSchema), ctrl.updateRoom);
router.delete('/rooms/:id', ctrl.deleteRoom);

// Payments
router.get('/:id/payments', ctrl.getPayments);
router.post('/:id/payments', validateBody(createPaymentSchema), ctrl.addPayment);
router.delete('/:id/payments/:paymentId', ctrl.deletePayment);

export default router;
