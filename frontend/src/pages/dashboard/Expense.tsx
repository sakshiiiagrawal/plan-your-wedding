import { useEffect, useMemo, useState } from 'react';
import { HiOutlinePlus, HiOutlineDownload } from 'react-icons/hi';
import { useViewPreference } from '../../hooks/useViewPreference';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  useCreateExpense,
  useDeleteExpense,
  useBudgetPageData,
  useUpdateExpense,
  useExportBudget,
  useExpensesList,
} from '../../hooks/useApi';
import ExpenseOverviewTab from './expense/ExpenseOverviewTab';
import ExpenseBudgetTab from './expense/ExpenseBudgetTab';
import ExpenseExpensesTab, {
  type ExpenseListRow,
  type ExpenseSortKey,
  type ExpenseTypeFilter,
  type ExpenseSideFilter,
} from './expense/ExpenseExpensesTab';
import ExpensePaymentsTab from './expense/ExpensePaymentsTab';
import AddExpenseModal from './expense/AddExpenseModal';
import EditExpenseModal from './expense/EditExpenseModal';
import VendorPaymentsModal from './VendorPaymentsModal';
import type { ExpenseRow } from './expense/EditExpenseModal';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { usePageHeader } from '../../contexts/PageHeaderContext';
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

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'budget', label: 'Budget' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'payments', label: 'Payments' },
];

// Module-level (stable reference) so useUrlFilters doesn't recompute on every render.
const EXPENSE_LIST_FILTER_DEFAULTS = {
  search: '',
  type: 'all',
  side: 'all',
  sort: 'date',
  page: 1,
  per_page: 20,
};

export default function Expense() {
  const { user } = useAuth();
  const canSeeSplits = financeTier(user) === 'full';

  const [activeTabRaw, setActiveTab] = useViewPreference<string>('expense.activeTab', 'overview');
  // The old Categories tab merged into Budget — map saved preferences and old
  // ?tab=categories links onto it.
  const activeTab = activeTabRaw === 'categories' ? 'budget' : activeTabRaw;
  // An explicit ?tab= (e.g. a shared link) overrides — and becomes — the
  // saved preference; it only applies once, on the page's first mount.
  useEffect(() => {
    const urlTab = new URLSearchParams(window.location.search).get('tab');
    if (urlTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [closeConfirm, setCloseConfirm] = useState<string | null>(null);
  const [paymentSource, setPaymentSource] = useState<
    React.ComponentProps<typeof VendorPaymentsModal>['source'] | null
  >(null);

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

  // Sourced from the whole-wedding (unfiltered) expense list, not the
  // Expenses-tab's filtered/paged fetch below — the Payments tab can ask to
  // open the edit/payments surface for any expense, not just ones on the
  // Expenses tab's current page.
  const expensesById = useMemo(
    () => new Map(expenses.map((expense) => [expense.id, expense])),
    [expenses],
  );

  const [expenseListFilters, setExpenseListFilters] = useUrlFilters(EXPENSE_LIST_FILTER_DEFAULTS);
  const expenseFilterType = expenseListFilters.type as ExpenseTypeFilter;
  const expenseFilterSide = expenseListFilters.side as ExpenseSideFilter;
  const expenseSortKey = expenseListFilters.sort as ExpenseSortKey;
  const setExpenseListPage = (next: number) => setExpenseListFilters({ page: next });

  // Local instant state for the search box; only pushed to the URL/query
  // after a debounce so typing doesn't fire a network request per keystroke.
  const [expenseSearchInput, setExpenseSearchInput] = useState(expenseListFilters.search);
  const debouncedExpenseSearch = useDebouncedValue(expenseSearchInput, 300);
  useEffect(() => {
    if (debouncedExpenseSearch !== expenseListFilters.search) {
      setExpenseListFilters({ search: debouncedExpenseSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedExpenseSearch]);

  const { data: expensesListResponse, isFetching: expensesListFetching } = useExpensesList({
    source_type: expenseFilterType !== 'all' ? expenseFilterType : undefined,
    side: expenseFilterSide !== 'all' ? expenseFilterSide : undefined,
    search: expenseListFilters.search.trim() || undefined,
    sort: expenseSortKey,
    page: expenseListFilters.page,
    per_page: expenseListFilters.per_page,
  });
  const expenseRows = useMemo<ExpenseListRow[]>(() => {
    return (expensesListResponse?.items ?? []).map((expense) => {
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
        side_key: expense.side_key as ExpenseListRow['side_key'],
        side_label: expense.side_label,
        item_count: expense.items.length,
        status: expense.status,
        editable: expense.source_type === 'manual',
        has_payments: expense.payments.length > 0,
      };
    });
  }, [categoryNameById, expensesListResponse?.items]);

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
      // Rethrow so the modal keeps the form (and unsaved-changes dialog) intact.
      throw error;
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

  const goToScheduledPayments = () => {
    setActiveTab('payments');
    setTimeout(
      () => document.getElementById('scheduled-payments')?.scrollIntoView({ behavior: 'smooth' }),
      50,
    );
  };

  const goToOutstandingBalances = () => {
    setActiveTab('payments');
    setTimeout(
      () => document.getElementById('outstanding-balances')?.scrollIntoView({ behavior: 'smooth' }),
      50,
    );
  };

  // Routes to the right payment surface: manual expenses use the edit modal,
  // vendor/venue-sourced ones use the read-through payments modal.
  const openPaymentsFor = (expenseId: string) => {
    const expense = expensesById.get(expenseId);
    if (!expense) return;
    if (expense.source_type === 'manual') {
      setEditingExpense(expense);
      return;
    }
    if (!expense.source_id) return;
    setPaymentSource({
      id: expense.source_id,
      name: expense.source_name ?? expense.description,
      type: expense.source_type,
      expense_id: expense.id,
      finance_summary: {
        committed_amount: expense.summary.committed_amount,
        paid_amount: expense.summary.paid_amount,
        outstanding_amount: expense.summary.outstanding_amount,
      },
      finance: { items: expense.items, allocations: expense.allocations },
    });
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
      // Rethrow so AddExpenseModal keeps the entered data instead of resetting.
      throw error;
    }
  };

  usePageHeader({
    title: 'Expense & Finance',
    nav: TABS.map((tab) => {
      const active = activeTab === tab.id;
      const badge =
        tab.id === 'payments'
          ? (alerts?.overdueCount ?? 0)
          : tab.id === 'budget'
            ? (alerts?.overBudgetCategories?.length ?? 0)
            : 0;
      return (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 11px',
            marginBottom: -1,
            fontSize: 13.5,
            fontWeight: active ? 600 : 500,
            whiteSpace: 'nowrap',
            color: active ? 'var(--ink-high)' : 'var(--ink-low)',
            borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'color 150ms, border-color 150ms',
          }}
        >
          {tab.label}
          {badge > 0 && (
            <span
              title={tab.id === 'payments' ? 'Overdue payments' : 'Categories over budget'}
              style={{
                minWidth: 16,
                height: 16,
                padding: '0 4px',
                borderRadius: 100,
                fontSize: 10,
                fontWeight: 700,
                lineHeight: '16px',
                textAlign: 'center',
                background: tab.id === 'payments' ? 'var(--err)' : 'var(--warn)',
                color: 'white',
              }}
            >
              {badge}
            </span>
          )}
        </button>
      );
    }),
    action: (
      <div className="flex items-center gap-2">
        <button
          onClick={() => exportBudget.mutate()}
          disabled={exportBudget.isPending}
          className="btn-outline flex items-center gap-1.5"
          style={{ fontSize: 12.5, padding: '5px 12px' }}
          title="Export budget to Excel"
        >
          <HiOutlineDownload className="w-3.5 h-3.5" />
          Export
        </button>
        <button
          onClick={() => setShowExpenseModal(true)}
          className="btn-primary flex items-center gap-1.5"
          style={{ fontSize: 12.5, padding: '5px 12px' }}
        >
          <HiOutlinePlus className="w-3.5 h-3.5" />
          Add Expense
        </button>
      </div>
    ),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-ink-low">Loading expense data...</div>
      </div>
    );
  }

  const totalBudget = expenseSummary?.totalExpense || 0;
  const committed = expenseSummary?.totalCommitted || 0;
  const paid = expenseSummary?.totalPaid || 0;
  const outstandingTotal = expenseSummary?.totalOutstanding ?? outstanding?.totalOutstanding ?? 0;
  const remainingBudget = expenseSummary?.remainingBudget ?? totalBudget - committed;

  return (
    <div className="space-y-4">
      {activeTab === 'overview' && (
        <ExpenseOverviewTab
          expenseOverview={expenseOverview}
          formatCurrency={formatCurrency}
          summary={{
            totalBudget,
            committed,
            paid,
            outstanding: outstandingTotal,
            remainingBudget,
          }}
          alerts={alerts}
          onNavigate={setActiveTab}
          onReviewPayments={goToScheduledPayments}
          onReviewOutstanding={goToOutstandingBalances}
        />
      )}

      {activeTab === 'budget' && (
        <ExpenseBudgetTab expenseOverview={expenseOverview} formatCurrency={formatCurrency} />
      )}

      {activeTab === 'expenses' && (
        <ExpenseExpensesTab
          rows={expenseRows}
          loading={isLoading}
          isFetching={expensesListFetching}
          hasAnyExpenses={expenses.length > 0}
          formatCurrency={formatCurrency}
          onEdit={(row) => {
            const expense = expensesById.get(row.id);
            if (expense?.source_type === 'manual') {
              setEditingExpense(expense);
            }
          }}
          onDelete={(id) => setDeleteConfirm(id)}
          onCloseExpense={(id) => setCloseConfirm(id)}
          onViewPayments={(row) => openPaymentsFor(row.id)}
          onAdd={() => setShowExpenseModal(true)}
          showSides={canSeeSplits}
          filterType={expenseFilterType}
          onFilterTypeChange={(v) => setExpenseListFilters({ type: v })}
          filterSide={expenseFilterSide}
          onFilterSideChange={(v) => setExpenseListFilters({ side: v })}
          search={expenseSearchInput}
          onSearchChange={setExpenseSearchInput}
          sortKey={expenseSortKey}
          onSortKeyChange={(v) => setExpenseListFilters({ sort: v })}
          page={expensesListResponse?.page ?? expenseListFilters.page}
          perPage={expensesListResponse?.per_page ?? expenseListFilters.per_page}
          totalPages={expensesListResponse?.total_pages ?? 1}
          totalItems={expensesListResponse?.total_items ?? 0}
          onPageChange={setExpenseListPage}
        />
      )}

      {activeTab === 'payments' && (
        <ExpensePaymentsTab formatCurrency={formatCurrency} onRecordPayment={openPaymentsFor} />
      )}

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

      <ConfirmDialog
        open={closeConfirm !== null}
        title="Close expense?"
        message="This expense has recorded payments, so it can't be deleted. Closing keeps the history and hides it from active planning. You can reopen it later."
        confirmLabel="Close"
        isPending={updateExpenseMutation.isPending}
        onConfirm={() => {
          if (closeConfirm) void handleExpenseUpdate(closeConfirm, { status: 'closed' });
          setCloseConfirm(null);
        }}
        onCancel={() => setCloseConfirm(null)}
      />

      {paymentSource && (
        <VendorPaymentsModal source={paymentSource} onClose={() => setPaymentSource(null)} />
      )}
    </div>
  );
}
