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
router.post('/categories', budgetController.createCategory);
router.put('/categories/:id', budgetController.updateCategory);

// Expenses
router.get('/expenses', budgetController.getExpenses);
router.get('/expenses/:id', budgetController.getExpenseById);
router.post('/expenses', budgetController.createExpense);
router.put('/expenses/:id', budgetController.updateExpense);
router.delete('/expenses/:id', budgetController.deleteExpense);
router.get('/expenses/by-category', budgetController.getExpensesByCategory);
router.get('/expenses/by-vendor', budgetController.getExpensesByVendor);

// Payments
router.get('/payments', budgetController.getPayments);
router.get('/payments/pending', budgetController.getPendingPayments);
router.post('/payments', budgetController.createPayment);
router.put('/payments/:id', budgetController.updatePayment);
router.delete('/payments/:id', budgetController.deletePayment);

module.exports = router;
