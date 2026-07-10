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
    const { email, role, sections } = req.body;
    res.status(201).json(await membersService.inviteMember(ownerId, email, role, sections));
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

export const listPending = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = getAuthUser(req);
    res.json(await membersService.listPendingInvitesForEmail(email));
  } catch (error) {
    next(error);
  }
};

export const acceptPending = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id, email, emailVerified } = getAuthUser(req);
    res.json(await membersService.acceptPendingInvite({ id, email, emailVerified }, req.params.id));
  } catch (error) {
    next(error);
  }
};

export const declinePending = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, emailVerified } = getAuthUser(req);
    await membersService.declinePendingInvite({ email, emailVerified }, req.params.id);
    res.status(204).send();
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
    const ownerId = getWeddingOwnerId(req);
    const { role, sections } = req.body;
    res.json(await membersService.updateMember(ownerId, req.params.id, { role, sections }));
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
