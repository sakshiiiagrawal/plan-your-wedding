import type { Request, Response, NextFunction } from 'express';
import { getWeddingOwnerId } from '../shared/utils/auth.utils';
import * as mediaService from '../services/media.service';

export const uploadGalleryImage = async (
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
    const images = await mediaService.uploadGalleryImage(ownerId, req.file);
    res.status(201).json({ images });
  } catch (error) {
    next(error);
  }
};

export const uploadMusic = async (
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
    const url = await mediaService.uploadMusic(ownerId, req.file);
    res.status(201).json({ url });
  } catch (error) {
    next(error);
  }
};

export const deleteMusic = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    await mediaService.deleteMusic(ownerId, req.body.url);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const deleteGalleryImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    const images = await mediaService.deleteGalleryImage(ownerId, req.body.url);
    res.json({ images });
  } catch (error) {
    next(error);
  }
};
