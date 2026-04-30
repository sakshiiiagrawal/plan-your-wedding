import { useMemo, useState } from 'react';
import { HiOutlinePlus } from 'react-icons/hi';
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenseAlerts,
  useExpenseCategories,
  useExpenseOutstanding,
  useExpenseOverview,
  useExpenseSummary,
  useExpenses,
  useUpdateExpense,
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
import type { ExpenseWithDetails } from '@wedding-planner/shared';

interface Tab {
  id: string;
  label: string;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'sidewise', label: 'Side-wise' },
  { id: 'categories', label: 'Categories' },
  { id: 'payments', label: 'Payments' },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

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
  const [activeTab, setActiveTab] = useState('overview');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);

  const { data: expenseSummary, isLoading: loadingSummary } = useExpenseSummary();
  const { data: expenseOverview, isLoading: loadingOverview } = useExpenseOverview();
  const { data: expenses = [], isLoading: loadingExpenses } = useExpenses();
  const { data: categories = [] } = useExpenseCategories();
  const { data: outstanding } = useExpenseOutstanding();
  const { data: alerts } = useExpenseAlerts();
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
      .map((category: any) => ({
        name: category.name,
        committed: parseFloat(category.committed || category.spent || 0),
        paid: parseFloat(category.paid || 0),
        outstanding: parseFloat(category.outstanding || 0),
        count: countByCategory.get(category.id) ?? 0,
        allocated: parseFloat(category.allocated_amount || 0),
      }))
      .filter((category: { committed: number }) => category.committed > 0)
      .sort(
        (left: { committed: number }, right: { committed: number }) =>
          right.committed - left.committed,
      );
  }, [expenseOverview, expenses]);

  const sideWiseExpenses = useMemo(() => {
    const initial = {
      bride: { items: [] as any[], total: 0 },
      groom: { items: [] as any[], total: 0 },
      shared: { items: [] as any[], total: 0 },
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
        };

        if (item.side === 'bride') {
          initial.bride.items.push(mapped);
          initial.bride.total += item.amount;
        } else if (item.side === 'groom') {
          initial.groom.items.push(mapped);
          initial.groom.total += item.amount;
        } else {
          initial.shared.items.push(mapped);
          initial.shared.total += item.amount;
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
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to update expense.';
      toast.error(message);
    }
  };

  const handleExpenseDelete = async (id: string) => {
    if (!window.confirm('Delete this manual expense? This cannot be undone.')) return;
    try {
      await deleteExpenseMutation.mutateAsync(id);
      toast.success('Expense deleted.');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
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
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.response?.data?.error || 'Failed to add expense.';
      toast.error(message);
    }
  };

  if (loadingSummary || loadingOverview || loadingExpenses) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading expense data...</div>
      </div>
    );
  }

  const totalBudget = expenseSummary?.totalExpense || 0;
  const committed = expenseSummary?.totalCommitted || 0;
  const paid = expenseSummary?.totalPaid || 0;
  const outstandingTotal = expenseSummary?.totalOutstanding ?? outstanding?.totalOutstanding ?? 0;
  const remainingBudget = expenseSummary?.remainingBudget ?? totalBudget - committed;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="page-title">Expense & Finance</h1>
        <button
          onClick={() => setShowExpenseModal(true)}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <HiOutlinePlus className="w-4 h-4" />
          Add Expense
        </button>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-value text-maroon-800">{formatCurrency(totalBudget)}</div>
          <div className="stat-label">Budget</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-maroon-800">{formatCurrency(committed)}</div>
          <div className="stat-label">Committed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-green-700">{formatCurrency(paid)}</div>
          <div className="stat-label">Paid</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-orange-700">{formatCurrency(outstandingTotal)}</div>
          <div className="stat-label">Outstanding</div>
          <div className="text-xs text-gray-400 mt-1">
            {formatCurrency(remainingBudget)} budget remaining
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-maroon-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
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
            loading={loadingExpenses}
            formatCurrency={formatCurrency}
            onEdit={(row) => {
              const expense = expensesById.get(row.id);
              if (expense?.source_type === 'manual') {
                setEditingExpense(expense);
              }
            }}
            onDelete={handleExpenseDelete}
          />
        )}

        {activeTab === 'sidewise' && (
          <ExpenseSideWiseTab sideWiseExpenses={sideWiseExpenses} formatCurrency={formatCurrency} />
        )}

        {activeTab === 'categories' && (
          <ExpenseCategoriesTab
            categoryAnalysis={categoryAnalysis}
            loading={loadingOverview}
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
    </div>
  );
}
