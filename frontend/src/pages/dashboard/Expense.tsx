import { useMemo, useState } from 'react';
import { HiOutlinePlus, HiOutlineDownload } from 'react-icons/hi';
import {
  useCreateExpense,
  useDeleteExpense,
  useBudgetPageData,
  useUpdateExpense,
  useExportBudget,
} from '../../hooks/useApi';
import ExpenseOverviewTab from './expense/ExpenseOverviewTab';
import ExpenseExpensesTab, { type ExpenseListRow } from './expense/ExpenseExpensesTab';
import ExpenseSideWiseTab from './expense/ExpenseSideWiseTab';
import ExpenseCategoriesTab from './expense/ExpenseCategoriesTab';
import ExpensePaymentsTab from './expense/ExpensePaymentsTab';
import AddExpenseModal from './expense/AddExpenseModal';
import EditExpenseModal from './expense/EditExpenseModal';
import type { ExpenseRow } from './expense/EditExpenseModal';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import type { ExpenseWithDetails } from '@wedding-planner/shared';
import { financeTier } from '@wedding-planner/shared';
import { formatCurrency } from '../../utils/currency';
import { useAuth } from '../../contexts/AuthContext';

interface Tab {
  id: string;
  label: string;
}

interface ApiError {
  response?: { data?: { message?: string; error?: string } };
}

interface ExpenseOverviewCategory {
  id: string;
  name: string;
  committed?: number | string;
  spent?: number | string;
  paid?: number | string;
  outstanding?: number | string;
  allocated_amount?: number | string;
}

interface SideWiseExpenseItem {
  id: string;
  description: string;
  category_name: string;
  amount: number;
  expense_date: string;
  expense_title: string;
  bride_share_percentage: number | null;
  is_shared: boolean;
  shared_share_percentage?: number;
  shared_total_amount?: number;
  bride_share_amount?: number;
  groom_share_amount?: number;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'sidewise', label: 'Side-wise' },
  { id: 'categories', label: 'Categories' },
  { id: 'payments', label: 'Payments' },
];

function getSideMeta(expense: ExpenseWithDetails) {
  const uniqueSides = Array.from(new Set(expense.items.map((item) => item.side)));
  if (uniqueSides.length !== 1) {
    return { side_key: 'mixed' as const, side_label: 'Mixed' };
  }

  const side = uniqueSides[0] ?? 'shared';
  if (side === 'shared') {
    const percentages = Array.from(
      new Set(expense.items.map((item) => item.bride_share_percentage ?? 50)),
    );
    const onlyPercentage = percentages[0] ?? 50;
    return {
      side_key: 'shared' as const,
      side_label:
        percentages.length === 1
          ? `Shared (${onlyPercentage} / ${100 - onlyPercentage})`
          : 'Shared',
    };
  }

  return {
    side_key: side,
    side_label: `${side.charAt(0).toUpperCase()}${side.slice(1)}`,
  } as const;
}

export default function Expense() {
  const { user } = useAuth();
  const canSeeSplits = financeTier(user) === 'full';
  const visibleTabs = useMemo(
    () => (canSeeSplits ? TABS : TABS.filter((tab) => tab.id !== 'sidewise')),
    [canSeeSplits],
  );

  const [activeTab, setActiveTab] = useState('overview');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: pageData, isLoading } = useBudgetPageData();
  const expenseSummary = pageData?.summary;
  const expenseOverview = pageData?.overview;
  const expenses = pageData?.expenses ?? [];
  const categories = pageData?.categories ?? [];
  const outstanding = pageData?.outstanding;
  const alerts = pageData?.alerts;
  const exportBudget = useExportBudget();
  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const deleteExpenseMutation = useDeleteExpense();

  const categoryNameById = useMemo(
    () =>
      new Map(
        categories.map((category: { id: string; name: string }) => [category.id, category.name]),
      ),
    [categories],
  );

  const expensesById = useMemo(
    () => new Map(expenses.map((expense) => [expense.id, expense])),
    [expenses],
  );

  const expenseRows = useMemo<ExpenseListRow[]>(() => {
    return expenses.map((expense) => {
      const sideMeta = getSideMeta(expense);
      const categorySummary = Array.from(
        new Set(
          expense.items.map((item) => categoryNameById.get(item.category_id) ?? 'Uncategorized'),
        ),
      ).join(', ');

      return {
        id: expense.id,
        description: expense.description,
        source_type: expense.source_type,
        category_summary: categorySummary || 'Uncategorized',
        planned: expense.summary.planned_amount,
        committed: expense.summary.committed_amount,
        paid: expense.summary.paid_amount,
        outstanding: expense.summary.outstanding_amount,
        expense_date: expense.expense_date,
        side_key: sideMeta.side_key,
        side_label: sideMeta.side_label,
        item_count: expense.items.length,
        status: expense.status,
        editable: expense.source_type === 'manual',
      };
    });
  }, [categoryNameById, expenses]);

  const categoryAnalysis = useMemo(() => {
    const countByCategory = new Map<string, number>();
    for (const expense of expenses) {
      for (const item of expense.items) {
        countByCategory.set(item.category_id, (countByCategory.get(item.category_id) ?? 0) + 1);
      }
    }

    return (expenseOverview ?? [])
      .map((category: ExpenseOverviewCategory) => ({
        id: category.id,
        name: category.name,
        committed: Number(category.committed ?? category.spent ?? 0),
        paid: Number(category.paid ?? 0),
        outstanding: Number(category.outstanding ?? 0),
        count: countByCategory.get(category.id) ?? 0,
        allocated: Number(category.allocated_amount ?? 0),
      }))
      .filter((category: { committed: number }) => category.committed > 0)
      .sort(
        (left: { committed: number }, right: { committed: number }) =>
          right.committed - left.committed,
      );
  }, [expenseOverview, expenses]);

  const sideWiseExpenses = useMemo(() => {
    const initial = {
      bride: {
        items: [] as SideWiseExpenseItem[],
        total: 0,
        directCount: 0,
        sharedCount: 0,
        directTotal: 0,
        sharedTotal: 0,
      },
      groom: {
        items: [] as SideWiseExpenseItem[],
        total: 0,
        directCount: 0,
        sharedCount: 0,
        directTotal: 0,
        sharedTotal: 0,
      },
    };

    for (const expense of expenses) {
      for (const item of expense.items) {
        const mapped = {
          id: item.id,
          description: item.description,
          category_name: categoryNameById.get(item.category_id) ?? 'Uncategorized',
          amount: item.amount,
          expense_date: expense.expense_date,
          expense_title: expense.description,
          bride_share_percentage: item.bride_share_percentage,
          is_shared: item.side === 'shared',
        };

        if (item.side === 'bride') {
          initial.bride.items.push(mapped);
          initial.bride.total += item.amount;
          initial.bride.directTotal += item.amount;
          initial.bride.directCount += 1;
        } else if (item.side === 'groom') {
          initial.groom.items.push(mapped);
          initial.groom.total += item.amount;
          initial.groom.directTotal += item.amount;
          initial.groom.directCount += 1;
        } else {
          const brideSharePercentage = item.bride_share_percentage ?? 50;
          const groomSharePercentage = 100 - brideSharePercentage;
          const brideAmount = item.amount * (brideSharePercentage / 100);
          const groomAmount = item.amount * (groomSharePercentage / 100);

          initial.bride.items.push({
            ...mapped,
            id: `${item.id}-bride`,
            amount: brideAmount,
            shared_share_percentage: brideSharePercentage,
            shared_total_amount: item.amount,
            bride_share_amount: brideAmount,
            groom_share_amount: groomAmount,
          });
          initial.bride.total += brideAmount;
          initial.bride.sharedTotal += brideAmount;
          initial.bride.sharedCount += 1;

          initial.groom.items.push({
            ...mapped,
            id: `${item.id}-groom`,
            amount: groomAmount,
            shared_share_percentage: groomSharePercentage,
            shared_total_amount: item.amount,
            bride_share_amount: brideAmount,
            groom_share_amount: groomAmount,
          });
          initial.groom.total += groomAmount;
          initial.groom.sharedTotal += groomAmount;
          initial.groom.sharedCount += 1;
        }
      }
    }

    return initial;
  }, [categoryNameById, expenses]);

  const handleExpenseUpdate = async (id: string, payload: Record<string, unknown>) => {
    try {
      await updateExpenseMutation.mutateAsync({ id, ...payload });
      toast.success('Expense updated.');
      setEditingExpense(null);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message =
        apiError.response?.data?.message ||
        apiError.response?.data?.error ||
        'Failed to update expense.';
      toast.error(message);
    }
  };

  const handleExpenseDelete = async (id: string) => {
    try {
      await deleteExpenseMutation.mutateAsync(id);
      toast.success('Expense deleted.');
      setDeleteConfirm(null);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message =
        apiError.response?.data?.message ||
        apiError.response?.data?.error ||
        'Failed to delete expense.';
      toast.error(message);
    }
  };

  const handleExpenseSubmit = async (payload: Record<string, unknown>) => {
    try {
      await createExpenseMutation.mutateAsync(payload);
      toast.success('Expense added successfully.');
      setShowExpenseModal(false);
      setActiveTab('expenses');
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message =
        apiError.response?.data?.message ||
        apiError.response?.data?.error ||
        'Failed to add expense.';
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-ink-low">Loading expense data...</div>
      </div>
    );
  }

  const totalBudget = expenseSummary?.totalExpense || 0;
  const planned = expenseSummary?.totalPlanned || 0;
  const committed = expenseSummary?.totalCommitted || 0;
  const paid = expenseSummary?.totalPaid || 0;
  const outstandingTotal = expenseSummary?.totalOutstanding ?? outstanding?.totalOutstanding ?? 0;
  const remainingBudget = expenseSummary?.remainingBudget ?? totalBudget - committed;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="page-title">Expense & Finance</h1>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={() => exportBudget.mutate()}
            disabled={exportBudget.isPending}
            className="btn-outline flex items-center gap-2"
          >
            <HiOutlineDownload className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <HiOutlinePlus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {alerts &&
        (alerts.overdueCount > 0 ||
          alerts.upcomingCount > 0 ||
          alerts.overBudgetCategories?.length > 0) && (
          <div className="space-y-2">
            {alerts.overdueCount > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                <span className="font-bold">⚠</span>
                <span>
                  {alerts.overdueCount} overdue payment{alerts.overdueCount !== 1 ? 's' : ''}{' '}
                  totalling {formatCurrency(alerts.overdueTotal)}
                </span>
              </div>
            )}
            {alerts.upcomingCount > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                <span className="font-bold">⚠</span>
                <span>
                  {alerts.upcomingCount} payment{alerts.upcomingCount !== 1 ? 's' : ''} due in the
                  next 7 days totalling {formatCurrency(alerts.upcomingTotal)}
                </span>
              </div>
            )}
            {alerts.overBudgetCategories?.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-700"
              >
                <span className="font-bold">⚠</span>
                <span>
                  {category.name} is over budget by {formatCurrency(category.overBy)}
                </span>
              </div>
            ))}
          </div>
        )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--gold-deep)' }}>
            {formatCurrency(totalBudget)}
          </div>
          <div className="stat-label">Budget</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-ink-mid">{formatCurrency(planned)}</div>
          <div className="stat-label">Planned</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-maroon-800">{formatCurrency(committed)}</div>
          <div className="stat-label">Allocated</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-green-700">{formatCurrency(paid)}</div>
          <div className="stat-label">Paid</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-orange-700">{formatCurrency(outstandingTotal)}</div>
          <div className="stat-label">Outstanding</div>
          <div className="text-xs text-ink-dim mt-1">
            {formatCurrency(remainingBudget)} budget remaining
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-2 mb-6">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 150ms',
                background: activeTab === tab.id ? 'var(--gold)' : 'var(--bg-raised)',
                color: activeTab === tab.id ? 'white' : 'var(--ink-low)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <ExpenseOverviewTab expenseOverview={expenseOverview} formatCurrency={formatCurrency} />
        )}

        {activeTab === 'expenses' && (
          <ExpenseExpensesTab
            rows={expenseRows}
            loading={isLoading}
            formatCurrency={formatCurrency}
            onEdit={(row) => {
              const expense = expensesById.get(row.id);
              if (expense?.source_type === 'manual') {
                setEditingExpense(expense);
              }
            }}
            onDelete={(id) => setDeleteConfirm(id)}
            showSides={canSeeSplits}
          />
        )}

        {canSeeSplits && activeTab === 'sidewise' && (
          <ExpenseSideWiseTab sideWiseExpenses={sideWiseExpenses} formatCurrency={formatCurrency} />
        )}

        {activeTab === 'categories' && (
          <ExpenseCategoriesTab
            categoryAnalysis={categoryAnalysis}
            loading={isLoading}
            formatCurrency={formatCurrency}
          />
        )}

        {activeTab === 'payments' && <ExpensePaymentsTab formatCurrency={formatCurrency} />}
      </div>

      <AddExpenseModal
        show={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSubmit={handleExpenseSubmit}
        isPending={createExpenseMutation.isPending}
      />

      <EditExpenseModal
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onSubmit={handleExpenseUpdate}
        isPending={updateExpenseMutation.isPending}
      />

      <ConfirmDialog
        open={deleteConfirm !== null}
        title="Delete expense?"
        message="This manual expense will be removed. This cannot be undone."
        isPending={deleteExpenseMutation.isPending}
        onConfirm={() => deleteConfirm && handleExpenseDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
