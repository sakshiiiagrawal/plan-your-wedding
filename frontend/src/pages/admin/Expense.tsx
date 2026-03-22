import { useState, useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { HiOutlinePlus, HiOutlineCurrencyRupee } from 'react-icons/hi';
import {
  useExpenseSummary,
  useExpenseOverview,
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useVendorExpenseSummary,
  useSideSummary,
  useVendors,
  useUpdateVendor,
} from '../../hooks/useApi';
import ExpenseOverviewTab from './expense/ExpenseOverviewTab';
import ExpenseExpensesTab from './expense/ExpenseExpensesTab';
import ExpenseSideWiseTab from './expense/ExpenseSideWiseTab';
import ExpenseCategoriesTab from './expense/ExpenseCategoriesTab';
import AddExpenseModal from './expense/AddExpenseModal';
import EditExpenseModal from './expense/EditExpenseModal';
import EditVendorModal from './expense/EditVendorModal';
import type { ExpenseRow } from './expense/EditExpenseModal';
import type { VendorRow } from './expense/EditVendorModal';
import toast from 'react-hot-toast';

interface Tab {
  id: string;
  label: string;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'sidewise', label: 'Side-wise' },
  { id: 'categories', label: 'Categories' },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

type ExpenseTableRow = ExpenseRow & {
  category: string;
  date: string | null;
};

type VendorTableRow = VendorRow & {
  id: string;
  type: 'vendor';
  category: string;
  date: null;
  paid_by: null;
  share_percentage: null;
};

type AllExpenseRow = ExpenseTableRow | VendorTableRow;

export default function Expense() {
  const { slug } = useParams<{ slug: string }>();
  const { canEdit, canViewFinance } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [editingVendor, setEditingVendor] = useState<VendorRow | null>(null);

  const { data: expenseSummary, isLoading: loadingSummary } = useExpenseSummary();
  const { data: expenseOverview, isLoading: loadingOverview } = useExpenseOverview();
  const { data: expenses, isLoading: loadingExpenses } = useExpenses();
  const { data: vendorExpenseData = [], isLoading: loadingVendorExpense } = useVendorExpenseSummary();
  const { data: sideSummary = { bride: { total: 0 }, groom: { total: 0 } } } = useSideSummary();
  const { data: vendors = [] } = useVendors();
  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const updateVendorMutation = useUpdateVendor();

  const vendorCostTotal = useMemo(
    () =>
      (vendorExpenseData as Array<{ totalCost?: number }>).reduce(
        (sum, v) => sum + (v.totalCost || 0),
        0,
      ),
    [vendorExpenseData],
  );

  const allExpenses = useMemo((): AllExpenseRow[] => {
    const expenseRows: ExpenseTableRow[] = (
      (expenses || []) as Array<{
        id: string;
        description: string;
        amount: string | number;
        expense_categories?: { name: string };
        expense_date: string;
        paid_by: string | null;
        side: string | null;
        is_shared: boolean;
        share_percentage: number | null;
        category_id: string | null;
        payment_method: string | null;
        vendor_id: string | null;
        event_id: string | null;
        paid_amount: number | null;
      }>
    ).map((e) => ({
      id: e.id,
      type: 'expense' as const,
      description: e.description,
      category: e.expense_categories?.name || 'Uncategorized',
      amount: parseFloat(String(e.amount || 0)),
      date: e.expense_date,
      paid_by: e.paid_by,
      side: e.side,
      is_shared: e.is_shared,
      share_percentage: e.share_percentage,
      category_id: e.category_id,
      expense_date: e.expense_date,
      payment_method: e.payment_method,
      vendor_id: e.vendor_id,
      event_id: e.event_id,
      paid_amount: e.paid_amount,
    }));

    const vendorRows: VendorTableRow[] = (
      (vendorExpenseData || []) as Array<{
        id: string;
        name: string;
        category?: string;
        totalCost?: number;
        side?: string | null;
        is_shared?: boolean;
      }>
    ).map((v) => ({
      id: `vendor-${v.id}`,
      vendorId: v.id,
      type: 'vendor' as const,
      description: v.name,
      category: v.category?.replace(/_/g, ' ') || 'Vendor',
      amount: v.totalCost || 0,
      date: null,
      paid_by: null,
      side: v.side ?? null,
      is_shared: v.is_shared || false,
      share_percentage: null,
    }));

    return [...expenseRows, ...vendorRows];
  }, [expenses, vendorExpenseData]);

  const categoryAnalysis = useMemo(() => {
    const analysis: Record<
      string,
      { name: string; total: number; bride: number; groom: number; shared: number; count: number }
    > = {};
    (
      (expenses || []) as Array<{
        category_id?: string;
        expense_categories?: { name: string };
        amount?: string | number;
        is_shared?: boolean;
        side?: string;
      }>
    ).forEach((e) => {
      const key = e.category_id || 'uncategorized';
      if (!analysis[key]) {
        analysis[key] = {
          name: e.expense_categories?.name || 'Uncategorized',
          total: 0,
          bride: 0,
          groom: 0,
          shared: 0,
          count: 0,
        };
      }
      const amount = parseFloat(String(e.amount || 0));
      analysis[key].total += amount;
      analysis[key].count++;
      if (e.is_shared) analysis[key].shared += amount;
      else if (e.side === 'bride') analysis[key].bride += amount;
      else analysis[key].groom += amount;
    });
    return Object.values(analysis).sort((a, b) => b.total - a.total);
  }, [expenses]);

  const sideWiseExpenses = useMemo(() => {
    const all = (expenses || []) as Array<{
      is_shared?: boolean;
      side?: string;
      amount?: string | number;
    }>;
    const bride = all.filter((e) => !e.is_shared && e.side === 'bride');
    const groom = all.filter((e) => !e.is_shared && e.side === 'groom');
    const shared = all.filter((e) => e.is_shared);
    return {
      bride: {
        items: bride,
        total: bride.reduce((s, e) => s + parseFloat(String(e.amount || 0)), 0),
      },
      groom: {
        items: groom,
        total: groom.reduce((s, e) => s + parseFloat(String(e.amount || 0)), 0),
      },
      shared: {
        items: shared,
        total: shared.reduce((s, e) => s + parseFloat(String(e.amount || 0)), 0),
      },
    };
  }, [expenses]);

  const handleVendorUpdate = async (id: string, payload: Record<string, unknown>) => {
    try {
      await updateVendorMutation.mutateAsync({ id, ...payload });
      toast.success('Vendor updated!');
      setEditingVendor(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } } };
      const msg =
        error.response?.data?.message || error.response?.data?.error || 'Failed to update vendor';
      toast.error(msg);
    }
  };

  const handleExpenseUpdate = async (id: string, payload: Record<string, unknown>) => {
    try {
      await updateExpenseMutation.mutateAsync({ id, ...payload });
      toast.success('Expense updated!');
      setEditingExpense(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } } };
      const msg =
        error.response?.data?.message || error.response?.data?.error || 'Failed to update expense';
      toast.error(msg);
    }
  };

  const handleExpenseSubmit = async (payload: Record<string, unknown>) => {
    try {
      await createExpenseMutation.mutateAsync(payload);
      toast.success('Expense added successfully!');
      setShowExpenseModal(false);
      setActiveTab('expenses');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } } };
      const msg =
        error.response?.data?.message || error.response?.data?.error || 'Failed to add expense';
      toast.error(msg);
    }
  };

  if (!canViewFinance) return <Navigate to={`/${slug}/admin`} replace />;

  if (loadingSummary || loadingOverview) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading expense data...</div>
      </div>
    );
  }

  const total = expenseSummary?.totalExpense || 0;
  const spent = expenseSummary?.totalSpent || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="page-title">Expense & Finance</h1>
        {canEdit && (
          <button
            onClick={() => setShowExpenseModal(true)}
            className="btn-primary flex items-center gap-2 self-start sm:self-auto"
          >
            <HiOutlinePlus className="w-4 h-4" />
            Add Expense
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <HiOutlineCurrencyRupee className="w-8 h-8 text-gold-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-maroon-800">{formatCurrency(total)}</div>
          <div className="text-sm text-gray-500">Total Expense</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(spent)}</div>
          <div className="text-sm text-gray-500">Total Spent</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${Math.min(100, Math.round((spent / (total || 1)) * 100))}%` }}
            />
          </div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(vendorCostTotal)}</div>
          <div className="text-sm text-gray-500">Vendor Costs</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-maroon-800">{formatCurrency(total - spent)}</div>
          <div className="text-sm text-gray-500">Remaining</div>
        </div>
      </div>

      {/* Family Contributions */}
      <div className="card">
        <h3 className="font-semibold text-maroon-800 mb-4">Family Contributions</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-pink-50 rounded-lg">
            <div className="text-sm text-pink-600 mb-1">Bride Side</div>
            <div className="text-xl font-bold text-pink-700">
              {formatCurrency(sideSummary.bride.total)}
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-600 mb-1">Groom Side</div>
            <div className="text-xl font-bold text-blue-700">
              {formatCurrency(sideSummary.groom.total)}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-4 border-b border-gold-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-maroon-800 border-b-2 border-maroon-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <ExpenseOverviewTab expenseOverview={expenseOverview} formatCurrency={formatCurrency} />
      )}
      {activeTab === 'expenses' && (
        <ExpenseExpensesTab
          allExpenses={allExpenses}
          loading={loadingExpenses || loadingVendorExpense}
          formatCurrency={formatCurrency}
          canEdit={canEdit}
          onEdit={(row: AllExpenseRow) =>
            row.type === 'vendor'
              ? setEditingVendor(row as VendorTableRow)
              : setEditingExpense(row as ExpenseRow)
          }
        />
      )}
      {activeTab === 'sidewise' && (
        <ExpenseSideWiseTab sideWiseExpenses={sideWiseExpenses} formatCurrency={formatCurrency} />
      )}
      {activeTab === 'categories' && (
        <ExpenseCategoriesTab
          categoryAnalysis={categoryAnalysis}
          loading={loadingExpenses}
          formatCurrency={formatCurrency}
        />
      )}

      <EditVendorModal
        vendor={editingVendor}
        onClose={() => setEditingVendor(null)}
        onSubmit={handleVendorUpdate}
        isPending={updateVendorMutation.isPending}
      />

      <EditExpenseModal
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onSubmit={handleExpenseUpdate}
        isPending={updateExpenseMutation.isPending}
        vendors={vendors}
        canEdit={canEdit}
      />

      <AddExpenseModal
        show={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSubmit={handleExpenseSubmit}
        isPending={createExpenseMutation.isPending}
        vendors={vendors}
        canEdit={canEdit}
      />
    </div>
  );
}
