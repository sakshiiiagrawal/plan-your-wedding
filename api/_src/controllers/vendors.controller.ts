import type { Request, Response, NextFunction } from 'express';
import { getAuthUser, getWeddingOwnerId } from '../shared/utils/auth.utils';
import * as service from '../services/vendors.service';

type IdParam = { id: string };
type IdEventParam = { id: string; eventId: string };

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseStringList = (value: unknown): string[] => {
      if (typeof value === 'string') {
        return value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
      if (Array.isArray(value)) {
        return value
          .flatMap((entry) =>
            typeof entry === 'string'
              ? entry
                  .split(',')
                  .map((chunk) => chunk.trim())
                  .filter(Boolean)
              : [],
          )
          .filter(Boolean);
      }
      return [];
    };

    const parsePositiveInt = (value: unknown): number | undefined => {
      if (typeof value !== 'string' || value.trim() === '') return undefined;
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    };

    const legacyCategory = typeof req.query['category'] === 'string' ? req.query['category'] : undefined;
    const categoryIds = [
      ...parseStringList(req.query['category_ids']),
      ...(legacyCategory ? [legacyCategory] : []),
    ];

    const options: service.VendorListOptions = {
      category_ids: categoryIds,
      payment_states: parseStringList(req.query['payment_states']) as Array<
        'quoted' | 'deposit' | 'confirmed'
      >,
      logistics: parseStringList(req.query['logistics']) as Array<
        'food' | 'accommodation' | 'team'
      >,
    };
    const search = typeof req.query['search'] === 'string' ? req.query['search'] : undefined;
    const page = parsePositiveInt(req.query['page']);
    const perPage = parsePositiveInt(req.query['per_page']);
    if (search !== undefined) options.search = search;
    if (page !== undefined) options.page = page;
    if (perPage !== undefined) options.per_page = perPage;

    res.json(await service.listVendors(getWeddingOwnerId(req), options));
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
    const { id: userId } = getAuthUser(req);
    res.status(201).json(await service.createVendor(req.body, getWeddingOwnerId(req), userId));
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
    const { id: userId } = getAuthUser(req);
    res.json(await service.updateVendor(req.params.id, getWeddingOwnerId(req), req.body, userId));
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
