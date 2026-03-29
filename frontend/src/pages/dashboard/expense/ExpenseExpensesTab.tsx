/* eslint-disable @typescript-eslint/no-explicit-any */
import { HiOutlinePencil } from 'react-icons/hi';

interface ExpenseExpensesTabProps {
  allExpenses: any[];
  loading: boolean;
  formatCurrency: (amount: number) => string;
  onEdit: (row: any) => void;
}

export default function ExpenseExpensesTab({
  allExpenses,
  loading,
  formatCurrency,
  onEdit,
}: ExpenseExpensesTabProps) {
  if (loading) {
    return <div className="card p-8 text-center text-gray-500">Loading expenses...</div>;
  }

  if (!allExpenses.length) {
    return <div className="card p-8 text-center text-gray-500">No expenses recorded yet.</div>;
  }

  return (
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
              <th className="p-4 w-10" />
            </tr>
          </thead>
          <tbody>
            {allExpenses.map((row) => (
              <tr key={row.id} className="table-row group">
                <td className="p-4 font-medium min-w-[120px]">{row.description}</td>
                <td className="p-4 text-gray-600 capitalize hidden sm:table-cell">
                  {row.category}
                </td>
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
                  <button
                    onClick={() => onEdit(row)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-maroon-700 hover:bg-maroon-50 transition-colors opacity-0 group-hover:opacity-100"
                    title={`Edit ${row.type}`}
                  >
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 font-bold">
            <tr>
              <td colSpan={3} className="p-4">
                Total
              </td>
              <td className="p-4 text-right text-maroon-800">
                {formatCurrency(allExpenses.reduce((s, r) => s + r.amount, 0))}
              </td>
              <td colSpan={4}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
