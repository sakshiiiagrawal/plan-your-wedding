import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  useDeleteExpensePayment,
  useExpenseOutstanding,
  useExpensePayments,
  useUpdateExpensePayment,
  type FinanceTimelinePayment,
} from '../../../hooks/useApi';
import { useUrlFilters } from '../../../hooks/useUrlFilters';
import { Pagination } from '../../../components/ui/Pagination';
import { SegmentedControl } from '../../../components/ui';
import { sideLabel } from '../../../utils/sideLabels';
import { parseLocalDate } from '../../../utils/date';
import { financeTier } from '@wedding-planner/shared';
import { useAuth } from '../../../contexts/AuthContext';
import PaymentAttachments from '../../../components/finance/PaymentAttachments';
import MarkPaidDialog, { type MarkPaidResult } from '../../../components/finance/MarkPaidDialog';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

interface ExpensePaymentsTabProps {
  formatCurrency: (amount: number) => string;
  /** C4: open the payment surface for an expense (manual → edit modal, source → payments modal). */
  onRecordPayment: (expenseId: string) => void;
}

// Module-level (stable reference) so useUrlFilters doesn't recompute on every render.
const PAYMENTS_FILTER_DEFAULTS = {
  side: 'all',
  sub_tab: 'outstanding',
  owed_page: 1,
  history_page: 1,
};
const LIST_PER_PAGE = 10;

function formatPaymentAmount(
  amount: number,
  direction: 'outflow' | 'inflow',
  formatCurrency: (amount: number) => string,
) {
  return `${direction === 'inflow' ? '-' : ''}${formatCurrency(amount)}`;
}

function scheduleBadge(paymentDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseLocalDate(paymentDate);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">
        Overdue
      </span>
    );
  }
  if (diffDays === 0) {
    return (
      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">
        Due today
      </span>
    );
  }
  if (diffDays <= 7) {
    return (
      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">
        Due in {diffDays}d
      </span>
    );
  }
  return null;
}

function paidBySideLabel(payment: FinanceTimelinePayment) {
  if (payment.paid_by_side === 'shared' && payment.paid_bride_share_percentage != null) {
    return `Bride ${payment.paid_bride_share_percentage}% · Groom ${100 - payment.paid_bride_share_percentage}%`;
  }
  return payment.paid_by_side ? sideLabel(payment.paid_by_side) : null;
}

function CardHeader({
  title,
  right,
  sub,
}: {
  title: string;
  right?: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3 border-b border-line-soft">
      <div className="flex items-baseline justify-between gap-3">
        <h3 style={{ fontWeight: 600, color: 'var(--ink-high)', fontSize: 14 }}>{title}</h3>
        {right}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-ink-dim">{sub}</div>}
    </div>
  );
}

export default function ExpensePaymentsTab({
  formatCurrency,
  onRecordPayment,
}: ExpensePaymentsTabProps) {
  const { user } = useAuth();
  const canSeeSplits = financeTier(user) === 'full';
  const [filters, setFilters] = useUrlFilters(PAYMENTS_FILTER_DEFAULTS);
  const filterSide = filters.side;
  const subTab = filters.sub_tab as 'outstanding' | 'paid';
  const setSubTab = (v: 'outstanding' | 'paid') => setFilters({ sub_tab: v });
  // Side affects both paginated lists — reset both back to page 1.
  const setFilterSide = (v: string) =>
    setFilters({ side: v, owed_page: 1, history_page: 1 });

  const sideParam = filterSide !== 'all' ? filterSide : undefined;

  const { data: scheduledResponse, isLoading: loadingScheduled } = useExpensePayments({
    status: 'scheduled',
    side: sideParam,
  });
  const {
    data: historyResponse,
    isLoading: loadingHistory,
    isFetching: fetchingHistory,
  } = useExpensePayments({
    status: 'posted',
    side: sideParam,
    page: filters.history_page,
    per_page: LIST_PER_PAGE,
  });
  const {
    data: outstandingResponse,
    isLoading: loadingOutstanding,
    isFetching: fetchingOutstanding,
  } = useExpenseOutstanding({ page: filters.owed_page, per_page: LIST_PER_PAGE });

  const updatePayment = useUpdateExpensePayment();
  const deletePayment = useDeleteExpensePayment();
  const [markPaidTarget, setMarkPaidTarget] = useState<FinanceTimelinePayment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinanceTimelinePayment | null>(null);

  if (loadingScheduled || loadingHistory || loadingOutstanding) {
    return <div className="card p-8 text-center text-ink-low">Loading payments...</div>;
  }

  // Scheduled is fetched with no page/per_page → always the plain-array branch.
  const scheduledPayments = Array.isArray(scheduledResponse) ? scheduledResponse : [];
  const postedPayments = historyResponse && !Array.isArray(historyResponse) ? historyResponse.items : [];
  const historyTotalItems = historyResponse && !Array.isArray(historyResponse) ? historyResponse.total_items : 0;
  const owedItems = outstandingResponse?.items ?? [];

  // Net paid across every posted payment (not just the current page) — a
  // whole-history KPI, computed server-side would need a new aggregate; this
  // page's total row already reflects only what's currently loaded. Keep the
  // page-scoped sum, matching the Expenses tab's "Page total" convention.
  const paidTotal = postedPayments.reduce(
    (sum, payment) => sum + (payment.direction === 'inflow' ? -payment.amount : payment.amount),
    0,
  );
  // Outflow-only — this is what's carved out of Outstanding by the schedule.
  const scheduledOutflowTotal = scheduledPayments
    .filter((payment) => payment.direction === 'outflow')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalOutstanding = outstandingResponse?.totalOutstanding ?? 0;
  const unscheduled = Number((totalOutstanding - scheduledOutflowTotal).toFixed(2));

  const confirmMarkPaid = async (result: MarkPaidResult) => {
    if (!markPaidTarget) return;
    try {
      await updatePayment.mutateAsync({
        paymentId: markPaidTarget.id,
        status: 'posted',
        paid_date: result.paid_date,
        payment_method: result.payment_method,
        amount: result.amount,
      });
      toast.success('Payment recorded.');
      setMarkPaidTarget(null);
    } catch (error) {
      const apiError = error as { response?: { data?: { error?: string; message?: string } } };
      toast.error(
        apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          'Failed to mark payment as paid.',
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePayment.mutateAsync({
        expenseId: deleteTarget.expense_id,
        paymentId: deleteTarget.id,
      });
      toast.success('Scheduled payment deleted.');
      setDeleteTarget(null);
    } catch (error) {
      const apiError = error as { response?: { data?: { error?: string; message?: string } } };
      toast.error(
        apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          'Failed to delete payment.',
      );
    }
  };

  const hasUpcoming = scheduledPayments.length > 0;
  const hasOwed = owedItems.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          options={[
            { value: 'outstanding', label: 'Outstanding' },
            { value: 'paid', label: 'Paid' },
          ]}
          value={subTab}
          onChange={setSubTab}
        />

        {canSeeSplits && (
          <SegmentedControl
            options={[
              { value: 'all', label: 'All Sides' },
              { value: 'bride', label: sideLabel('bride') },
              { value: 'groom', label: sideLabel('groom') },
              { value: 'shared', label: sideLabel('shared') },
            ]}
            value={filterSide}
            onChange={setFilterSide}
          />
        )}
      </div>

      {subTab === 'outstanding' && (hasUpcoming || hasOwed) && (
        <div
          className={`grid grid-cols-1 gap-4 items-start ${hasUpcoming && hasOwed ? 'lg:grid-cols-2' : ''}`}
        >
          {/* ── Scheduled: the actionable queue ── */}
          {hasUpcoming && (
            <div id="scheduled-payments" className="card overflow-hidden p-0">
              <CardHeader
                title="Scheduled"
                right={
                  <span className="mono text-sm font-semibold" style={{ color: 'var(--info)' }}>
                    {formatCurrency(scheduledOutflowTotal)}
                  </span>
                }
                sub="Scheduled payments, next due first — already counted in Outstanding."
              />
              <div className="divide-y divide-line-soft">
                {scheduledPayments.map((payment) => {
                  const dueDate = payment.due_date ?? payment.created_at;
                  const sideText = canSeeSplits ? paidBySideLabel(payment) : null;
                  return (
                    <div key={payment.id} className="px-4 py-3 flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-ink-high">
                            {payment.expense.description}
                          </span>
                          {scheduleBadge(dueDate)}
                        </div>
                        <div className="mt-0.5 text-xs text-ink-low">
                          {parseLocalDate(dueDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {sideText ? ` · ${sideText}` : ''}
                          {payment.notes ? ` · ${payment.notes}` : ''}
                        </div>
                        <div className="mt-1">
                          <PaymentAttachments paymentId={payment.id} />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className="mono text-sm font-semibold"
                          style={{ color: 'var(--gold-deep)' }}
                        >
                          {formatPaymentAmount(payment.amount, payment.direction, formatCurrency)}
                        </span>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setMarkPaidTarget(payment)}
                            className="text-xs font-medium text-green-700 hover:underline"
                          >
                            Mark paid
                          </button>
                          <button
                            onClick={() => setDeleteTarget(payment)}
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Outstanding: what's still owed, and where to settle it ── */}
          {hasOwed && (
            <div id="outstanding-balances" className="card overflow-hidden p-0">
              <CardHeader
                title="Still Owed"
                right={
                  <span className="mono text-sm font-semibold" style={{ color: 'var(--warn)' }}>
                    {formatCurrency(totalOutstanding)}
                  </span>
                }
                sub={
                  unscheduled < 0
                    ? `Over-scheduled by ${formatCurrency(Math.abs(unscheduled))} — more is scheduled than owed.`
                    : unscheduled > 0
                      ? `${formatCurrency(unscheduled)} has no scheduled payment yet.`
                      : 'Every rupee owed has a scheduled payment.'
                }
              />
              <div className="divide-y divide-line-soft">
                {owedItems.map((item) => (
                  <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink-high truncate">{item.name}</div>
                      <div className="mt-0.5 text-xs text-ink-low capitalize">
                        {item.type} · paid {formatCurrency(item.paid)} of{' '}
                        {formatCurrency(item.totalCost)}
                      </div>
                    </div>
                    <span
                      className="mono text-sm font-semibold shrink-0"
                      style={{ color: 'var(--warn)' }}
                    >
                      {formatCurrency(item.outstanding)}
                    </span>
                    <button
                      onClick={() => onRecordPayment(item.expense_id)}
                      className="text-xs font-medium whitespace-nowrap shrink-0"
                      style={{ color: 'var(--gold-deep)' }}
                    >
                      Record →
                    </button>
                  </div>
                ))}
              </div>
              {outstandingResponse && outstandingResponse.total_items > LIST_PER_PAGE && (
                <div className="p-2.5 border-t border-line-soft">
                  <Pagination
                    page={outstandingResponse.page}
                    perPage={outstandingResponse.per_page}
                    totalPages={outstandingResponse.total_pages}
                    totalItems={outstandingResponse.total_items}
                    itemCountOnPage={owedItems.length}
                    itemLabel="owed"
                    onPageChange={(page) => setFilters({ owed_page: page })}
                    isFetching={fetchingOutstanding}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {subTab === 'outstanding' && !hasUpcoming && !hasOwed && (
        <div className="card p-8 text-center text-ink-dim text-sm">
          Nothing outstanding — every expense is fully paid.
        </div>
      )}

      {/* ── History: the ledger ── */}
      {subTab === 'paid' && (
        <div className="card overflow-hidden p-0">
          <CardHeader
            title="Payment History"
            right={
              postedPayments.length > 0 ? (
                <span className="text-xs text-ink-low">
                  Net paid (this page){' '}
                  <span className="mono text-sm font-semibold" style={{ color: 'var(--ok)' }}>
                    {formatCurrency(paidTotal)}
                  </span>
                </span>
              ) : undefined
            }
          />
          {postedPayments.length === 0 ? (
            <div className="p-8 text-center text-ink-dim text-sm">
              {filterSide === 'all'
                ? 'No payments recorded yet.'
                : `No ${sideLabel(filterSide).toLowerCase()} payments recorded yet.`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    <th className="text-left p-3 pl-4">Date</th>
                    <th className="text-left p-3">Expense</th>
                    <th className="text-left p-3 hidden sm:table-cell">Method</th>
                    {canSeeSplits && (
                      <th className="text-left p-3 hidden md:table-cell">Paid By</th>
                    )}
                    <th className="text-right p-3">Amount</th>
                    <th className="text-left p-3">Receipts</th>
                  </tr>
                </thead>
                <tbody>
                  {postedPayments.map((payment) => (
                    <tr key={payment.id} className="table-row">
                      <td className="p-3 pl-4 text-ink-mid whitespace-nowrap">
                        {parseLocalDate(
                          payment.paid_date ?? payment.created_at,
                        ).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{payment.expense.description}</div>
                        {(payment.transaction_reference || payment.notes) && (
                          <div className="text-xs text-ink-low">
                            {[payment.transaction_reference, payment.notes]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-ink-mid capitalize hidden sm:table-cell">
                        {payment.payment_method?.replace('_', ' ') || '—'}
                      </td>
                      {canSeeSplits && (
                        <td className="p-3 text-ink-mid hidden md:table-cell">
                          {paidBySideLabel(payment) ?? '—'}
                        </td>
                      )}
                      <td
                        className="p-3 text-right font-medium mono whitespace-nowrap"
                        style={{
                          color: payment.direction === 'inflow' ? 'var(--info)' : 'var(--ok)',
                        }}
                      >
                        {formatPaymentAmount(payment.amount, payment.direction, formatCurrency)}
                      </td>
                      <td className="p-3">
                        <PaymentAttachments paymentId={payment.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {historyResponse && !Array.isArray(historyResponse) && historyTotalItems > LIST_PER_PAGE && (
                <div className="p-3 border-t border-line-soft">
                  <Pagination
                    page={historyResponse.page}
                    perPage={historyResponse.per_page}
                    totalPages={historyResponse.total_pages}
                    totalItems={historyResponse.total_items}
                    itemCountOnPage={postedPayments.length}
                    itemLabel="payments"
                    onPageChange={(page) => setFilters({ history_page: page })}
                    isFetching={fetchingHistory}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {markPaidTarget && (
        <MarkPaidDialog
          payment={markPaidTarget}
          isPending={updatePayment.isPending}
          onConfirm={confirmMarkPaid}
          onCancel={() => setMarkPaidTarget(null)}
        />
      )}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete scheduled payment"
        message={
          deleteTarget
            ? `Delete the scheduled ${formatCurrency(deleteTarget.amount)} payment? This can't be undone.`
            : ''
        }
        confirmLabel="Delete"
        isPending={deletePayment.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
