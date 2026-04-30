import type { Request, Response, NextFunction } from 'express';
import { getWeddingOwnerId } from '../shared/utils/auth.utils';
import * as service from '../services/expense.service';

type IdParam = { id: string };
type PaymentParam = { paymentId: string };
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

// ---------------------------------------------------------------------------
// Summary / overview
// ---------------------------------------------------------------------------

export const getSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getExpenseSummary(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getOverview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getExpenseOverview(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getBySide = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await service.getBySide(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getSideSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getSideSummary(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const updateTotalExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.updateTotalExpense(getWeddingOwnerId(req), req.body));
  } catch (e) {
    next(e);
  }
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.listCategories(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getCategoryTree = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getCategoryTree(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.status(201).json(await service.createCategory(req.body, getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const createCustomCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await service.createCustomCategory(getWeddingOwnerId(req), req.body);
    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

export const updateCategory = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.updateCategory(req.params.id, getWeddingOwnerId(req), req.body));
  } catch (e) {
    next(e);
  }
};

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export const getExpenses = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filters: service.ExpenseQueryFilters = {};
    const categoryId = str(req.query['category_id']);
    const side = str(req.query['side']);
    const sourceType = str(req.query['source_type']);
    const status = str(req.query['status']);

    if (categoryId) filters.category_id = categoryId;
    if (side) filters.side = side;
    if (sourceType) filters.source_type = sourceType;
    if (status) filters.status = status;

    res.json(await service.listExpenses(getWeddingOwnerId(req), filters));
  } catch (e) {
    next(e);
  }
};

export const getExpenseById = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getExpense(req.params.id, getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const createExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.status(201).json(await service.createExpense(req.body, getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const updateExpense = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.updateExpense(req.params.id, getWeddingOwnerId(req), req.body));
  } catch (e) {
    next(e);
  }
};

export const deleteExpense = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await service.deleteExpense(req.params.id, getWeddingOwnerId(req));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};

export const getExpensesByCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getExpensesByCategory(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getExpensesByVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getExpensesByVendor(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getExpensesByCategoryTree = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getExpensesByCategoryTree(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getExpensePayments = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getExpensePayments(req.params.id, getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const createExpensePayment = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res
      .status(201)
      .json(await service.createExpensePayment(req.params.id, getWeddingOwnerId(req), req.body));
  } catch (e) {
    next(e);
  }
};

export const updateExpensePayment = async (
  req: Request<PaymentParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(
      await service.updateExpensePayment(req.params.paymentId, getWeddingOwnerId(req), req.body),
    );
  } catch (e) {
    next(e);
  }
};

export const deleteExpensePayment = async (
  req: Request<PaymentParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await service.deleteExpensePayment(req.params.paymentId, getWeddingOwnerId(req));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};

// ---------------------------------------------------------------------------
// Payments / outstanding / alerts
// ---------------------------------------------------------------------------

export const getPayments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getPayments(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getOutstanding = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await service.getOutstanding(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await service.getAlerts(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

// ---------------------------------------------------------------------------
// Vendor expense (served under /expense/vendors/*)
// ---------------------------------------------------------------------------

export const getVendorExpenseSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Delegates to vendors service via expense — re-imported to keep routing clean
    const { getVendorExpenseSummary } = await import('../services/vendors.service');
    res.json(await getVendorExpenseSummary(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};

export const getVendorsBySide = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { getVendorsBySide } = await import('../services/vendors.service');
    res.json(await getVendorsBySide(getWeddingOwnerId(req)));
  } catch (e) {
    next(e);
  }
};
