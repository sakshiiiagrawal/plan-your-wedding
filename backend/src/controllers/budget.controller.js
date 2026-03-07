const { supabase } = require('../config/database');
const { validateRequiredFields, createValidationError } = require('../utils/validation');

const getSummary = async (req, res, next) => {
  try {
    const { data: budget, error: budgetError } = await supabase
      .from('budget_summary')
      .select('*')
      .single();

    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select('amount, side');

    const { data: payments, error: paymentError } = await supabase
      .from('payments')
      .select('amount, status');

    const totalSpent = expenses?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
    const brideSpent = expenses?.filter(e => e.side === 'bride').reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
    const groomSpent = expenses?.filter(e => e.side === 'groom').reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
    const pendingPayments = payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

    res.json({
      totalBudget: budget?.total_budget || 0,
      brideContribution: budget?.bride_side_contribution || 0,
      groomContribution: budget?.groom_side_contribution || 0,
      totalSpent,
      brideSpent,
      groomSpent,
      remaining: (budget?.total_budget || 0) - totalSpent,
      pendingPayments
    });
  } catch (error) {
    next(error);
  }
};

const getOverview = async (req, res, next) => {
  try {
    const { data: categories, error: catError } = await supabase
      .from('budget_categories')
      .select('*')
      .order('display_order', { ascending: true });

    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('category_id, amount');

    // Calculate spent per category
    const categorySpending = {};
    expenses?.forEach(exp => {
      if (!categorySpending[exp.category_id]) {
        categorySpending[exp.category_id] = 0;
      }
      categorySpending[exp.category_id] += parseFloat(exp.amount);
    });

    const overview = categories?.map(cat => ({
      ...cat,
      spent: categorySpending[cat.id] || 0,
      remaining: cat.allocated_amount - (categorySpending[cat.id] || 0),
      percentage: cat.allocated_amount > 0
        ? Math.round((categorySpending[cat.id] || 0) / cat.allocated_amount * 100)
        : 0
    }));

    res.json(overview);
  } catch (error) {
    next(error);
  }
};

const getBySide = async (req, res, next) => {
  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*, budget_categories(name)')
      .order('expense_date', { ascending: false });

    if (error) throw error;

    const brideExpenses = expenses.filter(e => e.side === 'bride');
    const groomExpenses = expenses.filter(e => e.side === 'groom');
    const sharedExpenses = expenses.filter(e => e.is_shared);

    res.json({
      bride: {
        expenses: brideExpenses,
        total: brideExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
      },
      groom: {
        expenses: groomExpenses,
        total: groomExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
      },
      shared: {
        expenses: sharedExpenses,
        total: sharedExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateTotalBudget = async (req, res, next) => {
  try {
    const { total_budget, bride_side_contribution, groom_side_contribution } = req.body;

    // Upsert budget summary
    const { data, error } = await supabase
      .from('budget_summary')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001', // Fixed ID for single row
        total_budget,
        bride_side_contribution,
        groom_side_contribution
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('budget_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    // Validate required fields
    const validation = validateRequiredFields(req.body, ['name']);
    if (!validation.isValid) {
      return res.status(400).json(createValidationError(validation.missingFields));
    }

    const { data, error } = await supabase
      .from('budget_categories')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('budget_categories')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getExpenses = async (req, res, next) => {
  try {
    const { category_id, vendor_id, event_id, side } = req.query;

    let query = supabase
      .from('expenses')
      .select('*, budget_categories(name), vendors(name), events(name)');

    if (category_id) query = query.eq('category_id', category_id);
    if (vendor_id) query = query.eq('vendor_id', vendor_id);
    if (event_id) query = query.eq('event_id', event_id);
    if (side) query = query.eq('side', side);

    const { data, error } = await query.order('expense_date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getExpenseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('expenses')
      .select('*, budget_categories(*), vendors(*), events(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const createExpense = async (req, res, next) => {
  try {
    // Validate required fields
    const validation = validateRequiredFields(req.body, ['description', 'amount', 'expense_date']);
    if (!validation.isValid) {
      return res.status(400).json(createValidationError(validation.missingFields));
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('expenses')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getExpensesByCategory = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('category_id, amount, budget_categories(name)');

    if (error) throw error;

    const grouped = {};
    data.forEach(exp => {
      const catName = exp.budget_categories?.name || 'Uncategorized';
      if (!grouped[catName]) {
        grouped[catName] = 0;
      }
      grouped[catName] += parseFloat(exp.amount);
    });

    res.json(Object.entries(grouped).map(([name, total]) => ({ name, total })));
  } catch (error) {
    next(error);
  }
};

const getExpensesByVendor = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('vendor_id, amount, vendors(name)');

    if (error) throw error;

    const grouped = {};
    data.forEach(exp => {
      const vendorName = exp.vendors?.name || 'No Vendor';
      if (!grouped[vendorName]) {
        grouped[vendorName] = 0;
      }
      grouped[vendorName] += parseFloat(exp.amount);
    });

    res.json(Object.entries(grouped).map(([name, total]) => ({ name, total })));
  } catch (error) {
    next(error);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*, vendors(name), accommodations(name), venues(name)')
      .order('payment_date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getPendingPayments = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*, vendors(name), accommodations(name), venues(name)')
      .eq('status', 'pending')
      .order('payment_date', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const createPayment = async (req, res, next) => {
  try {
    // Validate required fields
    const validation = validateRequiredFields(req.body, ['amount', 'payment_date', 'payment_method']);
    if (!validation.isValid) {
      return res.status(400).json(createValidationError(validation.missingFields));
    }

    const { data, error } = await supabase
      .from('payments')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

const updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('payments')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const deletePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  getOverview,
  getBySide,
  updateTotalBudget,
  getCategories,
  createCategory,
  updateCategory,
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpensesByCategory,
  getExpensesByVendor,
  getPayments,
  getPendingPayments,
  createPayment,
  updatePayment,
  deletePayment
};
