import { useExpenseOutstanding, useExpensePayments } from '../../../hooks/useApi';
import { parseLocalDate } from '../../../utils/date';
import { financeTier } from '@wedding-planner/shared';
import { useAuth } from '../../../contexts/AuthContext';
import PaymentAttachments from '../../../components/finance/PaymentAttachments';

interface ExpensePaymentsTabProps {
  formatCurrency: (amount: number) => string;
}

function formatPaymentAmount(
  amount: number,
  direction: 'outflow' | 'inflow',
  formatCurrency: (amount: number) => string,
) {
  return `${direction === 'inflow' ? '-' : ''}${formatCurrency(amount)}`;
}

function plannedBadge(paymentDate: string) {
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
  return <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Scheduled</span>;
}

export default function ExpensePaymentsTab({ formatCurrency }: ExpensePaymentsTabProps) {
  const { user } = useAuth();
  const canSeeSplits = financeTier(user) === 'full';
  const { data: payments = [], isLoading: loadingPayments } = useExpensePayments();
  const { data: outstanding, isLoading: loadingOutstanding } = useExpenseOutstanding();

  if (loadingPayments || loadingOutstanding) {
    return <div className="card p-8 text-center text-ink-low">Loading payments...</div>;
  }

  const postedPayments = payments.filter((payment) => payment.status === 'posted');
  const scheduledPayments = payments.filter((payment) => payment.status === 'scheduled');
  const paidTotal = postedPayments.reduce(
    (sum, payment) => sum + (payment.direction === 'inflow' ? -payment.amount : payment.amount),
    0,
  );
  const plannedTotal = scheduledPayments.reduce(
    (sum, payment) => sum + (payment.direction === 'inflow' ? -payment.amount : payment.amount),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(paidTotal)}</div>
          <div className="text-sm text-ink-low">Net Paid</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(plannedTotal)}</div>
          <div className="text-sm text-ink-low">Scheduled</div>
        </div>
        <div className="card text-center">
          <div
            className={`text-2xl font-bold ${
              (outstanding?.totalOutstanding ?? 0) > 0 ? 'text-orange-600' : 'text-ink-dim'
            }`}
          >
            {formatCurrency(outstanding?.totalOutstanding ?? 0)}
          </div>
          <div className="text-sm text-ink-low">Outstanding</div>
        </div>
      </div>

      {scheduledPayments.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="p-4 bg-blue-50 border-b border-blue-100">
            <h3 className="font-semibold text-blue-800">Scheduled Payments</h3>
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
                      <td className="p-4 font-medium">{payment.expense.description}</td>
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
                        {plannedBadge(payment.due_date ?? payment.created_at)}
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
                        className={`p-4 text-right font-medium ${
                          payment.direction === 'inflow' ? 'text-sky-700' : 'text-green-700'
                        }`}
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
        <div className="card overflow-hidden p-0">
          <div className="p-4 bg-orange-50 border-b border-orange-100">
            <h3 className="font-semibold text-orange-800">Outstanding Balances</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left p-4">Expense</th>
                  <th className="text-left p-4">Type</th>
                  <th className="text-right p-4">Committed</th>
                  <th className="text-right p-4">Paid</th>
                  <th className="text-right p-4">Outstanding</th>
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
                      <td className="p-4 text-right text-ink-mid">
                        {formatCurrency(item.totalCost)}
                      </td>
                      <td className="p-4 text-right text-green-700">{formatCurrency(item.paid)}</td>
                      <td className="p-4 text-right font-semibold text-orange-700">
                        {formatCurrency(item.outstanding)}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="bg-surface-highest font-bold">
                <tr>
                  <td colSpan={4} className="p-4">
                    Total Outstanding
                  </td>
                  <td className="p-4 text-right text-orange-700">
                    {formatCurrency(outstanding.totalOutstanding)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
