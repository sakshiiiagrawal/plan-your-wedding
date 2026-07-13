import type { Request, Response, NextFunction } from 'express';
import * as repo from '../repositories/weddings.repository';
import * as weddingsService from '../services/weddings.service';
import { getAuthUser } from '../shared/utils/auth.utils';

export const getWeddingBySlug = async (
  req: Request<{ slug: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await repo.findBySlug(req.params.slug);
    // Existence is all the public callers (SlugGuard, onboarding availability
    // check) need — the wedding's UUID stays private.
    res.json({ exists: Boolean(data) });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = getAuthUser(req);
    const wedding = await weddingsService.createWedding(id, req.body);
    res.status(201).json(wedding);
  } catch (error) {
    next(error);
  }
};

export const update = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = getAuthUser(req);
    res.json(await weddingsService.updateWedding(id, req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};

export const remove = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = getAuthUser(req);
    await weddingsService.deleteWedding(id, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
