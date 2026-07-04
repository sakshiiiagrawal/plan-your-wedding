import type { Request, Response, NextFunction } from 'express';
import { getAuthUser, getWeddingOwnerId } from '../shared/utils/auth.utils';
import { ForbiddenError } from '../shared/errors/HttpError';
import * as membersService from '../services/members.service';

/** Route middleware: member management is admin-only. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (getAuthUser(req).role !== 'admin') {
    next(new ForbiddenError('Only admins can manage members'));
    return;
  }
  next();
}

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    res.json(await membersService.listMembers(ownerId));
  } catch (error) {
    next(error);
  }
};

export const invite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    const { email, role } = req.body;
    res.status(201).json(await membersService.inviteMember(ownerId, email, role));
  } catch (error) {
    next(error);
  }
};

export const accept = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId } = getAuthUser(req);
    res.json(await membersService.acceptInvite(userId, req.body.token));
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const ownerId = getWeddingOwnerId(req);
    res.json(await membersService.updateMemberRole(ownerId, req.params.id, req.body.role));
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
    const ownerId = getWeddingOwnerId(req);
    await membersService.removeMember(ownerId, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
