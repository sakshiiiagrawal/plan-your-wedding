import type {
  ExpenseCategoryInsert,
  ExpenseInsert,
  ExpenseItemRow,
  ExpenseSummaryInsert,
  ExpenseWithDetails,
  PaymentRow,
  PaymentAttachmentRow,
  Paginated,
} from '../../../shared/src';
import * as repo from '../repositories/expense.repository';
import * as finance from './finance.service';
import * as paymentAttachments from './payment-attachment.service';
import { ensureDefaultCategories } from './expense-categories.service';
import { resolvePagination, paginate } from '../shared/utils/pagination.utils';

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

/**
 * A parent category's Allocated is always the sum of its children's, so its
 * Budget has to be summed the same way or every parent row compares a
 * group-wide Allocated against a single category's Budget — the mismatch
 * behind "the numbers don't match" between the Expenses page and the
 * vendor/venue forms.
 *
 * `allocated_amount` stays the category's own raw budget (it is what the
 * budget editors write back); `budget` is the derived group figure and is
 * what every surface must display and compare against.
 */
function groupBudgetMap(
  categories: { id: string; parent_category_id?: string | null; allocated_amount: unknown }[],
): Map<string, number> {
  const group = new Map<string, number>();
  for (const cat of categories) group.set(cat.id, toFloat(cat.allocated_amount));
  for (const cat of categories) {
    const parentId = cat.parent_category_id;
    // `has` rather than `?? 0`: a child pointing at a parent outside this
    // owner's set would otherwise mint a phantom entry under an id no caller
    // ever looks up.
    if (!parentId || !group.has(parentId)) continue;
    group.set(parentId, group.get(parentId)! + toFloat(cat.allocated_amount));
  }
  return group;
}

export async function getExpenseOverview(ownerId: string) {
  const [categories, rollups] = await Promise.all([
    repo.findCategoriesByOwner(ownerId),
    finance.getCategoryRollups(ownerId),
  ]);

  const spending = new Map(rollups.map((rollup) => [rollup.category_id, rollup]));
  const groupBudget = groupBudgetMap(categories);
  // Parents hold no line items of their own, so their Allocated/Paid/etc. are
  // the sum of their children's — mirrored from getCategoryTree so both
  // endpoints report the same numbers for the same category.
  const childrenOf = new Map<string, string[]>();
  for (const cat of categories) {
    if (!cat.parent_category_id) continue;
    const siblings = childrenOf.get(cat.parent_category_id) ?? [];
    siblings.push(cat.id);
    childrenOf.set(cat.parent_category_id, siblings);
  }

  return categories.map((cat) => {
    const kids = childrenOf.get(cat.id) ?? [];
    const sumOf = (pick: (r: (typeof rollups)[number]) => number) =>
      [cat.id, ...kids].reduce((total, id) => {
        const rollup = spending.get(id);
        return total + (rollup ? pick(rollup) : 0);
      }, 0);

    const committed = sumOf((r) => r.committed_amount);
    const budget = groupBudget.get(cat.id) ?? toFloat(cat.allocated_amount);
    return {
      ...cat,
      budget,
      committed,
      paid: sumOf((r) => r.paid_amount),
      outstanding: sumOf((r) => r.outstanding_amount),
      remaining: budget - committed,
      percentage: budget > 0 ? Math.round((committed / budget) * 100) : 0,
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
  const categories = await repo.findCategoriesByOwner(ownerId);
  // Carries the same derived group figure as the overview/tree/alerts
  // endpoints so the vendor/venue budget field doesn't have to re-derive it
  // and drift. `allocated_amount` stays the category's own raw budget.
  const groupBudget = groupBudgetMap(categories);
  return categories.map((category) => ({
    ...category,
    budget: groupBudget.get(category.id) ?? toFloat(category.allocated_amount),
  }));
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
    // Every rollup here (groupBudgetMap, getExpenseOverview's childrenOf, and
    // getCategoryTree's parent/child split) sums exactly one level. A
    // grandchild would render nowhere and its money would reach its parent but
    // not the top-level group, so refuse the third level at the door.
    if (parent.parent_category_id) {
      return { error: 'Categories can only be nested one level deep' } as const;
    }
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
  const groupBudget = groupBudgetMap(allCategories);
  const parents = allCategories.filter((category) => !category.parent_category_id);
  const children = allCategories.filter((category) => category.parent_category_id);

  return parents.map((parent) => {
    const parentChildren = children.filter((child) => child.parent_category_id === parent.id);
    const childRows = parentChildren.map((child) => {
      const rollup = spending.get(child.id);
      const committed = rollup?.committed_amount ?? 0;
      const budget = toFloat(child.allocated_amount);
      return {
        ...child,
        budget,
        committed,
        paid: rollup?.paid_amount ?? 0,
        outstanding: rollup?.outstanding_amount ?? 0,
          remaining: budget - committed,
        percentage: budget > 0 ? Math.round((committed / budget) * 100) : 0,
      };
    });

    // A parent can carry line items of its own as well as children's, so both
    // sides of every comparison include the parent's own rollup.
    const parentOwn = spending.get(parent.id);
    const parentCommitted =
      (parentOwn?.committed_amount ?? 0) +
      childRows.reduce((sum, child) => sum + child.committed, 0);
    const parentBudget = groupBudget.get(parent.id) ?? toFloat(parent.allocated_amount);

    return {
      ...parent,
      budget: parentBudget,
      committed: parentCommitted,
      paid: (parentOwn?.paid_amount ?? 0) + childRows.reduce((sum, child) => sum + child.paid, 0),
      outstanding:
        (parentOwn?.outstanding_amount ?? 0) +
        childRows.reduce((sum, child) => sum + child.outstanding, 0),
      remaining: parentBudget - parentCommitted,
      percentage: parentBudget > 0 ? Math.round((parentCommitted / parentBudget) * 100) : 0,
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

export type ExpenseSideKey = 'bride' | 'groom' | 'shared' | 'mixed';
export type ExpenseWithSideMeta = ExpenseWithDetails & {
  side_key: ExpenseSideKey;
  side_label: string;
};

// Mirrors the frontend's getSideMeta (was computed client-side in
// Expense.tsx) — 'mixed' isn't a real DB value, it's "this expense's line
// items span more than one side", so it can only be computed after fetch.
function getSideMeta(expense: ExpenseWithDetails): { side_key: ExpenseSideKey; side_label: string } {
  const uniqueSides = Array.from(new Set(expense.items.map((item) => item.side)));
  if (uniqueSides.length !== 1) {
    return { side_key: 'mixed', side_label: 'Mixed' };
  }

  const side = (uniqueSides[0] ?? 'shared') as ExpenseSideKey;
  if (side === 'shared') {
    const percentages = Array.from(
      new Set(expense.items.map((item) => item.bride_share_percentage ?? 50)),
    );
    const onlyPercentage = percentages[0] ?? 50;
    return {
      side_key: 'shared',
      side_label:
        percentages.length === 1 ? `Shared (${onlyPercentage} / ${100 - onlyPercentage})` : 'Shared',
    };
  }

  return { side_key: side, side_label: `${side.charAt(0).toUpperCase()}${side.slice(1)}` };
}

export interface ExpenseListOptions {
  status?: string | undefined;
  source_type?: string | undefined;
  category_id?: string | undefined;
  search?: string | undefined;
  // 'mixed' isn't a DB value — handled in-memory below, never sent to SQL.
  side?: string | undefined;
  sort?: 'date' | 'outstanding' | 'committed' | 'description' | undefined;
  page?: number | undefined;
  per_page?: number | undefined;
}

const EXPENSE_SORTERS: Record<
  NonNullable<ExpenseListOptions['sort']>,
  (a: ExpenseWithSideMeta, b: ExpenseWithSideMeta) => number
> = {
  outstanding: (a, b) => b.summary.outstanding_amount - a.summary.outstanding_amount,
  committed: (a, b) => b.summary.committed_amount - a.summary.committed_amount,
  description: (a, b) => a.description.localeCompare(b.description),
  // ISO date strings sort correctly lexicographically.
  date: (a, b) =>
    b.expense_date === a.expense_date
      ? b.created_at.localeCompare(a.created_at)
      : b.expense_date.localeCompare(a.expense_date),
};

// Dashboard-facing list: SQL filters what it can (status/source_type/category_id/
// search), then side='mixed' and sort/pagination happen in-memory since they
// depend on computed fields (side_key spans items; committed/outstanding
// come from the aggregated summary) — same hybrid pattern as vendors/guests.
export async function getExpensesList(
  ownerId: string,
  options: ExpenseListOptions = {},
): Promise<Paginated<ExpenseWithSideMeta>> {
  const isMixedSide = options.side === 'mixed';
  const results = await finance.listExpenses(ownerId, {
    status: options.status,
    source_type: options.source_type,
    category_id: options.category_id,
    search: options.search,
    side: isMixedSide ? undefined : options.side,
  });

  let withSideMeta: ExpenseWithSideMeta[] = results.map((expense) => ({
    ...expense,
    ...getSideMeta(expense),
  }));

  if (isMixedSide) {
    withSideMeta = withSideMeta.filter((expense) => expense.side_key === 'mixed');
  }

  withSideMeta.sort(EXPENSE_SORTERS[options.sort ?? 'date']);

  const pageRequest = resolvePagination(options, 20);
  return pageRequest
    ? paginate(withSideMeta, pageRequest.page, pageRequest.perPage)
    : paginate(withSideMeta, 1, Math.max(withSideMeta.length, 1));
}

export async function getExpense(id: string, ownerId: string) {
  return finance.getExpense(ownerId, id);
}

export async function createExpense(
  payload: Omit<ExpenseInsert, 'user_id'> & {
    items: finance.ExpenseWriteInput['items'];
    payments?: finance.PaymentMutationInput[];
  },
  ownerId: string,
  actorId: string,
) {
  return finance.createManualExpense(ownerId, actorId, { ...payload, items: payload.items });
}

export async function updateExpense(
  id: string,
  ownerId: string,
  actorId: string,
  payload: Partial<finance.ExpenseWriteInput>,
) {
  return finance.updateExpense(ownerId, actorId, id, payload);
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

export interface PaymentsListOptions {
  status?: string | undefined;
  side?: string | undefined;
  page?: number | undefined;
  per_page?: number | undefined;
}

// Scheduled payments (status='scheduled') are called with no page/per_page —
// that list stays a small, naturally-bounded queue and is rendered in full.
// History (status='posted') is called with pagination — see ExpensePaymentsTab.
export async function getPayments(ownerId: string, options: PaymentsListOptions = {}) {
  const expenses = await finance.listExpenses(ownerId);
  const byExpense = new Map(expenses.map((expense) => [expense.id, expense]));
  let results = expenses
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
    .map((payment) => ({
      ...payment,
      expense_summary: byExpense.get(payment.expense.id)?.summary ?? null,
    }));

  if (options.status) results = results.filter((payment) => payment.status === options.status);
  if (options.side) results = results.filter((payment) => payment.paid_by_side === options.side);

  results =
    options.status === 'scheduled'
      ? results.sort((a, b) =>
          (a.due_date ?? a.created_at).localeCompare(b.due_date ?? b.created_at),
        )
      : results.sort((a, b) =>
          (b.paid_date ?? b.created_at).localeCompare(a.paid_date ?? a.created_at),
        );

  const pageRequest = resolvePagination(options, 20);
  return pageRequest ? paginate(results, pageRequest.page, pageRequest.perPage) : results;
}

// ---------------------------------------------------------------------------
// Outstanding balances
// ---------------------------------------------------------------------------

export interface OutstandingListOptions {
  page?: number | undefined;
  per_page?: number | undefined;
}

export async function getOutstanding(ownerId: string, options: OutstandingListOptions = {}) {
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
    }))
    .sort((a, b) => b.outstanding - a.outstanding);

  // totalOutstanding is a whole-wedding KPI — always summed over every owed
  // item, never scoped to the current page.
  const totalOutstanding = items.reduce((sum, item) => sum + item.outstanding, 0);

  const pageRequest = resolvePagination(options, 20);
  const paged = pageRequest
    ? paginate(items, pageRequest.page, pageRequest.perPage)
    : paginate(items, 1, Math.max(items.length, 1));

  return { ...paged, totalOutstanding };
}

// ---------------------------------------------------------------------------
// Alerts: overdue/upcoming payments + over-budget categories
// ---------------------------------------------------------------------------

export async function getAlerts(ownerId: string, todayOverride?: string) {
  const [scheduled, categories, rollups] = await Promise.all([
    finance.getScheduledPayments(ownerId),
    repo.findCategoriesByOwner(ownerId),
    finance.getCategoryRollups(ownerId),
  ]);

  // Prefer the client's local date so overdue/upcoming match the user's
  // timezone; fall back to server UTC when absent.
  const today = todayOverride ?? new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(`${today}T00:00:00Z`);
  nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
  const nextWeekStr = nextWeek.toISOString().slice(0, 10);
  const spending = new Map(rollups.map((rollup) => [rollup.category_id, rollup]));

  // Budgets are often set on a parent category while actual expenses are
  // logged against its children (e.g. "Catering" budget, "Catering > Food"
  // items). Roll each parent's own budget/committed up with its children's
  // before comparing, using the same groupBudgetMap the overview and tree
  // endpoints use so every view agrees on what's "over budget".
  const groupBudget = groupBudgetMap(categories);
  const rolled = new Map(
    categories.map((category) => [
      category.id,
      {
        allocated: groupBudget.get(category.id) ?? toFloat(category.allocated_amount),
        committed: spending.get(category.id)?.committed_amount ?? 0,
      },
    ]),
  );
  for (const category of categories) {
    if (!category.parent_category_id) continue;
    const parent = rolled.get(category.parent_category_id);
    const own = rolled.get(category.id);
    if (!parent || !own) continue;
    parent.committed += own.committed;
  }

  const overBudgetCategories = categories
    .map((category) => {
      const totals = rolled.get(category.id)!;
      return {
        id: category.id,
        name: category.name,
        allocated: totals.allocated,
        spent: totals.committed,
      };
    })
    .filter((category) => category.allocated > 0 && category.spent > category.allocated)
    .map((category) => ({
      ...category,
      overBy: category.spent - category.allocated,
    }));

  const nearBudgetCategories = categories
    .map((category) => {
      const totals = rolled.get(category.id)!;
      return {
        id: category.id,
        name: category.name,
        allocated: totals.allocated,
        spent: totals.committed,
      };
    })
    .filter(
      (category) =>
        category.allocated > 0 &&
        category.spent <= category.allocated &&
        category.spent / category.allocated >= 0.8,
    )
    .map((category) => ({
      ...category,
      percentage: Math.round((category.spent / category.allocated) * 100),
    }));

  const overdue = scheduled.filter(
    (payment) => payment.due_date != null && payment.due_date < today,
  );
  const upcoming = scheduled.filter(
    (payment) =>
      payment.due_date != null && payment.due_date >= today && payment.due_date <= nextWeekStr,
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
    const childrenTotalSpent = childrenWithExpenses.reduce(
      (sum, child) => sum + child.totalSpent,
      0,
    );

    return {
      ...parent,
      expenses: parentExpenses,
      directSpent: parentDirectSpent,
      totalSpent: parentDirectSpent + childrenTotalSpent,
      children: childrenWithExpenses.length > 0 ? childrenWithExpenses : undefined,
    };
  });
}

export async function getExpensePayments(
  expenseId: string,
  ownerId: string,
): Promise<PaymentRow[]> {
  return finance.listExpensePayments(ownerId, expenseId);
}

export async function createExpensePayment(
  expenseId: string,
  ownerId: string,
  actorId: string,
  payload: finance.PaymentMutationInput,
) {
  return finance.createExpensePayment(ownerId, actorId, expenseId, payload);
}

export async function updateExpensePayment(
  paymentId: string,
  ownerId: string,
  actorId: string,
  payload: finance.PaymentMutationInput,
) {
  return finance.updateExpensePayment(ownerId, actorId, paymentId, payload);
}

export async function deleteExpensePayment(paymentId: string, ownerId: string, actorId: string) {
  return finance.deleteExpensePayment(ownerId, actorId, paymentId);
}

export async function getPaymentAttachments(
  paymentId: string,
  ownerId: string,
): Promise<PaymentAttachmentRow[]> {
  return paymentAttachments.listPaymentAttachments(ownerId, paymentId);
}

export async function uploadPaymentAttachment(
  paymentId: string,
  ownerId: string,
  file: Express.Multer.File,
): Promise<PaymentAttachmentRow> {
  return paymentAttachments.uploadPaymentAttachment(ownerId, paymentId, file);
}

export async function deletePaymentAttachment(attachmentId: string, ownerId: string) {
  return paymentAttachments.deletePaymentAttachment(ownerId, attachmentId);
}

// One round-trip for the Budget page (was 6 parallel calls). Unfiltered — the
// page filters expenses client-side.
export async function getPageData(ownerId: string, todayOverride?: string) {
  const [summary, overview, expenses, categories, outstanding, alerts] = await Promise.all([
    getExpenseSummary(ownerId),
    getExpenseOverview(ownerId),
    listExpenses(ownerId, {}),
    listCategories(ownerId),
    getOutstanding(ownerId),
    getAlerts(ownerId, todayOverride),
  ]);
  return { summary, overview, expenses, categories, outstanding, alerts };
}
