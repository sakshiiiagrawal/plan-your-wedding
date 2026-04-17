import type { Request, Response, NextFunction } from 'express';
import { getWeddingOwnerId } from '../shared/utils/auth.utils';
import * as service from '../services/vendors.service';

type IdParam = { id: string };
type IdEventParam = { id: string; eventId: string };

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = typeof req.query['category'] === 'string' ? req.query['category'] : undefined;
    res.json(await service.listVendors(getWeddingOwnerId(req), category));
  } catch (e) {
    next(e);
  }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await service.getCategories(getWeddingOwnerId(req)));
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
    res.json(await service.getVendor(req.params.id, getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(201).json(await service.createVendor(req.body, getWeddingOwnerId(req)));
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
    res.json(await service.updateVendor(req.params.id, getWeddingOwnerId(req), req.body));
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
    await service.deleteVendor(req.params.id, getWeddingOwnerId(req));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};

export const assignToEvent = async (
  req: Request<IdEventParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.status(201).json(await service.assignToEvent(req.params.id, req.params.eventId, req.body));
  } catch (e) {
    next(e);
  }
};

export const removeFromEvent = async (
  req: Request<IdEventParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await service.removeFromEvent(req.params.id, req.params.eventId);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};

export const getPayments = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getPayments(req.params.id, getWeddingOwnerId(req)));
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
      .json(await service.addPayment(req.params.id, getWeddingOwnerId(req), req.body));
  } catch (e) {
    next(e);
  }
};

export const deletePayment = async (
  req: Request<{ id: string; paymentId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await service.deletePayment(req.params.paymentId, getWeddingOwnerId(req));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};

export const getVendorExpenseSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getVendorExpenseSummary(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getVendorsBySide = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getVendorsBySide(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};
