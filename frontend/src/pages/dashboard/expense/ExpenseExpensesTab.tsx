import { useState } from 'react';
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

export interface ExpenseListRow {
  id: string;
  description: string;
  source_type: 'manual' | 'vendor' | 'venue';
  category_summary: string;
  committed: number;
  paid: number;
  outstanding: number;
  expense_date: string;
  side_key: 'bride' | 'groom' | 'shared' | 'mixed';
  side_label: string;
  item_count: number;
  status: 'active' | 'closed' | 'terminated';
  editable: boolean;
}

interface ExpenseExpensesTabProps {
  rows: ExpenseListRow[];
  loading: boolean;
  formatCurrency: (amount: number) => string;
  onEdit: (row: ExpenseListRow) => void;
  onDelete: (id: string) => void;
}

export default function ExpenseExpensesTab({
  rows,
  loading,
  formatCurrency,
  onEdit,
  onDelete,
}: ExpenseExpensesTabProps) {
  const [filterType, setFilterType] = useState<'all' | 'manual' | 'vendor' | 'venue'>('all');
  const [filterSide, setFilterSide] = useState<'all' | 'bride' | 'groom' | 'shared' | 'mixed'>(
    'all',
  );

  if (loading) {
    return <div className="card p-8 text-center text-gray-500">Loading expenses...</div>;
  }

  const filtered = rows.filter((row) => {
    if (filterType !== 'all' && row.source_type !== filterType) return false;
    if (filterSide !== 'all' && row.side_key !== filterSide) return false;
    return true;
  });

  const committedTotal = filtered.reduce((sum, row) => sum + row.committed, 0);

  if (!filtered.length && rows.length === 0) {
    return <div className="card p-8 text-center text-gray-500">No expenses recorded yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'manual', 'vendor', 'venue'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filterType === type
                  ? 'bg-white shadow text-maroon-800 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {type === 'all' ? 'All' : `${type.charAt(0).toUpperCase()}${type.slice(1)}s`}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'bride', 'groom', 'shared', 'mixed'] as const).map((side) => (
            <button
              key={side}
              onClick={() => setFilterSide(side)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filterSide === side
                  ? 'bg-white shadow text-maroon-800 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {side === 'all' ? 'All Sides' : `${side.charAt(0).toUpperCase()}${side.slice(1)}`}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          No entries match the selected filters.
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left p-4 min-w-[140px]">Description</th>
                  <th className="text-left p-4 hidden sm:table-cell">Categories</th>
                  <th className="text-left p-4">Source</th>
                  <th className="text-right p-4">Committed</th>
                  <th className="text-right p-4 hidden md:table-cell">Paid</th>
                  <th className="text-right p-4 hidden md:table-cell">Outstanding</th>
                  <th className="text-left p-4 hidden md:table-cell">Date</th>
                  <th className="text-left p-4">Side</th>
                  <th className="p-4 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="table-row group">
                    <td className="p-4 font-medium min-w-[140px]">
                      <div>{row.description}</div>
                      <div className="text-xs text-gray-400">{row.item_count} line items</div>
                    </td>
                    <td className="p-4 text-gray-600 hidden sm:table-cell">
                      {row.category_summary}
                    </td>
                    <td className="p-4">
                      <span className="badge text-xs bg-gray-100 text-gray-700 capitalize">
                        {row.source_type}
                      </span>
                    </td>
                    <td className="p-4 text-right font-medium text-maroon-800">
                      {formatCurrency(row.committed)}
                    </td>
                    <td className="p-4 text-right text-green-700 hidden md:table-cell">
                      {formatCurrency(row.paid)}
                    </td>
                    <td className="p-4 text-right text-orange-700 hidden md:table-cell">
                      {formatCurrency(row.outstanding)}
                    </td>
                    <td className="p-4 text-gray-600 hidden md:table-cell">
                      {new Date(row.expense_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-4">
                      <span className="badge bg-gray-100 text-gray-700">{row.side_label}</span>
                    </td>
                    <td className="p-4">
                      {row.editable && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEdit(row)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-maroon-700 hover:bg-maroon-50 transition-colors"
                            title="Edit expense"
                          >
                            <HiOutlinePencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(row.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete expense"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td colSpan={3} className="p-4">
                    Total Committed
                  </td>
                  <td className="p-4 text-right text-maroon-800">
                    {formatCurrency(committedTotal)}
                  </td>
                  <td colSpan={5}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
