import { DEFAULT_CATEGORY_TREE } from '../constants/enums';
import type { ExpenseCategoryInsert, ExpenseInsert } from '@wedding-planner/shared';
import * as repo from '../repositories/expense.repository';
import type { ExpenseFilters } from '../repositories/expense.repository';

const toFloat = (v: unknown) => parseFloat(String(v ?? 0));

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export async function getExpenseSummary(ownerId: string) {
  const [expense, expenses, vendorPaymentsTotal] = await Promise.all([
    repo.findSummaryByOwner(ownerId),
    repo.findExpensesAmountWithSharedByOwner(ownerId),
    repo.findActualPaymentsTotalByOwner(ownerId),
  ]);

  // Bug 6 fix: totalSpent includes both expense records AND actual vendor/venue payments
  const expenseTotal = expenses.reduce((s, e) => s + toFloat(e.amount), 0);
  const totalSpent = expenseTotal + vendorPaymentsTotal;

  // Bug 3 fix: shared expenses are split proportionally between bride and groom
  let brideSpent = 0;
  let groomSpent = 0;
  expenses.forEach((e) => {
    const amount = toFloat(e.amount);
    if (e.is_shared) {
      const pct = toFloat((e as { share_percentage?: unknown }).share_percentage ?? 50);
      brideSpent += amount * (pct / 100);
      groomSpent += amount * ((100 - pct) / 100);
    } else if (e.side === 'bride') {
      brideSpent += amount;
    } else if (e.side === 'groom') {
      groomSpent += amount;
    }
  });

  return {
    totalExpense: toFloat(expense?.total_expense),
    brideContribution: toFloat(expense?.bride_side_contribution),
    groomContribution: toFloat(expense?.groom_side_contribution),
    totalSpent,
    vendorPaymentsTotal,
    brideSpent,
    groomSpent,
    remaining: toFloat(expense?.total_expense) - totalSpent,
  };
}

export async function updateTotalExpense(
  ownerId: string,
  payload: {
    total_expense?: number;
    bride_side_contribution?: number;
    groom_side_contribution?: number;
  },
) {
  return repo.upsertSummary(ownerId, payload);
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export async function getExpenseOverview(ownerId: string) {
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
  // is_shared expenses should not appear under bride/groom exclusively
  const brideExpenses = expenses.filter((e) => !e.is_shared && e.side === 'bride');
  const groomExpenses = expenses.filter((e) => !e.is_shared && e.side === 'groom');
  const sharedExpenses = expenses.filter((e) => e.is_shared);

  // Bug 4 fix: bride/groom totals include their proportional share of shared expenses
  const sharedBrideTotal = sharedExpenses.reduce((s, e) => {
    const pct = toFloat((e as { share_percentage?: unknown }).share_percentage ?? 50);
    return s + toFloat(e.amount) * (pct / 100);
  }, 0);
  const sharedGroomTotal = sharedExpenses.reduce((s, e) => {
    const pct = toFloat((e as { share_percentage?: unknown }).share_percentage ?? 50);
    return s + toFloat(e.amount) * ((100 - pct) / 100);
  }, 0);

  return {
    bride: {
      expenses: brideExpenses,
      total: brideExpenses.reduce((s, e) => s + toFloat(e.amount), 0) + sharedBrideTotal,
    },
    groom: {
      expenses: groomExpenses,
      total: groomExpenses.reduce((s, e) => s + toFloat(e.amount), 0) + sharedGroomTotal,
    },
    shared: {
      expenses: sharedExpenses,
      total: sharedExpenses.reduce((s, e) => s + toFloat(e.amount), 0),
    },
  };
}

export async function getSideSummary(ownerId: string) {
  // Bug 5 fix: vendor costs removed to avoid double-counting with expense records.
  // Vendor total_cost is the contract value; actual spending is tracked through payments
  // (on the Vendors page) and expense records (on the Expense page).
  const expenses = await repo.findExpensesForSideSummary(ownerId);

  const summary = {
    bride: { expenses: 0, sharedExpenses: 0, total: 0 },
    groom: { expenses: 0, sharedExpenses: 0, total: 0 },
    shared: { expenses: 0, total: 0 },
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

  summary.bride.total = summary.bride.expenses + summary.bride.sharedExpenses;
  summary.groom.total = summary.groom.expenses + summary.groom.sharedExpenses;
  summary.shared.total = summary.shared.expenses;

  return summary;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function listCategories(ownerId: string) {
  return repo.findCategoriesByOwner(ownerId);
}

export async function createCategory(
  payload: Omit<ExpenseCategoryInsert, 'user_id'>,
  ownerId: string,
) {
  return repo.insertCategory({ ...payload, user_id: ownerId });
}

export async function updateCategory(
  id: string,
  ownerId: string,
  payload: Partial<ExpenseCategoryInsert>,
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

  if (existing.length === 0) {
    // New user: seed the full two-level tree
    for (let i = 0; i < DEFAULT_CATEGORY_TREE.length; i++) {
      const entry = DEFAULT_CATEGORY_TREE[i]!;
      const parent = await repo.insertCategory({
        name: entry.name,
        user_id: ownerId,
        display_order: i + 1,
        allocated_amount: 0,
      });
      for (let j = 0; j < entry.children.length; j++) {
        await repo.insertCategory({
          name: entry.children[j]!,
          parent_category_id: parent.id,
          user_id: ownerId,
          display_order: j + 1,
          allocated_amount: 0,
        });
      }
    }
    return;
  }

  // Existing user: backfill subcategories for any parent that has none yet.
  // This migrates users who were seeded with the old flat-12 list.
  const parents = existing.filter((c) => !c.parent_category_id);
  const childIds = new Set(existing.filter((c) => c.parent_category_id).map((c) => c.parent_category_id));

  for (const entry of DEFAULT_CATEGORY_TREE) {
    const parent = parents.find((p) => p.name === entry.name);
    if (!parent) continue; // Not in this user's list
    if (childIds.has(parent.id)) continue; // Already has subcategories

    for (let j = 0; j < entry.children.length; j++) {
      await repo.insertCategory({
        name: entry.children[j]!,
        parent_category_id: parent.id,
        user_id: ownerId,
        display_order: j + 1,
        allocated_amount: 0,
      });
    }
  }
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
    const name = (e.expense_categories as any)?.name ?? 'Uncategorized';
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

// ---------------------------------------------------------------------------
// Payments timeline
// ---------------------------------------------------------------------------

export async function getPayments(ownerId: string) {
  return repo.findPaymentsByOwner(ownerId);
}

// ---------------------------------------------------------------------------
// Outstanding balances (vendor total_cost minus actual payments)
// ---------------------------------------------------------------------------

export async function getOutstanding(ownerId: string) {
  const [vendors, venues, vendorPaid, venuePaid] = await Promise.all([
    repo.findVendorsForOutstanding(ownerId),
    repo.findVenuesForOutstanding(ownerId),
    repo.findVendorPaymentSumsForOutstanding(ownerId),
    repo.findVenuePaymentSumsForOutstanding(ownerId),
  ]);

  const vendorOutstanding = vendors.map((v) => {
    const paid = vendorPaid[v.id] ?? 0;
    const outstanding = toFloat(v.total_cost) - paid;
    return {
      id: v.id,
      name: v.name,
      type: 'vendor' as const,
      side: v.side,
      totalCost: toFloat(v.total_cost),
      paid,
      outstanding,
    };
  });

  const venueOutstanding = venues.map((v) => {
    const paid = venuePaid[v.id] ?? 0;
    const outstanding = toFloat(v.total_cost) - paid;
    return {
      id: v.id,
      name: v.name,
      type: 'venue' as const,
      side: null,
      totalCost: toFloat(v.total_cost),
      paid,
      outstanding,
    };
  });

  const all = [...vendorOutstanding, ...venueOutstanding];
  const totalOutstanding = all.reduce((s, x) => s + Math.max(0, x.outstanding), 0);

  return { items: all, totalOutstanding };
}

// ---------------------------------------------------------------------------
// Alerts: overdue/upcoming payments + over-budget categories
// ---------------------------------------------------------------------------

export async function getAlerts(ownerId: string) {
  const [overdue, upcoming, categories, expenses] = await Promise.all([
    repo.findOverduePlannedPayments(ownerId),
    repo.findUpcomingPlannedPayments(ownerId, 7),
    repo.findCategoriesByOwner(ownerId),
    repo.findExpensesForCategoryGrouping(ownerId),
  ]);

  const spending: Record<string, number> = {};
  expenses.forEach((e) => {
    if (e.category_id) spending[e.category_id] = (spending[e.category_id] ?? 0) + toFloat(e.amount);
  });

  const overBudgetCategories = categories
    .filter(
      (cat) =>
        toFloat(cat.allocated_amount) > 0 &&
        (spending[cat.id] ?? 0) > toFloat(cat.allocated_amount),
    )
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      allocated: toFloat(cat.allocated_amount),
      spent: spending[cat.id] ?? 0,
      overBy: (spending[cat.id] ?? 0) - toFloat(cat.allocated_amount),
    }));

  const nearBudgetCategories = categories
    .filter((cat) => {
      const alloc = toFloat(cat.allocated_amount);
      const spent = spending[cat.id] ?? 0;
      return alloc > 0 && spent <= alloc && spent / alloc >= 0.8;
    })
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      allocated: toFloat(cat.allocated_amount),
      spent: spending[cat.id] ?? 0,
      percentage: Math.round(((spending[cat.id] ?? 0) / toFloat(cat.allocated_amount)) * 100),
    }));

  const overdueTotal = overdue.reduce((s, p) => s + toFloat(p.amount), 0);
  const upcomingTotal = upcoming.reduce((s, p) => s + toFloat(p.amount), 0);

  return {
    overduePayments: overdue,
    overdueCount: overdue.length,
    overdueTotal,
    upcomingPayments: upcoming,
    upcomingCount: upcoming.length,
    upcomingTotal,
    overBudgetCategories,
    nearBudgetCategories,
  };
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
