import type { Request, Response, NextFunction } from 'express';
import { getWeddingOwnerId } from '../shared/utils/auth.utils';
import * as service from '../services/tasks.service';

type IdParam = { id: string };

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(
      await service.listTasks(getWeddingOwnerId(req), {
        status: str(req.query['status']),
        priority: str(req.query['priority']),
        event_id: str(req.query['event_id']),
        assigned_to: str(req.query['assigned_to']),
      }),
    );
  } catch (e) {
    next(e);
  }
};

export const getOverdue = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getOverdueTasks(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getUpcoming = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getUpcomingTasks(getWeddingOwnerId(req)));
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
    res.json(await service.getTask(req.params.id, getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(201).json(await service.createTask(req.body, getWeddingOwnerId(req)));
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
    res.json(await service.updateTask(req.params.id, getWeddingOwnerId(req), req.body));
  } catch (e) {
    next(e);
  }
};

export const updateStatus = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(
      await service.updateTaskStatus(req.params.id, getWeddingOwnerId(req), req.body.status),
    );
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
    await service.deleteTask(req.params.id, getWeddingOwnerId(req));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};

export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await service.getTaskStats(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};
