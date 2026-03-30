/* eslint-disable @typescript-eslint/no-explicit-any */
import { useExpensePayments, useExpenseOutstanding } from '../../../hooks/useApi';

interface ExpensePaymentsTabProps {
  formatCurrency: (amount: number) => string;
}

function plannedBadge(paymentDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(paymentDate);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">Overdue</span>;
  }
  if (diffDays <= 7) {
    return <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Due in {diffDays}d</span>;
  }
  return <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Planned</span>;
}

export default function ExpensePaymentsTab({ formatCurrency }: ExpensePaymentsTabProps) {
  const { data: payments = [], isLoading: loadingPayments } = useExpensePayments();
  const { data: outstanding, isLoading: loadingOutstanding } = useExpenseOutstanding();

  if (loadingPayments || loadingOutstanding) {
    return <div className="card p-8 text-center text-gray-500">Loading payments...</div>;
  }

  const actualPayments = (payments as any[]).filter((p) => !p.is_planned);
  const plannedPayments = (payments as any[]).filter((p) => p.is_planned);
  const paidTotal = actualPayments.reduce((s: number, p: any) => s + parseFloat(p.amount || 0), 0);
  const plannedTotal = plannedPayments.reduce((s: number, p: any) => s + parseFloat(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(paidTotal)}</div>
          <div className="text-sm text-gray-500">Total Paid</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(plannedTotal)}</div>
          <div className="text-sm text-gray-500">Planned Payments</div>
        </div>
        <div className="card text-center">
          <div className={`text-2xl font-bold ${(outstanding?.totalOutstanding ?? 0) > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
            {formatCurrency(outstanding?.totalOutstanding ?? 0)}
          </div>
          <div className="text-sm text-gray-500">Outstanding</div>
        </div>
      </div>

      {/* Planned payments */}
      {plannedPayments.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="p-4 bg-blue-50 border-b border-blue-100">
            <h3 className="font-semibold text-blue-800">Upcoming Planned Payments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left p-4">Vendor / Venue</th>
                  <th className="text-right p-4">Amount</th>
                  <th className="text-left p-4">Due Date</th>
                  <th className="text-left p-4">Method</th>
                  <th className="text-left p-4">Side</th>
                  <th className="text-left p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {(plannedPayments as any[])
                  .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
                  .map((p: any) => (
                    <tr key={p.id} className="table-row">
                      <td className="p-4 font-medium">
                        {p.vendors?.name || p.venues?.name || '—'}
                      </td>
                      <td className="p-4 text-right font-medium text-maroon-800">
                        {formatCurrency(parseFloat(p.amount || 0))}
                      </td>
                      <td className="p-4 text-gray-600">
                        {new Date(p.payment_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="p-4 text-gray-600 capitalize">
                        {p.payment_method?.replace('_', ' ') || '—'}
                      </td>
                      <td className="p-4">
                        {p.side ? (
                          <span className={p.side === 'bride' ? 'badge-bride' : p.side === 'groom' ? 'badge-groom' : 'badge'}>
                            {p.side}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-4">{plannedBadge(p.payment_date)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actual payments */}
      <div className="card overflow-hidden p-0">
        <div className="p-4 border-b border-gold-200">
          <h3 className="font-semibold text-maroon-800">Payment History</h3>
        </div>
        {actualPayments.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No payments recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left p-4">Vendor / Venue</th>
                  <th className="text-right p-4">Amount</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Method</th>
                  <th className="text-left p-4">Side</th>
                  <th className="text-left p-4 hidden md:table-cell">Reference</th>
                </tr>
              </thead>
              <tbody>
                {(actualPayments as any[])
                  .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                  .map((p: any) => (
                    <tr key={p.id} className="table-row">
                      <td className="p-4 font-medium">
                        {p.vendors?.name || p.venues?.name || '—'}
                      </td>
                      <td className="p-4 text-right font-medium text-green-700">
                        {formatCurrency(parseFloat(p.amount || 0))}
                      </td>
                      <td className="p-4 text-gray-600">
                        {new Date(p.payment_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="p-4 text-gray-600 capitalize">
                        {p.payment_method?.replace('_', ' ') || '—'}
                      </td>
                      <td className="p-4">
                        {p.side ? (
                          <span className={p.side === 'bride' ? 'badge-bride' : p.side === 'groom' ? 'badge-groom' : 'badge'}>
                            {p.side}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-4 text-gray-500 text-sm hidden md:table-cell">
                        {p.transaction_reference || '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td className="p-4">Total Paid</td>
                  <td className="p-4 text-right text-green-700">{formatCurrency(paidTotal)}</td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Outstanding per vendor/venue */}
      {outstanding && outstanding.items.filter((x: any) => x.outstanding > 0).length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="p-4 bg-orange-50 border-b border-orange-100">
            <h3 className="font-semibold text-orange-800">Outstanding Balances</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left p-4">Vendor / Venue</th>
                  <th className="text-left p-4">Type</th>
                  <th className="text-right p-4">Contract</th>
                  <th className="text-right p-4">Paid</th>
                  <th className="text-right p-4">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {outstanding.items
                  .filter((x: any) => x.outstanding > 0)
                  .sort((a: any, b: any) => b.outstanding - a.outstanding)
                  .map((x: any) => (
                    <tr key={x.id} className="table-row">
                      <td className="p-4 font-medium">{x.name}</td>
                      <td className="p-4 text-gray-500 capitalize">{x.type}</td>
                      <td className="p-4 text-right text-gray-700">{formatCurrency(x.totalCost)}</td>
                      <td className="p-4 text-right text-green-700">{formatCurrency(x.paid)}</td>
                      <td className="p-4 text-right font-semibold text-orange-700">{formatCurrency(x.outstanding)}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td colSpan={4} className="p-4">Total Outstanding</td>
                  <td className="p-4 text-right text-orange-700">{formatCurrency(outstanding.totalOutstanding)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
