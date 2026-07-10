import { Router } from 'express';
import { validateBody } from '../middleware/validate.middleware';
import {
  updateTotalExpenseSchema,
  createCategorySchema,
  updateCategorySchema,
  createCustomCategorySchema,
  createExpenseSchema,
  updateExpenseSchema,
  createExpensePaymentSchema,
  updateExpensePaymentSchema,
} from '../validators/expense.validator';
import * as ctrl from '../controllers/expense.controller';
import * as exportController from '../controllers/export.controller';
import { requirePermission } from '../middleware/access.middleware';

const router = Router();

// Overview
router.get('/', ctrl.getSummary);
router.get('/export', exportController.exportBudget);
router.get('/overview', ctrl.getOverview);
// Side data IS the payload here — the finance-visibility deep-strip can't
// help, so hard-403 for anyone without budget:splits.
router.get('/by-side', requirePermission('budget:splits'), ctrl.getBySide);
router.get('/side-summary', requirePermission('budget:splits'), ctrl.getSideSummary);
router.put('/total', validateBody(updateTotalExpenseSchema), ctrl.updateTotalExpense);

// Categories — specific paths before /:id
router.get('/categories/tree', ctrl.getCategoryTree);
router.get('/categories', ctrl.getCategories);
router.post('/categories', validateBody(createCategorySchema), ctrl.createCategory);
router.post(
  '/categories/custom',
  validateBody(createCustomCategorySchema),
  ctrl.createCustomCategory,
);
router.put('/categories/:id', validateBody(updateCategorySchema), ctrl.updateCategory);

// Expenses — specific paths before /:id
router.get('/expenses/by-category', ctrl.getExpensesByCategory);
router.get('/expenses/by-vendor', ctrl.getExpensesByVendor);
router.get('/expenses/by-category-tree', ctrl.getExpensesByCategoryTree);
router.get('/expenses', ctrl.getExpenses);
router.get('/expenses/:id', ctrl.getExpenseById);
router.post('/expenses', validateBody(createExpenseSchema), ctrl.createExpense);
router.put('/expenses/:id', validateBody(updateExpenseSchema), ctrl.updateExpense);
router.delete('/expenses/:id', ctrl.deleteExpense);
router.get('/expenses/:id/payments', ctrl.getExpensePayments);
router.post(
  '/expenses/:id/payments',
  validateBody(createExpensePaymentSchema),
  ctrl.createExpensePayment,
);
router.patch(
  '/payments/:paymentId',
  validateBody(updateExpensePaymentSchema),
  ctrl.updateExpensePayment,
);
router.delete('/payments/:paymentId', ctrl.deleteExpensePayment);

// Payments / outstanding / alerts
router.get('/payments', ctrl.getPayments);
router.get('/outstanding', ctrl.getOutstanding);
router.get('/alerts', ctrl.getAlerts);

// Vendor expense tracking
router.get('/vendors/summary', ctrl.getVendorExpenseSummary);
router.get('/vendors/by-side', requirePermission('budget:splits'), ctrl.getVendorsBySide);

export default router;
