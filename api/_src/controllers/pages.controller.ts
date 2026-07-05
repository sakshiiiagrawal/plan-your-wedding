import type { Request, Response, NextFunction } from 'express';
import { getWeddingOwnerId } from '../shared/utils/auth.utils';
import * as service from '../services/pages.service';

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await service.listPages(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(201).json(await service.createPage(getWeddingOwnerId(req), req.body));
  } catch (e) {
    next(e);
  }
};

export const update = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.updatePage(req.params.id, getWeddingOwnerId(req), req.body));
  } catch (e) {
    next(e);
  }
};

export const remove = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await service.deletePage(req.params.id, getWeddingOwnerId(req));
    res.status(204).end();
  } catch (e) {
    next(e);
  }
};

export const getPublicPages = async (
  req: Request<{ slug: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getPublicPages(req.params.slug));
  } catch (e) {
    next(e);
  }
};
