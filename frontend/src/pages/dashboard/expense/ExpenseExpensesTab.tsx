import { useState } from 'react';
import { HiOutlineArchive, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import { parseLocalDate } from '../../../utils/date';

type SortKey = 'date' | 'outstanding' | 'committed' | 'description';

export interface ExpenseListRow {
  id: string;
  description: string;
  source_type: 'manual' | 'vendor' | 'venue';
  category_summary: string;
  planned: number;
  committed: number;
  paid: number;
  outstanding: number;
  expense_date: string;
  side_key: 'bride' | 'groom' | 'shared' | 'mixed';
  side_label: string;
  item_count: number;
  status: 'active' | 'closed' | 'terminated';
  editable: boolean;
  has_payments: boolean;
}

interface ExpenseExpensesTabProps {
  rows: ExpenseListRow[];
  loading: boolean;
  formatCurrency: (amount: number) => string;
  onEdit: (row: ExpenseListRow) => void;
  onDelete: (id: string) => void;
  /** A5: payment-backed rows can't be deleted — they get closed instead. */
  onCloseExpense: (id: string) => void;
  /** C2: open the payments surface for a vendor/venue-sourced expense. */
  onViewPayments: (row: ExpenseListRow) => void;
  /** C7: empty-state call to action. */
  onAdd: () => void;
  /** Bride/groom liability side is only meaningful with budget:splits. */
  showSides?: boolean;
}

export default function ExpenseExpensesTab({
  rows,
  loading,
  formatCurrency,
  onEdit,
  onDelete,
  onCloseExpense,
  onViewPayments,
  onAdd,
  showSides = true,
}: ExpenseExpensesTabProps) {
  const [filterType, setFilterType] = useState<'all' | 'manual' | 'vendor' | 'venue'>('all');
  const [filterSide, setFilterSide] = useState<'all' | 'bride' | 'groom' | 'shared' | 'mixed'>(
    'all',
  );
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');

  if (loading) {
    return <div className="card p-8 text-center text-ink-low">Loading expenses...</div>;
  }

  const query = search.trim().toLowerCase();
  const filtered = rows
    .filter((row) => {
      if (filterType !== 'all' && row.source_type !== filterType) return false;
      if (filterSide !== 'all' && row.side_key !== filterSide) return false;
      if (
        query &&
        !row.description.toLowerCase().includes(query) &&
        !row.category_summary.toLowerCase().includes(query)
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortKey) {
        case 'outstanding':
          return b.outstanding - a.outstanding;
        case 'committed':
          return b.committed - a.committed;
        case 'description':
          return a.description.localeCompare(b.description);
        default:
          return parseLocalDate(b.expense_date).getTime() - parseLocalDate(a.expense_date).getTime();
      }
    });

  const plannedTotal = filtered.reduce((sum, row) => sum + row.planned, 0);
  const committedTotal = filtered.reduce((sum, row) => sum + row.committed, 0);
  const paidTotal = filtered.reduce((sum, row) => sum + row.paid, 0);
  const outstandingTotal = filtered.reduce((sum, row) => sum + row.outstanding, 0);

  if (rows.length === 0) {
    return (
      <div className="card p-8 text-center space-y-3">
        <div className="text-ink-low">No expenses recorded yet.</div>
        <button onClick={onAdd} className="btn-primary" style={{ fontSize: 13 }}>
          Add Expense
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-surface-highest rounded-lg p-1">
          {(['all', 'manual', 'vendor', 'venue'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              style={{
                padding: '4px 12px',
                fontSize: 13,
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'all 150ms',
                background: filterType === type ? 'white' : 'transparent',
                color: filterType === type ? 'var(--gold-deep)' : 'var(--ink-low)',
                fontWeight: filterType === type ? 600 : 400,
                boxShadow: filterType === type ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {type === 'all' ? 'All' : `${type.charAt(0).toUpperCase()}${type.slice(1)}s`}
            </button>
          ))}
        </div>
        {showSides && (
          <div className="flex gap-1 bg-surface-highest rounded-lg p-1">
            {(['all', 'bride', 'groom', 'shared', 'mixed'] as const).map((side) => (
              <button
                key={side}
                onClick={() => setFilterSide(side)}
                style={{
                  padding: '4px 12px',
                  fontSize: 13,
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  background: filterSide === side ? 'white' : 'transparent',
                  color: filterSide === side ? 'var(--gold-deep)' : 'var(--ink-low)',
                  fontWeight: filterSide === side ? 600 : 400,
                  boxShadow: filterSide === side ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {side === 'all' ? 'All Sides' : `${side.charAt(0).toUpperCase()}${side.slice(1)}`}
              </button>
            ))}
          </div>
        )}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search description or category…"
          className="input"
          style={{ flex: 1, minWidth: 180, maxWidth: 320 }}
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="input"
          style={{ width: 'auto' }}
        >
          <option value="date">Newest first</option>
          <option value="outstanding">Outstanding</option>
          <option value="committed">Allocated</option>
          <option value="description">Description A–Z</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-ink-low">
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
                  <th className="text-right p-4 hidden md:table-cell">Planned</th>
                  <th className="text-right p-4">Allocated</th>
                  <th className="text-right p-4 hidden md:table-cell">Paid</th>
                  <th className="text-right p-4 hidden md:table-cell">Outstanding</th>
                  <th className="text-left p-4 hidden md:table-cell">Date</th>
                  {showSides && <th className="text-left p-4">Side</th>}
                  <th className="p-4 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="table-row group"
                    style={row.status !== 'active' ? { opacity: 0.6 } : undefined}
                  >
                    <td className="p-4 font-medium min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <span>{row.description}</span>
                        {row.status !== 'active' && (
                          <span className="badge text-xs bg-surface-highest text-ink-mid capitalize">
                            {row.status}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ink-low">{row.item_count} line items</div>
                      {/* The Planned/Paid/Outstanding columns are hidden below md —
                          keep the full money story readable on phones. */}
                      <div className="text-xs md:hidden mt-1 space-x-2">
                        {row.planned > 0 && (
                          <span className="text-ink-mid">
                            Planned {formatCurrency(row.planned)}
                          </span>
                        )}
                        <span className="text-green-700">Paid {formatCurrency(row.paid)}</span>
                        <span className="text-orange-700">
                          Outstanding {formatCurrency(row.outstanding)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-ink-mid hidden sm:table-cell">
                      {row.category_summary}
                    </td>
                    <td className="p-4">
                      <span className="badge text-xs bg-surface-highest text-ink-mid capitalize">
                        {row.source_type}
                      </span>
                    </td>
                    <td className="p-4 text-right text-ink-mid hidden md:table-cell">
                      {formatCurrency(row.planned)}
                    </td>
                    <td
                      className="p-4 text-right font-medium"
                      style={{ color: 'var(--gold-deep)' }}
                    >
                      {formatCurrency(row.committed)}
                    </td>
                    <td className="p-4 text-right text-green-700 hidden md:table-cell">
                      {formatCurrency(row.paid)}
                    </td>
                    <td className="p-4 text-right text-orange-700 hidden md:table-cell">
                      {formatCurrency(row.outstanding)}
                    </td>
                    <td className="p-4 text-ink-mid hidden md:table-cell">
                      {parseLocalDate(row.expense_date).toLocaleDateString('en-IN')}
                    </td>
                    {showSides && (
                      <td className="p-4">
                        <span className="badge bg-surface-highest text-ink-mid">
                          {row.side_label}
                        </span>
                      </td>
                    )}
                    <td className="p-4">
                      {row.source_type !== 'manual' && (
                        <div className="flex flex-col items-end gap-0.5">
                          <button
                            onClick={() => onViewPayments(row)}
                            className="text-xs font-medium"
                            style={{ color: 'var(--gold-deep)', background: 'transparent', cursor: 'pointer' }}
                          >
                            Payments
                          </button>
                          <span className="text-[10px] text-ink-low">
                            Managed from {row.source_type === 'vendor' ? 'Vendors' : 'Venues'}
                          </span>
                        </div>
                      )}
                      {row.editable && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => onEdit(row)}
                            style={{
                              padding: '5px 7px',
                              borderRadius: 6,
                              color: 'var(--ink-dim)',
                              background: 'transparent',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background =
                                'var(--gold-glow)';
                              (e.currentTarget as HTMLElement).style.color = 'var(--gold-deep)';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = 'transparent';
                              (e.currentTarget as HTMLElement).style.color = 'var(--ink-dim)';
                            }}
                            title="Edit expense"
                          >
                            <HiOutlinePencil className="w-4 h-4" />
                          </button>
                          {row.status === 'active' &&
                            (row.has_payments ? (
                              <button
                                onClick={() => onCloseExpense(row.id)}
                                className="p-1.5 rounded-lg text-ink-dim hover:text-gold-deep hover:bg-surface-highest transition-colors"
                                title="Close expense (has payments — can't be deleted)"
                              >
                                <HiOutlineArchive className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => onDelete(row.id)}
                                className="p-1.5 rounded-lg text-ink-dim hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete expense"
                              >
                                <HiOutlineTrash className="w-4 h-4" />
                              </button>
                            ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-highest font-bold">
                <tr>
                  <td className="p-4 min-w-[140px]">
                    Total
                    <div className="text-xs font-normal md:hidden mt-1 space-x-2">
                      {plannedTotal > 0 && (
                        <span className="text-ink-mid">Planned {formatCurrency(plannedTotal)}</span>
                      )}
                      <span className="text-green-700">Paid {formatCurrency(paidTotal)}</span>
                      <span className="text-orange-700">
                        Outstanding {formatCurrency(outstandingTotal)}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 hidden sm:table-cell" />
                  <td className="p-4" />
                  <td className="p-4 text-right text-ink-mid hidden md:table-cell">
                    {formatCurrency(plannedTotal)}
                  </td>
                  <td className="p-4 text-right" style={{ color: 'var(--gold-deep)' }}>
                    {formatCurrency(committedTotal)}
                  </td>
                  <td className="p-4 text-right text-green-700 hidden md:table-cell">
                    {formatCurrency(paidTotal)}
                  </td>
                  <td className="p-4 text-right text-orange-700 hidden md:table-cell">
                    {formatCurrency(outstandingTotal)}
                  </td>
                  <td className="p-4 hidden md:table-cell" />
                  {showSides && <td className="p-4" />}
                  <td className="p-4" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
