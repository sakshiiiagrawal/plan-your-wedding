import { BUDGET_CATEGORIES } from '@wedding-planner/shared';
import type { BudgetCategoryInsert, ExpenseInsert } from '@wedding-planner/shared';
import * as repo from '../repositories/budget.repository';
import type { ExpenseFilters } from '../repositories/budget.repository';

const toFloat = (v: unknown) => parseFloat(String(v ?? 0));

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export async function getBudgetSummary(ownerId: string) {
  const [budget, expenses] = await Promise.all([
    repo.findSummaryByOwner(ownerId),
    repo.findExpensesAmountByOwner(ownerId),
  ]);

  const totalSpent = expenses.reduce((s, e) => s + toFloat(e.amount), 0);
  const brideSpent = expenses
    .filter((e) => e.side === 'bride')
    .reduce((s, e) => s + toFloat(e.amount), 0);
  const groomSpent = expenses
    .filter((e) => e.side === 'groom')
    .reduce((s, e) => s + toFloat(e.amount), 0);

  return {
    totalBudget: toFloat(budget?.total_budget),
    brideContribution: toFloat(budget?.bride_side_contribution),
    groomContribution: toFloat(budget?.groom_side_contribution),
    totalSpent,
    brideSpent,
    groomSpent,
    remaining: toFloat(budget?.total_budget) - totalSpent,
  };
}

export async function updateTotalBudget(
  ownerId: string,
  payload: {
    total_budget?: number;
    bride_side_contribution?: number;
    groom_side_contribution?: number;
  },
) {
  return repo.upsertSummary(ownerId, payload);
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export async function getBudgetOverview(ownerId: string) {
  const [categories, expenses] = await Promise.all([
    repo.findCategoriesByOwner(ownerId),
    repo.findExpensesForCategoryGrouping(ownerId),
  ]);

  const spending: Record<string, number> = {};
  expenses.forEach((e) => {
    if (e.category_id) spending[e.category_id] = (spending[e.category_id] ?? 0) + toFloat(e.amount);
  });

  return categories.map((cat) => ({
    ...cat,
    spent: spending[cat.id] ?? 0,
    remaining: toFloat(cat.allocated_amount) - (spending[cat.id] ?? 0),
    percentage:
      toFloat(cat.allocated_amount) > 0
        ? Math.round(((spending[cat.id] ?? 0) / toFloat(cat.allocated_amount)) * 100)
        : 0,
  }));
}

// ---------------------------------------------------------------------------
// Side breakdown
// ---------------------------------------------------------------------------

export async function getBySide(ownerId: string) {
  const expenses = await repo.findExpensesBySideDetail(ownerId);
  const brideExpenses = expenses.filter((e) => e.side === 'bride');
  const groomExpenses = expenses.filter((e) => e.side === 'groom');
  const sharedExpenses = expenses.filter((e) => e.is_shared);
  return {
    bride: {
      expenses: brideExpenses,
      total: brideExpenses.reduce((s, e) => s + toFloat(e.amount), 0),
    },
    groom: {
      expenses: groomExpenses,
      total: groomExpenses.reduce((s, e) => s + toFloat(e.amount), 0),
    },
    shared: {
      expenses: sharedExpenses,
      total: sharedExpenses.reduce((s, e) => s + toFloat(e.amount), 0),
    },
  };
}

export async function getSideSummary(ownerId: string) {
  const [expenses, vendors] = await Promise.all([
    repo.findExpensesForSideSummary(ownerId),
    repo.findVendorCostsForSideSummary(ownerId),
  ]);

  const summary = {
    bride: { expenses: 0, vendorCosts: 0, sharedExpenses: 0, total: 0 },
    groom: { expenses: 0, vendorCosts: 0, sharedExpenses: 0, total: 0 },
    shared: { expenses: 0, vendorCosts: 0, total: 0 },
  };

  expenses.forEach((e) => {
    const amount = toFloat(e.amount);
    if (e.is_shared) {
      summary.shared.expenses += amount;
      const pct = toFloat(e.share_percentage ?? 50);
      summary.bride.sharedExpenses += amount * (pct / 100);
      summary.groom.sharedExpenses += amount * ((100 - pct) / 100);
    } else if (e.side === 'bride') {
      summary.bride.expenses += amount;
    } else if (e.side === 'groom') {
      summary.groom.expenses += amount;
    }
  });

  vendors.forEach((v) => {
    const cost = toFloat(v.total_cost);
    if (v.side === 'bride') summary.bride.vendorCosts += cost;
    else if (v.side === 'groom') summary.groom.vendorCosts += cost;
    else summary.shared.vendorCosts += cost;
  });

  summary.bride.total =
    summary.bride.expenses + summary.bride.vendorCosts + summary.bride.sharedExpenses;
  summary.groom.total =
    summary.groom.expenses + summary.groom.vendorCosts + summary.groom.sharedExpenses;
  summary.shared.total = summary.shared.expenses + summary.shared.vendorCosts;

  return summary;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function listCategories(ownerId: string) {
  return repo.findCategoriesByOwner(ownerId);
}

export async function createCategory(
  payload: Omit<BudgetCategoryInsert, 'user_id'>,
  ownerId: string,
) {
  return repo.insertCategory({ ...payload, user_id: ownerId });
}

export async function updateCategory(
  id: string,
  ownerId: string,
  payload: Partial<BudgetCategoryInsert>,
) {
  return repo.updateCategory(id, ownerId, payload);
}

export async function createCustomCategory(
  ownerId: string,
  body: {
    name: string;
    parent_category_id?: string | null;
    allocated_amount?: number;
    description?: string | null;
  },
) {
  if (body.parent_category_id) {
    const parent = await repo.findCategoryByIdAndOwner(body.parent_category_id, ownerId);
    if (!parent) return { error: 'Parent category not found' } as const;
  }

  const displayOrder = await repo.findMaxDisplayOrder(ownerId, body.parent_category_id ?? null);

  return repo.insertCategory({
    name: body.name,
    parent_category_id: body.parent_category_id ?? null,
    allocated_amount: body.allocated_amount ?? 0,
    description: body.description ?? null,
    display_order: displayOrder,
    user_id: ownerId,
  });
}

async function ensureDefaultCategories(ownerId: string): Promise<void> {
  const existing = await repo.findCategoriesByOwner(ownerId);
  if (existing.length > 0) return;

  const defaults = BUDGET_CATEGORIES.map((name, i) => ({
    name,
    user_id: ownerId,
    display_order: i + 1,
    allocated_amount: 0,
  }));
  await Promise.all(defaults.map((cat) => repo.insertCategory(cat)));
}

export async function getCategoryTree(ownerId: string) {
  await ensureDefaultCategories(ownerId);

  const [allCategories, expenses] = await Promise.all([
    repo.findCategoriesByOwner(ownerId),
    repo.findExpensesForCategoryGrouping(ownerId),
  ]);

  const spending: Record<string, number> = {};
  expenses.forEach((e) => {
    if (e.category_id) spending[e.category_id] = (spending[e.category_id] ?? 0) + toFloat(e.amount);
  });

  const parents = allCategories.filter((c) => !c.parent_category_id);
  const children = allCategories.filter((c) => c.parent_category_id);

  return parents.map((parent) => {
    const parentChildren = children.filter((c) => c.parent_category_id === parent.id);

    const childrenWithSpent = parentChildren.map((child) => ({
      ...child,
      spent: spending[child.id] ?? 0,
      remaining: toFloat(child.allocated_amount) - (spending[child.id] ?? 0),
      percentage:
        toFloat(child.allocated_amount) > 0
          ? Math.round(((spending[child.id] ?? 0) / toFloat(child.allocated_amount)) * 100)
          : 0,
    }));

    const parentSpent =
      (spending[parent.id] ?? 0) + childrenWithSpent.reduce((s, c) => s + c.spent, 0);

    return {
      ...parent,
      spent: parentSpent,
      remaining: toFloat(parent.allocated_amount) - parentSpent,
      percentage:
        toFloat(parent.allocated_amount) > 0
          ? Math.round((parentSpent / toFloat(parent.allocated_amount)) * 100)
          : 0,
      children: childrenWithSpent.length > 0 ? childrenWithSpent : undefined,
    };
  });
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export async function listExpenses(ownerId: string, filters: ExpenseFilters) {
  const data = await repo.findExpensesByOwner(ownerId, filters);
  return data.map((e) => {
    const total = toFloat(e.amount);
    const paid = e.paid_amount != null ? toFloat(e.paid_amount) : total;
    return { ...e, paidAmount: paid, remainingAmount: total - paid };
  });
}

export async function getExpense(id: string, ownerId: string) {
  return repo.findExpenseByIdAndOwner(id, ownerId);
}

export async function createExpense(payload: Omit<ExpenseInsert, 'user_id'>, ownerId: string) {
  return repo.insertExpense({ ...payload, user_id: ownerId });
}

export async function updateExpense(id: string, ownerId: string, payload: Partial<ExpenseInsert>) {
  return repo.updateExpense(id, ownerId, payload);
}

export async function deleteExpense(id: string, ownerId: string) {
  return repo.deleteExpense(id, ownerId);
}

export async function getExpensesByCategory(ownerId: string) {
  const data = await repo.findExpensesForCategoryGrouping(ownerId);
  const grouped: Record<string, number> = {};
  data.forEach((e) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const name = (e.budget_categories as any)?.name ?? 'Uncategorized';
    grouped[name] = (grouped[name] ?? 0) + toFloat(e.amount);
  });
  return Object.entries(grouped).map(([name, total]) => ({ name, total }));
}

export async function getExpensesByVendor(ownerId: string) {
  const data = await repo.findExpensesForVendorGrouping(ownerId);
  const grouped: Record<string, number> = {};
  data.forEach((e) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const name = (e.vendors as any)?.name ?? 'No Vendor';
    grouped[name] = (grouped[name] ?? 0) + toFloat(e.amount);
  });
  return Object.entries(grouped).map(([name, total]) => ({ name, total }));
}

export async function getExpensesByCategoryTree(ownerId: string) {
  const [allCategories, expenses] = await Promise.all([
    repo.findCategoriesByOwner(ownerId),
    repo.findExpensesWithCategoryTree(ownerId),
  ]);

  const byCategory: Record<string, typeof expenses> = {};
  expenses.forEach((e) => {
    if (e.category_id) {
      if (!byCategory[e.category_id]) byCategory[e.category_id] = [];
      byCategory[e.category_id]!.push(e);
    }
  });

  const parents = allCategories.filter((c) => !c.parent_category_id);
  const children = allCategories.filter((c) => c.parent_category_id);

  return parents.map((parent) => {
    const parentChildren = children.filter((c) => c.parent_category_id === parent.id);
    const childrenWithExpenses = parentChildren.map((child) => {
      const childExpenses = byCategory[child.id] ?? [];
      return {
        ...child,
        expenses: childExpenses,
        totalSpent: childExpenses.reduce((s, e) => s + toFloat(e.amount), 0),
      };
    });

    const parentExpenses = byCategory[parent.id] ?? [];
    const parentDirectSpent = parentExpenses.reduce((s, e) => s + toFloat(e.amount), 0);
    const childrenTotalSpent = childrenWithExpenses.reduce((s, c) => s + c.totalSpent, 0);

    return {
      ...parent,
      expenses: parentExpenses,
      directSpent: parentDirectSpent,
      totalSpent: parentDirectSpent + childrenTotalSpent,
      children: childrenWithExpenses.length > 0 ? childrenWithExpenses : undefined,
    };
  });
}
