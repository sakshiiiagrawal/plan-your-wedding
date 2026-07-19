import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  useDeleteExpensePayment,
  useExpenseOutstanding,
  useExpensePayments,
  useUpdateExpensePayment,
  type FinanceTimelinePayment,
} from '../../../hooks/useApi';
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
  if (diffDays <= 7) {
    return (
      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">
        Due in {diffDays}d
      </span>
    );
  }
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded"
      style={{ background: 'var(--info-soft)', color: 'var(--info)' }}
    >
      Scheduled
    </span>
  );
}

export default function ExpensePaymentsTab({
  formatCurrency,
  onRecordPayment,
}: ExpensePaymentsTabProps) {
  const { user } = useAuth();
  const canSeeSplits = financeTier(user) === 'full';
  const { data: payments = [], isLoading: loadingPayments } = useExpensePayments();
  const { data: outstanding, isLoading: loadingOutstanding } = useExpenseOutstanding();
  const updatePayment = useUpdateExpensePayment();
  const deletePayment = useDeleteExpensePayment();
  const [markPaidTarget, setMarkPaidTarget] = useState<FinanceTimelinePayment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinanceTimelinePayment | null>(null);

  if (loadingPayments || loadingOutstanding) {
    return <div className="card p-8 text-center text-ink-low">Loading payments...</div>;
  }

  const postedPayments = payments.filter((payment) => payment.status === 'posted');
  const scheduledPayments = payments.filter((payment) => payment.status === 'scheduled');
  const paidTotal = postedPayments.reduce(
    (sum, payment) => sum + (payment.direction === 'inflow' ? -payment.amount : payment.amount),
    0,
  );
  const scheduledTotal = scheduledPayments.reduce(
    (sum, payment) => sum + (payment.direction === 'inflow' ? -payment.amount : payment.amount),
    0,
  );
  // Outflow-only — this is what's carved out of Outstanding by the schedule.
  const scheduledOutflowTotal = scheduledPayments
    .filter((payment) => payment.direction === 'outflow')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalOutstanding = outstanding?.totalOutstanding ?? 0;
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(paidTotal)}</div>
          <div className="text-sm text-ink-low">Net Paid</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold" style={{ color: 'var(--info)' }}>
            {formatCurrency(scheduledTotal)}
          </div>
          <div className="text-sm text-ink-low">Scheduled</div>
          <div className="text-[11px] text-ink-dim mt-0.5">already part of Outstanding</div>
        </div>
        <div className="card text-center">
          <div
            className={`text-2xl font-bold ${
              totalOutstanding > 0 ? 'text-orange-600' : 'text-ink-dim'
            }`}
          >
            {formatCurrency(totalOutstanding)}
          </div>
          <div className="text-sm text-ink-low">Outstanding</div>
        </div>
        <div className="card text-center">
          {unscheduled < 0 ? (
            <>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(Math.abs(unscheduled))}
              </div>
              <div className="text-sm text-ink-low">Over-scheduled by</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-ink-mid">{formatCurrency(unscheduled)}</div>
              <div className="text-sm text-ink-low">Unscheduled</div>
            </>
          )}
        </div>
      </div>

      {scheduledPayments.length > 0 && (
        <div id="scheduled-payments" className="card overflow-hidden p-0">
          <div
            className="p-4 border-b border-line-soft"
            style={{ background: 'var(--info-soft)' }}
          >
            <h3 className="font-semibold" style={{ color: 'var(--info)' }}>
              Scheduled Payments
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left p-4">Expense</th>
                  <th className="text-left p-4">Source</th>
                  <th className="text-right p-4">Amount</th>
                  {canSeeSplits && <th className="text-left p-4">Paid By</th>}
                  <th className="text-left p-4">Due Date</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4 hidden md:table-cell">Notes</th>
                  <th className="text-left p-4">Receipts</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduledPayments
                  .sort(
                    (left, right) =>
                      parseLocalDate(left.due_date ?? left.created_at).getTime() -
                      parseLocalDate(right.due_date ?? right.created_at).getTime(),
                  )
                  .map((payment) => (
                    <tr key={payment.id} className="table-row">
                      <td className="p-4 font-medium">
                        {payment.expense.description}
                        {payment.notes && (
                          <div className="text-xs text-ink-low md:hidden">{payment.notes}</div>
                        )}
                      </td>
                      <td className="p-4 text-ink-low capitalize">
                        {payment.expense.source_type}
                      </td>
                      <td
                        className="p-4 text-right font-medium"
                        style={{ color: 'var(--gold-deep)' }}
                      >
                        {formatPaymentAmount(payment.amount, payment.direction, formatCurrency)}
                      </td>
                      {canSeeSplits && (
                        <td className="p-4 text-ink-mid capitalize">
                          {payment.paid_by_side === 'shared' &&
                          payment.paid_bride_share_percentage != null
                            ? `Bride ${payment.paid_bride_share_percentage}% · Groom ${100 - payment.paid_bride_share_percentage}%`
                            : payment.paid_by_side || '—'}
                        </td>
                      )}
                      <td className="p-4 text-ink-mid">
                        {parseLocalDate(payment.due_date ?? payment.created_at).toLocaleDateString(
                          'en-IN',
                        )}
                      </td>
                      <td className="p-4">
                        {scheduleBadge(payment.due_date ?? payment.created_at)}
                      </td>
                      <td className="p-4 text-ink-low text-sm hidden md:table-cell">
                        {payment.notes || '—'}
                      </td>
                      <td className="p-4">
                        <PaymentAttachments paymentId={payment.id} />
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-3 whitespace-nowrap">
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
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-soft)' }}>
          <h3 style={{ fontWeight: 600, color: 'var(--ink-high)', fontSize: 14 }}>
            Payment History
          </h3>
        </div>
        {postedPayments.length === 0 ? (
          <div className="p-8 text-center text-ink-dim text-sm">No payments recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left p-4">Expense</th>
                  <th className="text-left p-4">Source</th>
                  <th className="text-right p-4">Amount</th>
                  {canSeeSplits && <th className="text-left p-4">Paid By</th>}
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Method</th>
                  <th className="text-left p-4 hidden md:table-cell">Reference</th>
                  <th className="text-left p-4 hidden md:table-cell">Notes</th>
                  <th className="text-left p-4">Receipts</th>
                </tr>
              </thead>
              <tbody>
                {postedPayments
                  .sort(
                    (left, right) =>
                      parseLocalDate(right.paid_date ?? right.created_at).getTime() -
                      parseLocalDate(left.paid_date ?? left.created_at).getTime(),
                  )
                  .map((payment) => (
                    <tr key={payment.id} className="table-row">
                      <td className="p-4 font-medium">{payment.expense.description}</td>
                      <td className="p-4 text-ink-low capitalize">
                        {payment.expense.source_type}
                      </td>
                      <td
                        className="p-4 text-right font-medium"
                        style={{
                          color: payment.direction === 'inflow' ? 'var(--info)' : 'var(--ok)',
                        }}
                      >
                        {formatPaymentAmount(payment.amount, payment.direction, formatCurrency)}
                      </td>
                      {canSeeSplits && (
                        <td className="p-4 text-ink-mid capitalize">
                          {payment.paid_by_side === 'shared' &&
                          payment.paid_bride_share_percentage != null
                            ? `Bride ${payment.paid_bride_share_percentage}% · Groom ${100 - payment.paid_bride_share_percentage}%`
                            : payment.paid_by_side || '—'}
                        </td>
                      )}
                      <td className="p-4 text-ink-mid">
                        {parseLocalDate(payment.paid_date ?? payment.created_at).toLocaleDateString(
                          'en-IN',
                        )}
                      </td>
                      <td className="p-4 text-ink-mid capitalize">
                        {payment.payment_method?.replace('_', ' ') || '—'}
                      </td>
                      <td className="p-4 text-ink-low text-sm hidden md:table-cell">
                        {payment.transaction_reference || '—'}
                      </td>
                      <td className="p-4 text-ink-low text-sm hidden md:table-cell">
                        {payment.notes || '—'}
                      </td>
                      <td className="p-4">
                        <PaymentAttachments paymentId={payment.id} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {outstanding && outstanding.items.filter((item) => item.outstanding > 0).length > 0 && (
        <div id="outstanding-balances" className="card overflow-hidden p-0">
          <div className="p-4 bg-orange-50 border-b border-orange-100">
            <h3 className="font-semibold text-orange-800">Outstanding Balances</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left p-4">Expense</th>
                  <th className="text-left p-4">Type</th>
                  <th className="text-right p-4 hidden sm:table-cell">Planned</th>
                  <th className="text-right p-4">Allocated</th>
                  <th className="text-right p-4">Paid</th>
                  <th className="text-right p-4">Outstanding</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {outstanding.items
                  .filter((item) => item.outstanding > 0)
                  .sort((left, right) => right.outstanding - left.outstanding)
                  .map((item) => (
                    <tr key={item.id} className="table-row">
                      <td className="p-4 font-medium">{item.name}</td>
                      <td className="p-4 text-ink-low capitalize">{item.type}</td>
                      <td className="p-4 text-right text-ink-low hidden sm:table-cell">
                        {item.planned > 0 ? formatCurrency(item.planned) : '—'}
                      </td>
                      <td className="p-4 text-right text-ink-mid">
                        {formatCurrency(item.totalCost)}
                      </td>
                      <td className="p-4 text-right text-green-700">{formatCurrency(item.paid)}</td>
                      <td className="p-4 text-right font-semibold text-orange-700">
                        {formatCurrency(item.outstanding)}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => onRecordPayment(item.expense_id)}
                          className="text-xs font-medium whitespace-nowrap"
                          style={{ color: 'var(--gold-deep)' }}
                        >
                          Record payment →
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="bg-surface-highest font-bold">
                <tr>
                  {/* Planned is sm-only, so the label spans 4 and this filler
                      absorbs the extra column above the sm breakpoint. */}
                  <td colSpan={4} className="p-4">
                    Total Outstanding
                  </td>
                  <td className="p-4 hidden sm:table-cell" />
                  <td className="p-4 text-right text-orange-700">
                    {formatCurrency(outstanding.totalOutstanding)}
                  </td>
                  <td className="p-4" />
                </tr>
              </tfoot>
            </table>
          </div>
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
