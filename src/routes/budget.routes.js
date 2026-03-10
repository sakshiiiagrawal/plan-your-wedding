const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budget.controller');

// Budget overview
router.get('/', budgetController.getSummary);
router.get('/overview', budgetController.getOverview);
router.get('/by-side', budgetController.getBySide);
router.put('/total', budgetController.updateTotalBudget);

// Categories
router.get('/categories', budgetController.getCategories);
router.get('/categories/tree', budgetController.getCategoryTree);
router.post('/categories', budgetController.createCategory);
router.post('/categories/custom', budgetController.createCustomCategory);
router.put('/categories/:id', budgetController.updateCategory);

// Expenses
router.get('/expenses', budgetController.getExpenses);
router.get('/expenses/:id', budgetController.getExpenseById);
router.post('/expenses', budgetController.createExpense);
router.put('/expenses/:id', budgetController.updateExpense);
router.delete('/expenses/:id', budgetController.deleteExpense);
router.get('/expenses/by-category', budgetController.getExpensesByCategory);
router.get('/expenses/by-vendor', budgetController.getExpensesByVendor);
router.get('/expenses/by-category-tree', budgetController.getExpensesByCategoryTree);

// Vendor Budget Tracking
router.get('/vendors/summary', budgetController.getVendorBudgetSummary);
router.get('/vendors/by-side', budgetController.getVendorsBySide);
router.get('/side-summary', budgetController.getSideSummary);

module.exports = router;
