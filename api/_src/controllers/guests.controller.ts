import type { Request, Response, NextFunction } from 'express';
import { getAuthUser, getWeddingOwnerId } from '../shared/utils/auth.utils';
import * as guestsService from '../services/guests.service';

type IdParam = { id: string };
type IdEventParam = { id: string; eventId: string };

export const getSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    res.json(await guestsService.getGuestSummary(ownerId));
  } catch (error) {
    next(error);
  }
};

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
const num = (v: unknown) => {
  if (typeof v !== 'string') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export const getPageData = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(
      await guestsService.getPageData(getWeddingOwnerId(req), {
        side: str(req.query['side']),
        search: str(req.query['search']),
        rsvp_status: str(req.query['rsvp_status']),
        include_vendor_team: req.query['include_vendor_team'] === 'true',
        page: num(req.query['page']),
        per_page: num(req.query['per_page']),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const getGroups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    res.json(await guestsService.listGroups(ownerId));
  } catch (error) {
    next(error);
  }
};

export const createGroup = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    res.status(201).json(await guestsService.createGroup(req.body, ownerId));
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
    res.json(await guestsService.getGuest(req.params.id, ownerId));
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = getAuthUser(req);
    const ownerId = getWeddingOwnerId(req);
    res.status(201).json(await guestsService.createGuest(req.body, ownerId, userId));
  } catch (error) {
    next(error);
  }
};

export const bulkCreate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: userId } = getAuthUser(req);
    const ownerId = getWeddingOwnerId(req);
    res.status(201).json(await guestsService.bulkCreateGuests(req.body.guests, ownerId, userId));
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
    const { id: userId } = getAuthUser(req);
    const ownerId = getWeddingOwnerId(req);
    res.json(await guestsService.updateGuest(req.params.id, ownerId, req.body, userId));
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
    await guestsService.deleteGuest(req.params.id, ownerId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const bulkRemove = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    await guestsService.deleteGuestsBulk(req.body.ids, ownerId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const updateRsvp = async (
  req: Request<IdEventParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await guestsService.updateRsvp(req.params.id, req.params.eventId, req.body));
  } catch (error) {
    next(error);
  }
};

export const updateOverallRsvp = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    res.json(await guestsService.setOverallRsvp(req.params.id, ownerId, req.body));
  } catch (error) {
    next(error);
  }
};

export const submitPublicRsvp = async (
  req: Request<{ slug: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await guestsService.submitPublicRsvp(req.params.slug, req.body));
  } catch (error) {
    next(error);
  }
};

export const downloadTemplate = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const buffer = await guestsService.getImportTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=guest_import_template.xlsx');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const importGuests = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const ownerId = getWeddingOwnerId(req);
    const result = await guestsService.importGuests(req.file.buffer, ownerId);

    if ('error' in result) {
      res.status(400).json(result);
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
