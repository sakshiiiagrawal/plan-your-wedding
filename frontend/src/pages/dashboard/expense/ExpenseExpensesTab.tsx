import { HiOutlineArchive, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import { parseLocalDate } from '../../../utils/date';
import { Pagination } from '../../../components/ui/Pagination';
import { SegmentedControl } from '../../../components/ui';
import { sideLabel } from '../../../utils/sideLabels';

export type ExpenseSortKey = 'date' | 'outstanding' | 'committed' | 'description';
export type ExpenseTypeFilter = 'all' | 'manual' | 'vendor' | 'venue';
export type ExpenseSideFilter = 'all' | 'bride' | 'groom' | 'shared' | 'mixed';

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
  has_payments: boolean;
}

interface ExpenseExpensesTabProps {
  rows: ExpenseListRow[];
  loading: boolean;
  isFetching: boolean;
  /** Whether the wedding has any expenses at all, regardless of the current filters. */
  hasAnyExpenses: boolean;
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
  filterType: ExpenseTypeFilter;
  onFilterTypeChange: (v: ExpenseTypeFilter) => void;
  filterSide: ExpenseSideFilter;
  onFilterSideChange: (v: ExpenseSideFilter) => void;
  search: string;
  onSearchChange: (v: string) => void;
  sortKey: ExpenseSortKey;
  onSortKeyChange: (v: ExpenseSortKey) => void;
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export default function ExpenseExpensesTab({
  rows,
  loading,
  isFetching,
  hasAnyExpenses,
  formatCurrency,
  onEdit,
  onDelete,
  onCloseExpense,
  onViewPayments,
  onAdd,
  showSides = true,
  filterType,
  onFilterTypeChange,
  filterSide,
  onFilterSideChange,
  search,
  onSearchChange,
  sortKey,
  onSortKeyChange,
  page,
  perPage,
  totalPages,
  totalItems,
  onPageChange,
}: ExpenseExpensesTabProps) {
  if (loading) {
    return <div className="card p-8 text-center text-ink-low">Loading expenses...</div>;
  }

  // Page-scoped sums — server-side pagination means we only have the
  // current page's rows client-side, not the whole filtered set.
  const committedTotal = rows.reduce((sum, row) => sum + row.committed, 0);
  const paidTotal = rows.reduce((sum, row) => sum + row.paid, 0);
  const outstandingTotal = rows.reduce((sum, row) => sum + row.outstanding, 0);

  if (!hasAnyExpenses) {
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
        <SegmentedControl
          options={[
            { value: 'all', label: 'All' },
            { value: 'manual', label: 'Manuals' },
            { value: 'vendor', label: 'Vendors' },
            { value: 'venue', label: 'Venues' },
          ]}
          value={filterType}
          onChange={onFilterTypeChange}
        />
        {showSides && (
          <SegmentedControl
            options={[
              { value: 'all', label: 'All Sides' },
              { value: 'bride', label: sideLabel('bride') },
              { value: 'groom', label: sideLabel('groom') },
              { value: 'shared', label: sideLabel('shared') },
              { value: 'mixed', label: sideLabel('mixed') },
            ]}
            value={filterSide}
            onChange={onFilterSideChange}
          />
        )}
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search description…"
          className="input"
          style={{ flex: 1, minWidth: 180, maxWidth: 320 }}
        />
        <select
          value={sortKey}
          onChange={(e) => onSortKeyChange(e.target.value as ExpenseSortKey)}
          className="input"
          style={{ width: 'auto' }}
        >
          <option value="date">Newest first</option>
          <option value="outstanding">Outstanding</option>
          <option value="committed">Allocated</option>
          <option value="description">Description A–Z</option>
        </select>
      </div>

      {rows.length === 0 ? (
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
                  <th className="text-right p-4">Allocated</th>
                  <th className="text-right p-4 hidden md:table-cell">Paid</th>
                  <th className="text-right p-4 hidden md:table-cell">Outstanding</th>
                  <th className="text-left p-4 hidden md:table-cell">Date</th>
                  {showSides && <th className="text-left p-4">Side</th>}
                  <th className="p-4 w-20" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
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
                      {/* The Paid/Outstanding columns are hidden below md —
                          keep the full money story readable on phones. */}
                      <div className="text-xs md:hidden mt-1 space-x-2">
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
                    Page total
                    <div className="text-xs font-normal md:hidden mt-1 space-x-2">
                      <span className="text-green-700">Paid {formatCurrency(paidTotal)}</span>
                      <span className="text-orange-700">
                        Outstanding {formatCurrency(outstandingTotal)}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 hidden sm:table-cell" />
                  <td className="p-4" />
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

      {totalItems > 0 && (
        <Pagination
          page={page}
          perPage={perPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemCountOnPage={rows.length}
          itemLabel="expenses"
          onPageChange={onPageChange}
          isFetching={isFetching}
        />
      )}
    </div>
  );
}
