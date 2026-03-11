import { useState, useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { HiOutlinePlus, HiOutlineCurrencyRupee } from 'react-icons/hi';
import { useBudgetSummary, useBudgetOverview, useExpenses, useCreateExpense, useUpdateExpense, useVendorBudgetSummary, useSideSummary, useVendors, useUpdateVendor } from '../../hooks/useApi';
import BudgetOverviewTab from './budget/BudgetOverviewTab';
import BudgetExpensesTab from './budget/BudgetExpensesTab';
import BudgetSideWiseTab from './budget/BudgetSideWiseTab';
import BudgetCategoriesTab from './budget/BudgetCategoriesTab';
import AddExpenseModal from './budget/AddExpenseModal';
import EditExpenseModal from './budget/EditExpenseModal';
import EditVendorModal from './budget/EditVendorModal';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'expenses',   label: 'Expenses' },
  { id: 'sidewise',   label: 'Side-wise' },
  { id: 'categories', label: 'Categories' },
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export default function Budget() {
  const { slug } = useParams();
  const { canEdit, canViewFinance } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);

  const { data: budgetSummary, isLoading: loadingSummary } = useBudgetSummary();
  const { data: budgetOverview, isLoading: loadingOverview } = useBudgetOverview();
  const { data: expenses, isLoading: loadingExpenses } = useExpenses();
  const { data: vendorBudgetData = [], isLoading: loadingVendorBudget } = useVendorBudgetSummary();
  const { data: sideSummary = { bride: { total: 0 }, groom: { total: 0 } } } = useSideSummary();
  const { data: vendors = [] } = useVendors();
  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const updateVendorMutation = useUpdateVendor();

  const vendorCostTotal = useMemo(
    () => vendorBudgetData.reduce((sum, v) => sum + (v.totalCost || 0), 0),
    [vendorBudgetData],
  );

  const allExpenses = useMemo(() => {
    const expenseRows = (expenses || []).map(e => ({
      id: e.id,
      type: 'expense',
      description: e.description,
      category: e.budget_categories?.name || 'N/A',
      amount: parseFloat(e.amount || 0),
      date: e.expense_date,
      paid_by: e.paid_by,
      side: e.side,
      is_shared: e.is_shared,
      share_percentage: e.share_percentage,
      // fields needed for editing
      category_id: e.category_id,
      expense_date: e.expense_date,
      payment_method: e.payment_method,
      vendor_id: e.vendor_id,
      event_id: e.event_id,
      paid_amount: e.paid_amount,
    }));
    const vendorRows = (vendorBudgetData || []).map(v => ({
      id: `vendor-${v.id}`,
      vendorId: v.id,
      type: 'vendor',
      description: v.name,
      category: v.category?.replace(/_/g, ' ') || 'Vendor',
      amount: v.totalCost || 0,
      date: null,
      paid_by: null,
      side: v.side,
      is_shared: v.is_shared,
      share_percentage: null,
    }));
    return [...expenseRows, ...vendorRows];
  }, [expenses, vendorBudgetData]);

  const categoryAnalysis = useMemo(() => {
    const analysis = {};
    (expenses || []).forEach(e => {
      const key = e.category_id || 'uncategorized';
      if (!analysis[key]) {
        analysis[key] = { name: e.budget_categories?.name || 'Uncategorized', total: 0, bride: 0, groom: 0, shared: 0, count: 0 };
      }
      const amount = parseFloat(e.amount || 0);
      analysis[key].total += amount;
      analysis[key].count++;
      if (e.is_shared) analysis[key].shared += amount;
      else if (e.side === 'bride') analysis[key].bride += amount;
      else analysis[key].groom += amount;
    });
    return Object.values(analysis).sort((a, b) => b.total - a.total);
  }, [expenses]);

  const sideWiseExpenses = useMemo(() => {
    const all = expenses || [];
    const bride = all.filter(e => !e.is_shared && e.side === 'bride');
    const groom = all.filter(e => !e.is_shared && e.side === 'groom');
    const shared = all.filter(e => e.is_shared);
    return {
      bride: { items: bride, total: bride.reduce((s, e) => s + parseFloat(e.amount || 0), 0) },
      groom: { items: groom, total: groom.reduce((s, e) => s + parseFloat(e.amount || 0), 0) },
      shared: { items: shared, total: shared.reduce((s, e) => s + parseFloat(e.amount || 0), 0) },
    };
  }, [expenses]);

  const handleVendorUpdate = async (id, payload) => {
    try {
      await updateVendorMutation.mutateAsync({ id, ...payload });
      toast.success('Vendor updated!');
      setEditingVendor(null);
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to update vendor';
      toast.error(msg);
    }
  };

  const handleExpenseUpdate = async (id, payload) => {
    try {
      await updateExpenseMutation.mutateAsync({ id, ...payload });
      toast.success('Expense updated!');
      setEditingExpense(null);
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to update expense';
      toast.error(msg);
    }
  };

  const handleExpenseSubmit = async (payload) => {
    try {
      await createExpenseMutation.mutateAsync(payload);
      toast.success('Expense added successfully!');
      setShowExpenseModal(false);
      setActiveTab('expenses');
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to add expense';
      toast.error(msg);
    }
  };

  if (!canViewFinance) return <Navigate to={`/${slug}/admin`} replace />;

  if (loadingSummary || loadingOverview) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading budget data...</div>
      </div>
    );
  }

  const total = budgetSummary?.totalBudget || 0;
  const spent = budgetSummary?.totalSpent || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="page-title">Budget & Finance</h1>
        {canEdit && (
          <button onClick={() => setShowExpenseModal(true)} className="btn-primary flex items-center gap-2">
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
          <div className="text-sm text-gray-500">Total Budget</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(spent)}</div>
          <div className="text-sm text-gray-500">Total Spent</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${Math.min(100, Math.round(spent / (total || 1) * 100))}%` }}
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
            <div className="text-xl font-bold text-pink-700">{formatCurrency(sideSummary.bride.total)}</div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-600 mb-1">Groom Side</div>
            <div className="text-xl font-bold text-blue-700">{formatCurrency(sideSummary.groom.total)}</div>
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
        <BudgetOverviewTab budgetOverview={budgetOverview} formatCurrency={formatCurrency} />
      )}
      {activeTab === 'expenses' && (
        <BudgetExpensesTab
          allExpenses={allExpenses}
          loading={loadingExpenses || loadingVendorBudget}
          formatCurrency={formatCurrency}
          canEdit={canEdit}
          onEdit={(row) => row.type === 'vendor' ? setEditingVendor(row) : setEditingExpense(row)}
        />
      )}
      {activeTab === 'sidewise' && (
        <BudgetSideWiseTab sideWiseExpenses={sideWiseExpenses} formatCurrency={formatCurrency} />
      )}
      {activeTab === 'categories' && (
        <BudgetCategoriesTab
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
