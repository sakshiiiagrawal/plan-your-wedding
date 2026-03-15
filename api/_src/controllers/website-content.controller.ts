import type { Request, Response, NextFunction } from 'express';
import { getWeddingOwnerId } from '../shared/utils/auth.utils';
import * as service from '../services/website-content.service';

type SectionParam = { section: string };
type SlugSectionParam = { slug: string; section: string };

/** Returns owner id if authenticated, null otherwise (public-safe routes). */
function tryGetOwnerId(req: Request): string | null {
  return req.user ? getWeddingOwnerId(req) : null;
}

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await service.listContent(tryGetOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getBySection = async (
  req: Request<SectionParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getSection(req.params.section, tryGetOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getHeroContent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getSectionContent('hero', tryGetOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getCoupleContent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getSectionContent('couple', tryGetOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getOurStory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getSectionContent('our_story', tryGetOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const update = async (
  req: Request<SectionParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.upsertSection(req.params.section, getWeddingOwnerId(req), req.body));
  } catch (e) {
    next(e);
  }
};

export const getPublicWebsiteContent = async (
  req: Request<SlugSectionParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getPublicContent(req.params.slug, req.params.section));
  } catch (e) {
    next(e);
  }
};
