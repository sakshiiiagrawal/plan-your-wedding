import type { Request, Response, NextFunction } from 'express';
import { getWeddingOwnerId } from '../shared/utils/auth.utils';
import * as eventsService from '../services/events.service';

type IdParam = { id: string };
type SlugParam = { slug: string };

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    const events = await eventsService.listEvents(ownerId);
    res.json(events);
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
    const event = await eventsService.getEvent(req.params.id, ownerId);
    res.json(event);
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    const event = await eventsService.createEvent(req.body, ownerId);
    res.status(201).json(event);
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
    const event = await eventsService.updateEvent(req.params.id, ownerId, req.body);
    res.json(event);
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
    await eventsService.deleteEvent(req.params.id, ownerId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getGuests = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const guests = await eventsService.getEventGuests(req.params.id);
    res.json(guests);
  } catch (error) {
    next(error);
  }
};

export const getVendors = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const vendors = await eventsService.getEventVendors(req.params.id);
    res.json(vendors);
  } catch (error) {
    next(error);
  }
};

export const getRituals = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const rituals = await eventsService.getEventRituals(req.params.id);
    res.json(rituals);
  } catch (error) {
    next(error);
  }
};

export const getPublicEvents = async (
  req: Request<SlugParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const events = await eventsService.getPublicEvents(req.params.slug);
    res.json(events);
  } catch (error) {
    next(error);
  }
};
