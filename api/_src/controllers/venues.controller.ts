import type { Request, Response, NextFunction } from 'express';
import { getWeddingOwnerId } from '../shared/utils/auth.utils';
import * as venuesService from '../services/venues.service';

type IdParam = { id: string };

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    res.json(await venuesService.listVenues(ownerId));
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
    res.json(await venuesService.getVenue(req.params.id, ownerId));
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    res.status(201).json(await venuesService.createVenue(req.body, ownerId));
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
    res.json(await venuesService.updateVenue(req.params.id, ownerId, req.body));
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
    await venuesService.deleteVenue(req.params.id, ownerId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
