import { Router } from 'express';
import { validateBody } from '../middleware/validate.middleware';
import {
  updateTotalExpenseSchema,
  createCategorySchema,
  updateCategorySchema,
  createCustomCategorySchema,
  createExpenseSchema,
  updateExpenseSchema,
} from '../validators/expense.validator';
import * as ctrl from '../controllers/expense.controller';

const router = Router();

// Overview
router.get('/', ctrl.getSummary);
router.get('/overview', ctrl.getOverview);
router.get('/by-side', ctrl.getBySide);
router.get('/side-summary', ctrl.getSideSummary);
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

// Payments / outstanding / alerts
router.get('/payments', ctrl.getPayments);
router.get('/outstanding', ctrl.getOutstanding);
router.get('/alerts', ctrl.getAlerts);

// Vendor expense tracking
router.get('/vendors/summary', ctrl.getVendorExpenseSummary);
router.get('/vendors/by-side', ctrl.getVendorsBySide);

export default router;
