import { Router } from 'express';
import multer from 'multer';
import { validateBody } from '../middleware/validate.middleware';
import {
  createAccommodationSchema,
  updateAccommodationSchema,
  addRoomSchema,
  createAllocationSchema,
  updateAllocationSchema,
} from '../validators/accommodations.validator';
import * as ctrl from '../controllers/accommodations.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Allocation sub-routes must come before /:id to avoid route conflicts
router.get('/allocations', ctrl.getAllocations);
router.get('/allocations/matrix', ctrl.getAllocationMatrix);
router.get('/allocations/unassigned', ctrl.getUnassignedGuests);
router.get('/allocations/template/download', ctrl.downloadAllocationTemplate);
router.get('/allocations/template/all-venues/download', ctrl.downloadAllVenuesTemplate);
router.post('/allocations/import', upload.single('file'), ctrl.importAllocations);
router.post(
  '/allocations/import/all-venues',
  upload.single('file'),
  ctrl.importAllVenuesAllocations,
);
router.post('/allocations', validateBody(createAllocationSchema), ctrl.createAllocation);
router.put('/allocations/:id', validateBody(updateAllocationSchema), ctrl.updateAllocation);
router.delete('/allocations/:id', ctrl.deleteAllocation);

// Accommodation CRUD
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validateBody(createAccommodationSchema), ctrl.create);
router.put('/:id', validateBody(updateAccommodationSchema), ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/:id/rooms', ctrl.getRooms);
router.post('/:id/rooms', validateBody(addRoomSchema), ctrl.addRoom);

export default router;
