import type { Request, Response, NextFunction } from 'express';
import { getWeddingOwnerId } from '../shared/utils/auth.utils';
import * as service from '../services/budget.service';

type IdParam = { id: string };
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

// ---------------------------------------------------------------------------
// Summary / overview
// ---------------------------------------------------------------------------

export const getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await service.getBudgetSummary(getWeddingOwnerId(req))); } catch (e) { next(e); }
};

export const getOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await service.getBudgetOverview(getWeddingOwnerId(req))); } catch (e) { next(e); }
};

export const getBySide = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await service.getBySide(getWeddingOwnerId(req))); } catch (e) { next(e); }
};

export const getSideSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await service.getSideSummary(getWeddingOwnerId(req))); } catch (e) { next(e); }
};

export const updateTotalBudget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await service.updateTotalBudget(getWeddingOwnerId(req), req.body)); } catch (e) { next(e); }
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await service.listCategories(getWeddingOwnerId(req))); } catch (e) { next(e); }
};

export const getCategoryTree = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await service.getCategoryTree(getWeddingOwnerId(req))); } catch (e) { next(e); }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.status(201).json(await service.createCategory(req.body, getWeddingOwnerId(req))); } catch (e) { next(e); }
};

export const createCustomCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.createCustomCategory(getWeddingOwnerId(req), req.body);
    if ('error' in result) { res.status(400).json({ error: result.error }); return; }
    res.status(201).json(result);
  } catch (e) { next(e); }
};

export const updateCategory = async (req: Request<IdParam>, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await service.updateCategory(req.params.id, getWeddingOwnerId(req), req.body)); } catch (e) { next(e); }
};

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export const getExpenses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await service.listExpenses(getWeddingOwnerId(req), {
      category_id: str(req.query['category_id']),
      vendor_id: str(req.query['vendor_id']),
      event_id: str(req.query['event_id']),
      side: str(req.query['side']),
    }));
  } catch (e) { next(e); }
};

export const getExpenseById = async (req: Request<IdParam>, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await service.getExpense(req.params.id, getWeddingOwnerId(req))); } catch (e) { next(e); }
};

export const createExpense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.status(201).json(await service.createExpense(req.body, getWeddingOwnerId(req))); } catch (e) { next(e); }
};

export const updateExpense = async (req: Request<IdParam>, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await service.updateExpense(req.params.id, getWeddingOwnerId(req), req.body)); } catch (e) { next(e); }
};

export const deleteExpense = async (req: Request<IdParam>, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteExpense(req.params.id, getWeddingOwnerId(req));
    res.status(204).send();
  } catch (e) { next(e); }
};

export const getExpensesByCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await service.getExpensesByCategory(getWeddingOwnerId(req))); } catch (e) { next(e); }
};

export const getExpensesByVendor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await service.getExpensesByVendor(getWeddingOwnerId(req))); } catch (e) { next(e); }
};

export const getExpensesByCategoryTree = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { res.json(await service.getExpensesByCategoryTree(getWeddingOwnerId(req))); } catch (e) { next(e); }
};

// ---------------------------------------------------------------------------
// Vendor budget (served under /budget/vendors/*)
// ---------------------------------------------------------------------------

export const getVendorBudgetSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Delegates to vendors service via budget — re-imported to keep routing clean
    const { getVendorBudgetSummary } = await import('../services/vendors.service');
    res.json(await getVendorBudgetSummary(getWeddingOwnerId(req)));
  } catch (e) { next(e); }
};

export const getVendorsBySide = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { getVendorsBySide } = await import('../services/vendors.service');
    res.json(await getVendorsBySide(getWeddingOwnerId(req)));
  } catch (e) { next(e); }
};
