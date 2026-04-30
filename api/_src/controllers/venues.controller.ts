import type { Request, Response, NextFunction } from 'express';
import { getWeddingOwnerId } from '../shared/utils/auth.utils';
import * as service from '../services/venues.service';

type IdParam = { id: string };
type IdPaymentParam = { id: string; paymentId: string };

// ---------------------------------------------------------------------------
// Venue CRUD
// ---------------------------------------------------------------------------

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    res.json(await service.listVenues(ownerId));
  } catch (error) {
    next(error);
  }
};

export const getById = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    res.json(await service.getVenue(req.params.id, ownerId));
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    res.status(201).json(await service.createVenue(req.body, ownerId));
  } catch (error) {
    next(error);
  }
};

export const update = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    res.json(await service.updateVenue(req.params.id, ownerId, req.body));
  } catch (error) {
    next(error);
  }
};

export const remove = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    await service.deleteVenue(req.params.id, ownerId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export const getRooms = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getRooms(req.params.id));
  } catch (e) {
    next(e);
  }
};

export const addRoom = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.status(201).json(await service.addRoom(req.params.id, req.body));
  } catch (e) {
    next(e);
  }
};

export const updateRoom = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.updateRoom(req.params.id, req.body));
  } catch (e) {
    next(e);
  }
};

export const deleteRoom = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await service.deleteRoom(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};

// ---------------------------------------------------------------------------
// Allocations
// ---------------------------------------------------------------------------

export const getAllocationMatrix = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getAllocationMatrix(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const createAllocation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.status(201).json(await service.createAllocation(req.body));
  } catch (e) {
    next(e);
  }
};

export const updateAllocation = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.updateAllocation(req.params.id, req.body));
  } catch (e) {
    next(e);
  }
};

export const deleteAllocation = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await service.deleteAllocation(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};

export const getUnassignedGuests = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getUnassignedGuests(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

// ---------------------------------------------------------------------------
// Excel template + import
// ---------------------------------------------------------------------------

export const downloadAllocationTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const venueId = typeof req.query['hotel_id'] === 'string' ? req.query['hotel_id'] : undefined;
    const venueName =
      typeof req.query['hotel_name'] === 'string' ? req.query['hotel_name'] : undefined;
    const result = await service.getDownloadTemplate(getWeddingOwnerId(req), venueId, venueName);

    if ('error' in result) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
    res.send(result.buffer);
  } catch (e) {
    next(e);
  }
};

export const downloadAllVenuesTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const buffer = await service.getAllVenuesTemplate(getWeddingOwnerId(req));
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=all_venues_room_allocation.xlsx');
    res.send(buffer);
  } catch (e) {
    next(e);
  }
};

export const importAllocations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const venueId = typeof req.body['hotel_id'] === 'string' ? req.body['hotel_id'] : undefined;
    const venueName =
      typeof req.body['hotel_name'] === 'string' ? req.body['hotel_name'] : undefined;

    if (!venueId && !venueName) {
      res
        .status(400)
        .json({ error: 'Venue information is required. Please provide hotel_id or hotel_name.' });
      return;
    }

    const result = await service.importAllocations(
      req.file.buffer,
      getWeddingOwnerId(req),
      venueId,
      venueName,
    );

    if ('error' in result && !('count' in result)) {
      res.status(400).json(result);
      return;
    }
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

export const importAllVenuesAllocations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const result = await service.importAllVenuesAllocations(
      req.file.buffer,
      getWeddingOwnerId(req),
    );

    if ('error' in result && !('count' in result)) {
      res.status(400).json(result);
      return;
    }
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export const getPayments = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getVenuePayments(req.params.id, getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const addPayment = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res
      .status(201)
      .json(await service.addVenuePayment(req.params.id, getWeddingOwnerId(req), req.body));
  } catch (e) {
    next(e);
  }
};

export const deletePayment = async (
  req: Request<IdPaymentParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await service.deleteVenuePayment(req.params.paymentId, getWeddingOwnerId(req));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};
