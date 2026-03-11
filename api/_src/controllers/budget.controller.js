const { supabase } = require('../config/database');
const { validateRequiredFields, createValidationError } = require('../utils/validation');
const { getWeddingOwnerId } = require('../utils/auth');

const getSummary = async (req, res, next) => {
  try {
    const ownerId = getWeddingOwnerId(req);

    const { data: budget, error: budgetError } = await supabase
      .from('budget_summary')
      .select('*')
      .eq('user_id', ownerId)
      .single();

    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select('amount, side')
      .eq('user_id', ownerId);

    const totalSpent = expenses?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
    const brideSpent = expenses?.filter(e => e.side === 'bride').reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
    const groomSpent = expenses?.filter(e => e.side === 'groom').reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

    res.json({
      totalBudget: budget?.total_budget || 0,
      brideContribution: budget?.bride_side_contribution || 0,
      groomContribution: budget?.groom_side_contribution || 0,
      totalSpent,
      brideSpent,
      groomSpent,
      remaining: (budget?.total_budget || 0) - totalSpent,
    });
  } catch (error) {
    next(error);
  }
};

const getOverview = async (req, res, next) => {
  try {
    const ownerId = getWeddingOwnerId(req);

    const { data: categories, error: catError } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', ownerId)
      .order('display_order', { ascending: true });

    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('category_id, amount')
      .eq('user_id', ownerId);

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
    const ownerId = getWeddingOwnerId(req);

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*, budget_categories(name)')
      .eq('user_id', ownerId)
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
    const ownerId = getWeddingOwnerId(req);

    const { data, error } = await supabase
      .from('budget_summary')
      .upsert({
        user_id: ownerId,
        total_budget,
        bride_side_contribution,
        groom_side_contribution
      }, { onConflict: 'user_id' })
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
    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', ownerId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const validation = validateRequiredFields(req.body, ['name']);
    if (!validation.isValid) {
      return res.status(400).json(createValidationError(validation.missingFields));
    }

    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('budget_categories')
      .insert([{ ...req.body, user_id: ownerId }])
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
    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('budget_categories')
      .update(req.body)
      .eq('id', id)
      .eq('user_id', ownerId)
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
    const ownerId = getWeddingOwnerId(req);

    let query = supabase
      .from('expenses')
      .select('*, budget_categories(name), vendors(name), events(name)')
      .eq('user_id', ownerId);

    if (category_id) query = query.eq('category_id', category_id);
    if (vendor_id) query = query.eq('vendor_id', vendor_id);
    if (event_id) query = query.eq('event_id', event_id);
    if (side) query = query.eq('side', side);

    const { data, error } = await query.order('expense_date', { ascending: false });

    if (error) throw error;

    const enriched = (data || []).map(expense => {
      const total = parseFloat(expense.amount || 0);
      const paid = expense.paid_amount !== null && expense.paid_amount !== undefined
        ? parseFloat(expense.paid_amount)
        : total;
      return {
        ...expense,
        paidAmount: paid,
        remainingAmount: total - paid,
      };
    });

    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

const getExpenseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('expenses')
      .select('*, budget_categories(*), vendors(*), events(*)')
      .eq('id', id)
      .eq('user_id', ownerId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const createExpense = async (req, res, next) => {
  try {
    const validation = validateRequiredFields(req.body, ['description', 'amount', 'expense_date']);
    if (!validation.isValid) {
      return res.status(400).json(createValidationError(validation.missingFields));
    }

    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('expenses')
      .insert([{ ...req.body, user_id: ownerId }])
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
    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('expenses')
      .update(req.body)
      .eq('id', id)
      .eq('user_id', ownerId)
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
    const ownerId = getWeddingOwnerId(req);
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', ownerId);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getExpensesByCategory = async (req, res, next) => {
  try {
    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('expenses')
      .select('category_id, amount, budget_categories(name)')
      .eq('user_id', ownerId);

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
    const ownerId = getWeddingOwnerId(req);
    const { data, error } = await supabase
      .from('expenses')
      .select('vendor_id, amount, vendors(name)')
      .eq('user_id', ownerId);

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

const getVendorBudgetSummary = async (req, res, next) => {
  try {
    const ownerId = getWeddingOwnerId(req);
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select('id, name, category, total_cost, side, is_shared, is_confirmed')
      .eq('user_id', ownerId)
      .order('name', { ascending: true });

    if (vendorError) throw vendorError;

    const vendorSummary = vendors?.map(vendor => {
      const totalCost = parseFloat(vendor.total_cost || 0);
      return {
        ...vendor,
        totalCost,
      };
    });

    res.json(vendorSummary || []);
  } catch (error) {
    next(error);
  }
};

const getVendorsBySide = async (req, res, next) => {
  try {
    const ownerId = getWeddingOwnerId(req);
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select('id, name, category, total_cost, side, is_shared, is_confirmed')
      .eq('user_id', ownerId)
      .order('name', { ascending: true });

    if (vendorError) throw vendorError;

    const result = {
      bride: { vendors: [], totalCost: 0 },
      groom: { vendors: [], totalCost: 0 },
      mutual: { vendors: [], totalCost: 0 }
    };

    vendors?.forEach(vendor => {
      const totalCost = parseFloat(vendor.total_cost || 0);
      const vendorData = { ...vendor, totalCost };
      const side = vendor.side || 'mutual';
      result[side].vendors.push(vendorData);
      result[side].totalCost += totalCost;
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getSideSummary = async (req, res, next) => {
  try {
    const ownerId = getWeddingOwnerId(req);

    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select('amount, side, is_shared, share_percentage')
      .eq('user_id', ownerId);

    if (expenseError) throw expenseError;

    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select('total_cost, side, is_shared')
      .eq('user_id', ownerId);

    if (vendorError) throw vendorError;

    const summary = {
      bride: {
        expenses: 0,
        vendorCosts: 0,
        sharedExpenses: 0,
        total: 0
      },
      groom: {
        expenses: 0,
        vendorCosts: 0,
        sharedExpenses: 0,
        total: 0
      },
      shared: {
        expenses: 0,
        vendorCosts: 0,
        total: 0
      }
    };

    expenses?.forEach(exp => {
      const amount = parseFloat(exp.amount || 0);
      if (exp.is_shared) {
        summary.shared.expenses += amount;
        const sharePercent = parseFloat(exp.share_percentage || 50);
        summary.bride.sharedExpenses += amount * (sharePercent / 100);
        summary.groom.sharedExpenses += amount * ((100 - sharePercent) / 100);
      } else if (exp.side === 'bride') {
        summary.bride.expenses += amount;
      } else if (exp.side === 'groom') {
        summary.groom.expenses += amount;
      }
    });

    vendors?.forEach(v => {
      const cost = parseFloat(v.total_cost || 0);
      if (v.side === 'bride') {
        summary.bride.vendorCosts += cost;
      } else if (v.side === 'groom') {
        summary.groom.vendorCosts += cost;
      } else {
        summary.shared.vendorCosts += cost;
      }
    });

    summary.bride.total = summary.bride.expenses + summary.bride.vendorCosts + summary.bride.sharedExpenses;
    summary.groom.total = summary.groom.expenses + summary.groom.vendorCosts + summary.groom.sharedExpenses;
    summary.shared.total = summary.shared.expenses + summary.shared.vendorCosts;

    res.json(summary);
  } catch (error) {
    next(error);
  }
};

const getCategoryTree = async (req, res, next) => {
  try {
    const ownerId = getWeddingOwnerId(req);

    const { data: allCategories, error } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', ownerId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    const { data: expenses } = await supabase
      .from('expenses')
      .select('category_id, amount')
      .eq('user_id', ownerId);

    const categorySpending = {};
    expenses?.forEach(exp => {
      if (!categorySpending[exp.category_id]) {
        categorySpending[exp.category_id] = 0;
      }
      categorySpending[exp.category_id] += parseFloat(exp.amount || 0);
    });

    const parents = allCategories?.filter(cat => !cat.parent_category_id) || [];
    const children = allCategories?.filter(cat => cat.parent_category_id) || [];

    const categoryTree = parents.map(parent => {
      const parentChildren = children.filter(child => child.parent_category_id === parent.id);

      const childrenWithSpent = parentChildren.map(child => ({
        ...child,
        spent: categorySpending[child.id] || 0,
        remaining: (child.allocated_amount || 0) - (categorySpending[child.id] || 0),
        percentage: child.allocated_amount > 0
          ? Math.round((categorySpending[child.id] || 0) / child.allocated_amount * 100)
          : 0
      }));

      const parentSpent = (categorySpending[parent.id] || 0) +
        childrenWithSpent.reduce((sum, child) => sum + (child.spent || 0), 0);

      return {
        ...parent,
        spent: parentSpent,
        remaining: (parent.allocated_amount || 0) - parentSpent,
        percentage: parent.allocated_amount > 0
          ? Math.round(parentSpent / parent.allocated_amount * 100)
          : 0,
        children: childrenWithSpent.length > 0 ? childrenWithSpent : undefined
      };
    });

    res.json(categoryTree);
  } catch (error) {
    next(error);
  }
};

const createCustomCategory = async (req, res, next) => {
  try {
    const { name, parent_category_id, allocated_amount, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const ownerId = getWeddingOwnerId(req);

    if (parent_category_id) {
      const { data: parentCat, error: parentError } = await supabase
        .from('budget_categories')
        .select('id')
        .eq('id', parent_category_id)
        .eq('user_id', ownerId)
        .single();

      if (parentError || !parentCat) {
        return res.status(400).json({ error: 'Parent category not found' });
      }
    }

    const { data: categories } = await supabase
      .from('budget_categories')
      .select('display_order')
      .eq('user_id', ownerId)
      .eq('parent_category_id', parent_category_id || null)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextDisplayOrder = categories && categories.length > 0
      ? (categories[0].display_order || 0) + 1
      : 1;

    const { data: newCategory, error } = await supabase
      .from('budget_categories')
      .insert({
        name,
        parent_category_id: parent_category_id || null,
        allocated_amount: allocated_amount || 0,
        description: description || null,
        display_order: nextDisplayOrder,
        user_id: ownerId
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(newCategory);
  } catch (error) {
    next(error);
  }
};

const getExpensesByCategoryTree = async (req, res, next) => {
  try {
    const ownerId = getWeddingOwnerId(req);

    const { data: allCategories, error: catError } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', ownerId)
      .order('display_order', { ascending: true });

    if (catError) throw catError;

    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('*, budget_categories(id, name, parent_category_id)')
      .eq('user_id', ownerId)
      .order('expense_date', { ascending: false });

    if (expError) throw expError;

    const expensesByCategory = {};
    expenses?.forEach(expense => {
      const categoryId = expense.category_id;
      if (!expensesByCategory[categoryId]) {
        expensesByCategory[categoryId] = [];
      }
      expensesByCategory[categoryId].push(expense);
    });

    const parents = allCategories?.filter(cat => !cat.parent_category_id) || [];
    const children = allCategories?.filter(cat => cat.parent_category_id) || [];

    const tree = parents.map(parent => {
      const parentChildren = children.filter(child => child.parent_category_id === parent.id);

      const childrenWithExpenses = parentChildren.map(child => ({
        ...child,
        expenses: expensesByCategory[child.id] || [],
        totalSpent: (expensesByCategory[child.id] || []).reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)
      }));

      const parentExpenses = expensesByCategory[parent.id] || [];
      const parentDirectSpent = parentExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);

      const childrenTotalSpent = childrenWithExpenses.reduce((sum, child) => sum + child.totalSpent, 0);
      const totalSpent = parentDirectSpent + childrenTotalSpent;

      return {
        ...parent,
        expenses: parentExpenses,
        directSpent: parentDirectSpent,
        totalSpent,
        children: childrenWithExpenses.length > 0 ? childrenWithExpenses : undefined
      };
    });

    res.json(tree);
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
  getVendorBudgetSummary,
  getVendorsBySide,
  getSideSummary,
  getCategoryTree,
  createCustomCategory,
  getExpensesByCategoryTree
};
