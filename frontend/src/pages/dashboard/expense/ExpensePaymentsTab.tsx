import { useExpenseOutstanding, useExpensePayments } from '../../../hooks/useApi';

interface ExpensePaymentsTabProps {
  formatCurrency: (amount: number) => string;
}

function plannedBadge(paymentDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(paymentDate);
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
    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Scheduled</span>
  );
}

export default function ExpensePaymentsTab({ formatCurrency }: ExpensePaymentsTabProps) {
  const { data: payments = [], isLoading: loadingPayments } = useExpensePayments();
  const { data: outstanding, isLoading: loadingOutstanding } = useExpenseOutstanding();

  if (loadingPayments || loadingOutstanding) {
    return <div className="card p-8 text-center text-gray-500">Loading payments...</div>;
  }

  const postedPayments = payments.filter((payment) => payment.status === 'posted');
  const scheduledPayments = payments.filter((payment) => payment.status === 'scheduled');
  const paidTotal = postedPayments.reduce(
    (sum, payment) => sum + (payment.direction === 'inflow' ? -payment.amount : payment.amount),
    0,
  );
  const plannedTotal = scheduledPayments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(paidTotal)}</div>
          <div className="text-sm text-gray-500">Net Paid</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(plannedTotal)}</div>
          <div className="text-sm text-gray-500">Scheduled</div>
        </div>
        <div className="card text-center">
          <div
            className={`text-2xl font-bold ${
              (outstanding?.totalOutstanding ?? 0) > 0 ? 'text-orange-600' : 'text-gray-400'
            }`}
          >
            {formatCurrency(outstanding?.totalOutstanding ?? 0)}
          </div>
          <div className="text-sm text-gray-500">Outstanding</div>
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
                  <th className="text-left p-4">Due Date</th>
                  <th className="text-left p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {scheduledPayments
                  .sort(
                    (left, right) =>
                      new Date(left.due_date ?? left.created_at).getTime() -
                      new Date(right.due_date ?? right.created_at).getTime(),
                  )
                  .map((payment) => (
                    <tr key={payment.id} className="table-row">
                      <td className="p-4 font-medium">{payment.expense.description}</td>
                      <td className="p-4 text-gray-500 capitalize">{payment.expense.source_type}</td>
                      <td className="p-4 text-right font-medium text-maroon-800">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="p-4 text-gray-600">
                        {new Date(payment.due_date ?? payment.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="p-4">{plannedBadge(payment.due_date ?? payment.created_at)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="p-4 border-b border-gold-200">
          <h3 className="font-semibold text-maroon-800">Payment History</h3>
        </div>
        {postedPayments.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No payments recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left p-4">Expense</th>
                  <th className="text-left p-4">Source</th>
                  <th className="text-right p-4">Amount</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Method</th>
                  <th className="text-left p-4 hidden md:table-cell">Reference</th>
                </tr>
              </thead>
              <tbody>
                {postedPayments
                  .sort(
                    (left, right) =>
                      new Date(right.paid_date ?? right.created_at).getTime() -
                      new Date(left.paid_date ?? left.created_at).getTime(),
                  )
                  .map((payment) => (
                    <tr key={payment.id} className="table-row">
                      <td className="p-4 font-medium">{payment.expense.description}</td>
                      <td className="p-4 text-gray-500 capitalize">{payment.expense.source_type}</td>
                      <td
                        className={`p-4 text-right font-medium ${
                          payment.direction === 'inflow' ? 'text-sky-700' : 'text-green-700'
                        }`}
                      >
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="p-4 text-gray-600">
                        {new Date(payment.paid_date ?? payment.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="p-4 text-gray-600 capitalize">
                        {payment.payment_method?.replace('_', ' ') || '—'}
                      </td>
                      <td className="p-4 text-gray-500 text-sm hidden md:table-cell">
                        {payment.transaction_reference || '—'}
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
                      <td className="p-4 text-gray-500 capitalize">{item.type}</td>
                      <td className="p-4 text-right text-gray-700">
                        {formatCurrency(item.totalCost)}
                      </td>
                      <td className="p-4 text-right text-green-700">{formatCurrency(item.paid)}</td>
                      <td className="p-4 text-right font-semibold text-orange-700">
                        {formatCurrency(item.outstanding)}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="bg-gray-100 font-bold">
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
