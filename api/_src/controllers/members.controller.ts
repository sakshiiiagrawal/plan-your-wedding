import type { Request, Response, NextFunction } from 'express';
import { getAuthUser, getWeddingOwnerId } from '../shared/utils/auth.utils';
import * as membersService from '../services/members.service';

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
    const actor = getAuthUser(req);
    const { email, role, sections, permissions } = req.body;
    res
      .status(201)
      .json(await membersService.inviteMember(actor, email, role, sections, permissions));
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

// Public (token-gated): powers the invite landing page's greeting + email prefill.
export const invitePreview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    res.json(await membersService.getInvitePreview(token));
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
    const actor = getAuthUser(req);
    const { role, sections, permissions } = req.body;
    res.json(
      await membersService.updateMember(actor, req.params.id, { role, sections, permissions }),
    );
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
    const actor = getAuthUser(req);
    await membersService.removeMember(actor, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
