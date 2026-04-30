import type {
  ExpenseCategoryInsert,
  ExpenseInsert,
  ExpenseItemRow,
  ExpenseSummaryInsert,
  ExpenseWithDetails,
  PaymentRow,
} from '@wedding-planner/shared';
import * as repo from '../repositories/expense.repository';
import * as finance from './finance.service';
import { ensureDefaultCategories } from './expense-categories.service';

const toFloat = (value: unknown) => parseFloat(String(value ?? 0));

export type ExpenseQueryFilters = finance.ExpenseQueryFilters;

function flattenExpenseItems(expenses: ExpenseWithDetails[]) {
  return expenses.flatMap((expense) =>
    expense.items.map((item) => ({
      ...item,
      expense_id: expense.id,
      expense_description: expense.description,
      expense_date: expense.expense_date,
      expense_status: expense.status,
      source_type: expense.source_type,
      source_id: expense.source_id,
      summary: expense.summary,
    })),
  );
}

function buildSideTotals(items: ExpenseItemRow[]) {
  const bride = { total: 0, items: [] as ExpenseItemRow[] };
  const groom = { total: 0, items: [] as ExpenseItemRow[] };
  const shared = { total: 0, items: [] as ExpenseItemRow[] };

  for (const item of items) {
    const amount = toFloat(item.amount);
    if (item.side === 'bride') {
      bride.total += amount;
      bride.items.push(item);
    } else if (item.side === 'groom') {
      groom.total += amount;
      groom.items.push(item);
    } else {
      shared.total += amount;
      shared.items.push(item);
      const bridePct = toFloat(item.bride_share_percentage ?? 50) / 100;
      bride.total += amount * bridePct;
      groom.total += amount * (1 - bridePct);
    }
  }

  return { bride, groom, shared };
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export async function getExpenseSummary(ownerId: string) {
  const [summary, totals] = await Promise.all([
    repo.findSummaryByOwner(ownerId),
    finance.getFinanceDashboardTotals(ownerId),
  ]);

  return {
    totalExpense: toFloat(summary?.total_expense),
    brideContribution: toFloat(summary?.bride_side_contribution),
    groomContribution: toFloat(summary?.groom_side_contribution),
    totalCommitted: totals.committed,
    totalPaid: totals.paid,
    totalOutstanding: totals.outstanding,
    remainingBudget: toFloat(summary?.total_expense) - totals.committed,
    totalSpent: totals.paid,
    remaining: toFloat(summary?.total_expense) - totals.paid,
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
  return repo.upsertSummary(ownerId, payload as Omit<ExpenseSummaryInsert, 'user_id'>);
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export async function getExpenseOverview(ownerId: string) {
  const [categories, rollups] = await Promise.all([
    repo.findCategoriesByOwner(ownerId),
    finance.getCategoryRollups(ownerId),
  ]);

  const spending = new Map(rollups.map((rollup) => [rollup.category_id, rollup]));

  return categories.map((cat) => {
    const rollup = spending.get(cat.id);
    const committed = rollup?.committed_amount ?? 0;
    return {
      ...cat,
      committed,
      paid: rollup?.paid_amount ?? 0,
      outstanding: rollup?.outstanding_amount ?? 0,
      spent: committed,
      remaining: toFloat(cat.allocated_amount) - committed,
      percentage:
        toFloat(cat.allocated_amount) > 0
          ? Math.round((committed / toFloat(cat.allocated_amount)) * 100)
          : 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Side breakdown
// ---------------------------------------------------------------------------

export async function getBySide(ownerId: string) {
  const expenses = await finance.listExpenses(ownerId);
  const items = flattenExpenseItems(expenses);
  return buildSideTotals(items);
}

export async function getSideSummary(ownerId: string) {
  const rollups = await finance.getSideLiabilityRollups(ownerId);
  const summary = {
    bride: { committed: 0, paid: 0, outstanding: 0, total: 0 },
    groom: { committed: 0, paid: 0, outstanding: 0, total: 0 },
    shared: { committed: 0, paid: 0, outstanding: 0, total: 0 },
  };

  for (const row of rollups) {
    summary[row.side] = {
      committed: row.committed_amount,
      paid: row.paid_amount,
      outstanding: row.outstanding_amount,
      total: row.committed_amount,
    };
  }

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

export async function getCategoryTree(ownerId: string) {
  await ensureDefaultCategories(ownerId);

  const [allCategories, rollups] = await Promise.all([
    repo.findCategoriesByOwner(ownerId),
    finance.getCategoryRollups(ownerId),
  ]);

  const spending = new Map(rollups.map((rollup) => [rollup.category_id, rollup]));
  const parents = allCategories.filter((category) => !category.parent_category_id);
  const children = allCategories.filter((category) => category.parent_category_id);

  return parents.map((parent) => {
    const parentChildren = children.filter((child) => child.parent_category_id === parent.id);
    const childRows = parentChildren.map((child) => {
      const rollup = spending.get(child.id);
      const committed = rollup?.committed_amount ?? 0;
      return {
        ...child,
        committed,
        paid: rollup?.paid_amount ?? 0,
        outstanding: rollup?.outstanding_amount ?? 0,
        spent: committed,
        remaining: toFloat(child.allocated_amount) - committed,
        percentage:
          toFloat(child.allocated_amount) > 0
            ? Math.round((committed / toFloat(child.allocated_amount)) * 100)
            : 0,
      };
    });

    const parentCommitted = childRows.reduce((sum, child) => sum + child.committed, 0);

    return {
      ...parent,
      committed: parentCommitted,
      paid: childRows.reduce((sum, child) => sum + child.paid, 0),
      outstanding: childRows.reduce((sum, child) => sum + child.outstanding, 0),
      spent: parentCommitted,
      remaining: toFloat(parent.allocated_amount) - parentCommitted,
      percentage:
        toFloat(parent.allocated_amount) > 0
          ? Math.round((parentCommitted / toFloat(parent.allocated_amount)) * 100)
          : 0,
      children: childRows.length > 0 ? childRows : undefined,
    };
  });
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export async function listExpenses(ownerId: string, filters: finance.ExpenseQueryFilters) {
  return finance.listExpenses(ownerId, filters);
}

export async function getExpense(id: string, ownerId: string) {
  return finance.getExpense(ownerId, id);
}

export async function createExpense(payload: Omit<ExpenseInsert, 'user_id'> & { items: finance.ExpenseWriteInput['items']; payments?: finance.PaymentMutationInput[] }, ownerId: string) {
  return finance.createManualExpense(ownerId, { ...payload, items: payload.items });
}

export async function updateExpense(
  id: string,
  ownerId: string,
  payload: Partial<finance.ExpenseWriteInput>,
) {
  return finance.updateExpense(ownerId, id, payload);
}

export async function deleteExpense(id: string, ownerId: string) {
  return finance.deleteExpense(ownerId, id);
}

export async function getExpensesByCategory(ownerId: string) {
  const [categories, rollups] = await Promise.all([
    repo.findCategoriesByOwner(ownerId),
    finance.getCategoryRollups(ownerId),
  ]);
  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
  return rollups.map((rollup) => ({
    id: rollup.category_id,
    name: categoryMap.get(rollup.category_id) ?? 'Uncategorized',
    committed: rollup.committed_amount,
    paid: rollup.paid_amount,
    outstanding: rollup.outstanding_amount,
    total: rollup.committed_amount,
  }));
}

export async function getExpensesByVendor(ownerId: string) {
  const expenses = await finance.listExpenses(ownerId, { source_type: 'vendor' });
  return expenses.map((expense) => ({
    id: expense.id,
    name: expense.description,
    committed: expense.summary.committed_amount,
    paid: expense.summary.paid_amount,
    outstanding: expense.summary.outstanding_amount,
    total: expense.summary.committed_amount,
  }));
}

// ---------------------------------------------------------------------------
// Payments timeline
// ---------------------------------------------------------------------------

export async function getPayments(ownerId: string) {
  const expenses = await finance.listExpenses(ownerId);
  const byExpense = new Map(expenses.map((expense) => [expense.id, expense]));
  return expenses
    .flatMap((expense) =>
      expense.payments.map((payment) => ({
        ...payment,
        expense: {
          id: expense.id,
          description: expense.description,
          source_type: expense.source_type,
          source_id: expense.source_id,
        },
      })),
    )
    .sort((a, b) => {
      const left = a.paid_date ?? a.due_date ?? a.created_at;
      const right = b.paid_date ?? b.due_date ?? b.created_at;
      return right.localeCompare(left);
    })
    .map((payment) => ({
      ...payment,
      expense_summary: byExpense.get(payment.expense.id)?.summary ?? null,
    }));
}

// ---------------------------------------------------------------------------
// Outstanding balances
// ---------------------------------------------------------------------------

export async function getOutstanding(ownerId: string) {
  const expenses = await finance.listExpenses(ownerId);
  const items = expenses
    .filter((expense) => expense.summary.outstanding_amount > 0)
    .map((expense) => ({
      id: expense.id,
      name: expense.description,
      type: expense.source_type,
      totalCost: expense.summary.committed_amount,
      paid: expense.summary.paid_amount,
      outstanding: expense.summary.outstanding_amount,
      expense_id: expense.id,
    }));

  return {
    items,
    totalOutstanding: items.reduce((sum, item) => sum + item.outstanding, 0),
  };
}

// ---------------------------------------------------------------------------
// Alerts: overdue/upcoming payments + over-budget categories
// ---------------------------------------------------------------------------

export async function getAlerts(ownerId: string) {
  const [scheduled, categories, rollups] = await Promise.all([
    finance.getScheduledPayments(ownerId),
    repo.findCategoriesByOwner(ownerId),
    finance.getCategoryRollups(ownerId),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().slice(0, 10);
  const spending = new Map(rollups.map((rollup) => [rollup.category_id, rollup]));

  const overBudgetCategories = categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      allocated: toFloat(category.allocated_amount),
      spent: spending.get(category.id)?.committed_amount ?? 0,
    }))
    .filter((category) => category.allocated > 0 && category.spent > category.allocated)
    .map((category) => ({
      ...category,
      overBy: category.spent - category.allocated,
    }));

  const nearBudgetCategories = categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      allocated: toFloat(category.allocated_amount),
      spent: spending.get(category.id)?.committed_amount ?? 0,
    }))
    .filter((category) => category.allocated > 0 && category.spent <= category.allocated && category.spent / category.allocated >= 0.8)
    .map((category) => ({
      ...category,
      percentage: Math.round((category.spent / category.allocated) * 100),
    }));

  const overdue = scheduled.filter((payment) => payment.due_date != null && payment.due_date < today);
  const upcoming = scheduled.filter(
    (payment) => payment.due_date != null && payment.due_date >= today && payment.due_date <= nextWeekStr,
  );

  return {
    overduePayments: overdue,
    overdueCount: overdue.length,
    overdueTotal: overdue.reduce((sum, payment) => sum + payment.amount, 0),
    upcomingPayments: upcoming,
    upcomingCount: upcoming.length,
    upcomingTotal: upcoming.reduce((sum, payment) => sum + payment.amount, 0),
    overBudgetCategories,
    nearBudgetCategories,
  };
}

export async function getExpensesByCategoryTree(ownerId: string) {
  const [allCategories, expenses] = await Promise.all([
    repo.findCategoriesByOwner(ownerId),
    finance.listExpenses(ownerId),
  ]);

  const items = flattenExpenseItems(expenses);
  const byCategory = new Map<string, typeof items>();
  for (const item of items) {
    const existing = byCategory.get(item.category_id) ?? [];
    existing.push(item);
    byCategory.set(item.category_id, existing);
  }

  const parents = allCategories.filter((category) => !category.parent_category_id);
  const children = allCategories.filter((category) => category.parent_category_id);

  return parents.map((parent) => {
    const parentChildren = children.filter((child) => child.parent_category_id === parent.id);
    const childrenWithExpenses = parentChildren.map((child) => {
      const childExpenses = byCategory.get(child.id) ?? [];
      return {
        ...child,
        expenses: childExpenses,
        totalSpent: childExpenses.reduce((sum, item) => sum + toFloat(item.amount), 0),
      };
    });

    const parentExpenses = byCategory.get(parent.id) ?? [];
    const parentDirectSpent = parentExpenses.reduce((sum, item) => sum + toFloat(item.amount), 0);
    const childrenTotalSpent = childrenWithExpenses.reduce((sum, child) => sum + child.totalSpent, 0);

    return {
      ...parent,
      expenses: parentExpenses,
      directSpent: parentDirectSpent,
      totalSpent: parentDirectSpent + childrenTotalSpent,
      children: childrenWithExpenses.length > 0 ? childrenWithExpenses : undefined,
    };
  });
}

export async function getExpensePayments(expenseId: string, ownerId: string): Promise<PaymentRow[]> {
  return finance.listExpensePayments(ownerId, expenseId);
}

export async function createExpensePayment(
  expenseId: string,
  ownerId: string,
  payload: finance.PaymentMutationInput,
) {
  return finance.createExpensePayment(ownerId, expenseId, payload);
}

export async function updateExpensePayment(
  paymentId: string,
  ownerId: string,
  payload: finance.PaymentMutationInput,
) {
  return finance.updateExpensePayment(ownerId, paymentId, payload);
}

export async function deleteExpensePayment(paymentId: string, ownerId: string) {
  return finance.deleteExpensePayment(ownerId, paymentId);
}
