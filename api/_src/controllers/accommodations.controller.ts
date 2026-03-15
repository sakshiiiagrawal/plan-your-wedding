import type { Request, Response, NextFunction } from 'express';
import { getWeddingOwnerId } from '../shared/utils/auth.utils';
import * as service from '../services/accommodations.service';

type IdParam = { id: string };

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await service.listAccommodations(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getById = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getAccommodation(req.params.id, getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(201).json(await service.createAccommodation(req.body, getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const update = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.updateAccommodation(req.params.id, getWeddingOwnerId(req), req.body));
  } catch (e) {
    next(e);
  }
};

export const remove = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await service.deleteAccommodation(req.params.id, getWeddingOwnerId(req));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};

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

export const getAllocations = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getAllocations());
  } catch (e) {
    next(e);
  }
};

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

export const downloadAllocationTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const hotelId = typeof req.query['hotel_id'] === 'string' ? req.query['hotel_id'] : undefined;
    const hotelName =
      typeof req.query['hotel_name'] === 'string' ? req.query['hotel_name'] : undefined;
    const result = await service.getDownloadTemplate(getWeddingOwnerId(req), hotelId, hotelName);

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

    const hotelId = typeof req.body['hotel_id'] === 'string' ? req.body['hotel_id'] : undefined;
    const hotelName =
      typeof req.body['hotel_name'] === 'string' ? req.body['hotel_name'] : undefined;

    if (!hotelId && !hotelName) {
      res
        .status(400)
        .json({ error: 'Hotel information is required. Please provide hotel_id or hotel_name.' });
      return;
    }

    const result = await service.importAllocations(
      req.file.buffer,
      getWeddingOwnerId(req),
      hotelId,
      hotelName,
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
