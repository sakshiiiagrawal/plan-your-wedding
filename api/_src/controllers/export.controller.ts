import type { Request, Response, NextFunction } from 'express';
import { getWeddingOwnerId } from '../shared/utils/auth.utils';
import * as exportService from '../services/export.service';

function sendXlsx(res: Response, buffer: Buffer, filename: string): void {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.send(buffer);
}

export const exportGuests = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendXlsx(res, await exportService.exportGuests(getWeddingOwnerId(req)), 'guests.xlsx');
  } catch (error) {
    next(error);
  }
};

export const exportBudget = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendXlsx(res, await exportService.exportBudget(getWeddingOwnerId(req)), 'budget.xlsx');
  } catch (error) {
    next(error);
  }
};

export const exportVendors = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendXlsx(res, await exportService.exportVendors(getWeddingOwnerId(req)), 'vendors.xlsx');
  } catch (error) {
    next(error);
  }
};

export const exportAllocations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendXlsx(
      res,
      await exportService.exportAllocations(getWeddingOwnerId(req)),
      'accommodations.xlsx',
    );
  } catch (error) {
    next(error);
  }
};
