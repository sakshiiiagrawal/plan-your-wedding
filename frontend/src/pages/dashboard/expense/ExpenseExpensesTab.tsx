/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

interface ExpenseExpensesTabProps {
  allExpenses: any[];
  loading: boolean;
  formatCurrency: (amount: number) => string;
  onEdit: (row: any) => void;
  onDelete: (id: string, type: 'expense' | 'vendor') => void;
}

export default function ExpenseExpensesTab({
  allExpenses,
  loading,
  formatCurrency,
  onEdit,
  onDelete,
}: ExpenseExpensesTabProps) {
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'vendor'>('all');
  const [filterSide, setFilterSide] = useState<'all' | 'bride' | 'groom' | 'shared'>('all');

  if (loading) {
    return <div className="card p-8 text-center text-gray-500">Loading expenses...</div>;
  }

  const filtered = allExpenses.filter((row) => {
    if (filterType !== 'all' && row.type !== filterType) return false;
    if (filterSide === 'shared' && !row.is_shared) return false;
    if (filterSide === 'bride' && (row.is_shared || row.side !== 'bride')) return false;
    if (filterSide === 'groom' && (row.is_shared || row.side !== 'groom')) return false;
    return true;
  });

  // Footer total only sums expense rows to avoid double-counting with vendor cost card
  const expenseTotal = filtered
    .filter((r) => r.type === 'expense')
    .reduce((s, r) => s + r.amount, 0);

  if (!filtered.length && allExpenses.length === 0) {
    return <div className="card p-8 text-center text-gray-500">No expenses recorded yet.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'expense', 'vendor'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filterType === t ? 'bg-white shadow text-maroon-800 font-medium' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'all' ? 'All Types' : t === 'expense' ? 'Expenses' : 'Vendor Costs'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'bride', 'groom', 'shared'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterSide(s)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filterSide === s ? 'bg-white shadow text-maroon-800 font-medium' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'all' ? 'All Sides' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        {filtered.length !== allExpenses.length && (
          <span className="text-sm text-gray-400">{filtered.length} of {allExpenses.length} shown</span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">No entries match the selected filters.</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left p-4 min-w-[120px]">Description</th>
                  <th className="text-left p-4 hidden sm:table-cell">Category</th>
                  <th className="text-left p-4">Type</th>
                  <th className="text-right p-4">Amount</th>
                  <th className="text-left p-4 hidden md:table-cell">Date</th>
                  <th className="text-left p-4 hidden md:table-cell">Paid By</th>
                  <th className="text-left p-4">Side</th>
                  <th className="p-4 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="table-row group">
                    <td className="p-4 font-medium min-w-[120px]">{row.description}</td>
                    <td className="p-4 text-gray-600 hidden sm:table-cell">{row.category}</td>
                    <td className="p-4">
                      <span
                        className={`badge text-xs ${row.type === 'vendor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
                      >
                        {row.type === 'vendor' ? 'Vendor' : 'Expense'}
                      </span>
                    </td>
                    <td className="p-4 text-right font-medium text-maroon-800">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="p-4 text-gray-600 hidden md:table-cell">
                      {row.date ? new Date(row.date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="p-4 text-gray-600 hidden md:table-cell">{row.paid_by || '—'}</td>
                    <td className="p-4">
                      {row.is_shared ? (
                        <span className="badge" style={{ backgroundColor: '#D4AF37', color: 'white' }}>
                          Shared {row.share_percentage ? `(${row.share_percentage}%)` : ''}
                        </span>
                      ) : (
                        <span className={row.side === 'bride' ? 'badge-bride' : 'badge-groom'}>
                          {row.side === 'bride' ? 'Bride' : 'Groom'}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(row)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-maroon-700 hover:bg-maroon-50 transition-colors"
                          title={`Edit ${row.type}`}
                        >
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        {row.type === 'expense' && (
                          <button
                            onClick={() => onDelete(row.id, row.type)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete expense"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td colSpan={3} className="p-4">
                    Expense Total
                    {filterType === 'all' && (
                      <span className="text-xs font-normal text-gray-400 ml-1">(expenses only)</span>
                    )}
                  </td>
                  <td className="p-4 text-right text-maroon-800">
                    {formatCurrency(expenseTotal)}
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
