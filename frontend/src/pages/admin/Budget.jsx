import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { HiOutlinePlus, HiOutlineCurrencyRupee } from 'react-icons/hi';
import { useBudgetSummary, useBudgetOverview, useExpenses, usePendingPayments } from '../../hooks/useApi';

const COLORS = ['#8B0000', '#D4AF37', '#228B22', '#1A237E', '#E91E63', '#FF6F00', '#607D8B'];

export default function Budget() {
  const { canEdit, canViewFinance } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch data from API
  const { data: budgetSummary, isLoading: loadingSummary } = useBudgetSummary();
  const { data: budgetOverview, isLoading: loadingOverview } = useBudgetOverview();
  const { data: expenses, isLoading: loadingExpenses } = useExpenses();
  const { data: pendingPayments, isLoading: loadingPayments } = usePendingPayments();

  // Redirect if user doesn't have permission to view finance
  if (!canViewFinance) {
    return <Navigate to="/admin" replace />;
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Show loading state
  if (loadingSummary || loadingOverview) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading budget data...</div>
      </div>
    );
  }

  // Prepare data for charts
  const budgetData = {
    total: budgetSummary?.totalBudget || 0,
    brideContribution: budgetSummary?.brideContribution || 0,
    groomContribution: budgetSummary?.groomContribution || 0,
    spent: budgetSummary?.totalSpent || 0,
    pending: budgetSummary?.pendingPayments || 0
  };

  const categoryData = budgetOverview?.map(cat => ({
    name: cat.name,
    allocated: parseFloat(cat.allocated_amount || 0),
    spent: parseFloat(cat.spent || 0)
  })) || [];

  const pieData = categoryData.map((cat, i) => ({
    name: cat.name,
    value: cat.spent,
    color: COLORS[i % COLORS.length]
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Budget & Finance</h1>
        {canEdit && (
          <button className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-4 h-4" />
            Add Expense
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <HiOutlineCurrencyRupee className="w-8 h-8 text-gold-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-maroon-800">{formatCurrency(budgetData.total)}</div>
          <div className="text-sm text-gray-500">Total Budget</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(budgetData.spent)}</div>
          <div className="text-sm text-gray-500">Spent</div>
          <div className="text-xs text-gray-400 mt-1">
            {Math.round(budgetData.spent / budgetData.total * 100)}% used
          </div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(budgetData.total - budgetData.spent)}</div>
          <div className="text-sm text-gray-500">Remaining</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">{formatCurrency(budgetData.pending)}</div>
          <div className="text-sm text-gray-500">Pending Payments</div>
        </div>
      </div>

      {/* Contribution Split */}
      <div className="card">
        <h3 className="font-semibold text-maroon-800 mb-4">Family Contributions</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-pink-50 rounded-lg">
            <div className="text-sm text-pink-600 mb-1">Bride Side</div>
            <div className="text-xl font-bold text-pink-700">{formatCurrency(budgetData.brideContribution)}</div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-600 mb-1">Groom Side</div>
            <div className="text-xl font-bold text-blue-700">{formatCurrency(budgetData.groomContribution)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gold-200">
        {['overview', 'expenses', 'payments'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-2 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-maroon-800 border-b-2 border-maroon-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <div className="card">
            <h3 className="section-title mb-4">Spending by Category</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Budget vs Spent */}
          <div className="card">
            <h3 className="section-title mb-4">Allocated vs Spent</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => `₹${v/100000}L`} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="allocated" fill="#D4AF37" name="Allocated" />
                <Bar dataKey="spent" fill="#8B0000" name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="card overflow-hidden p-0">
          {loadingExpenses ? (
            <div className="p-8 text-center text-gray-500">Loading expenses...</div>
          ) : expenses && expenses.length > 0 ? (
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left p-4">Description</th>
                  <th className="text-left p-4">Category</th>
                  <th className="text-left p-4">Amount</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Paid By</th>
                  <th className="text-left p-4">Side</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="table-row">
                    <td className="p-4 font-medium">{expense.description}</td>
                    <td className="p-4 text-gray-600">{expense.budget_categories?.name || 'N/A'}</td>
                    <td className="p-4 font-medium text-maroon-800">{formatCurrency(expense.amount)}</td>
                    <td className="p-4 text-gray-600">{new Date(expense.expense_date).toLocaleDateString('en-IN')}</td>
                    <td className="p-4 text-gray-600">{expense.paid_by}</td>
                    <td className="p-4">
                      <span className={expense.side === 'bride' ? 'badge-bride' : 'badge-groom'}>
                        {expense.side === 'bride' ? 'Bride' : 'Groom'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">No expenses recorded yet.</div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="card">
          <h3 className="section-title mb-4">Pending Payments</h3>
          {loadingPayments ? (
            <div className="p-8 text-center text-gray-500">Loading pending payments...</div>
          ) : pendingPayments && pendingPayments.length > 0 ? (
            <div className="space-y-4">
              {pendingPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-800">{payment.vendors?.name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">Due: {new Date(payment.due_date).toLocaleDateString('en-IN')}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-red-600">{formatCurrency(payment.amount)}</span>
                    {canEdit && <button className="btn-primary text-sm py-2">Record Payment</button>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">No pending payments.</div>
          )}
        </div>
      )}
    </div>
  );
}
