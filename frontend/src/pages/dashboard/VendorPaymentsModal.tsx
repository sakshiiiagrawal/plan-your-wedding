import { useMemo, useState } from 'react';
import { HiOutlineX, HiOutlineTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Portal from '../../components/Portal';
import CategoryCombobox from '../../components/CategoryCombobox';
import {
  useCreateSourcePayment,
  useDeleteSourcePayment,
  useSourcePayments,
} from '../../hooks/useApi';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  cheque: 'Cheque',
  credit_card: 'Credit Card',
};

const TODAY = new Date().toISOString().slice(0, 10);

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

interface SourcePaymentModalProps {
  source: {
    id: string;
    name: string;
    type: 'vendor' | 'venue';
    expense_id: string | null;
    finance_summary?: {
      committed_amount: number;
      paid_amount: number;
      outstanding_amount: number;
    } | null;
    finance?: {
      items?: Array<{
        side: 'bride' | 'groom' | 'shared';
        bride_share_percentage: number | null;
      }>;
    } | null;
  };
  onClose: () => void;
}

interface PaymentFormState {
  amount: string;
  payment_date: string;
  payment_method: string;
  paid_by_side: 'bride' | 'groom' | 'shared';
  notes: string;
  extra_category_id: string | null;
  extra_description: string;
  extra_side: 'bride' | 'groom' | 'shared';
  extra_bride_share_percentage: number;
}

function getDefaultSide(
  source: SourcePaymentModalProps['source'],
): 'bride' | 'groom' | 'shared' {
  return source.finance?.items?.[0]?.side ?? 'shared';
}

export default function VendorPaymentsModal({ source, onClose }: SourcePaymentModalProps) {
  const defaultSide = useMemo(() => getDefaultSide(source), [source]);
  const [formData, setFormData] = useState<PaymentFormState>({
    amount: '',
    payment_date: TODAY,
    payment_method: 'cash',
    paid_by_side: defaultSide,
    notes: '',
    extra_category_id: null,
    extra_description: 'Tip',
    extra_side: defaultSide,
    extra_bride_share_percentage: 50,
  });

  const { data: payments = [] } = useSourcePayments(source.type, source.id);
  const createPayment = useCreateSourcePayment(source.type);
  const deletePayment = useDeleteSourcePayment(source.type);

  const committed = source.finance_summary?.committed_amount ?? 0;
  const paid = source.finance_summary?.paid_amount ?? 0;
  const outstanding = source.finance_summary?.outstanding_amount ?? 0;
  const enteredAmount = Number(formData.amount || 0);
  const excessAmount = Math.max(0, Number((enteredAmount - outstanding).toFixed(2)));
  const isScheduled = formData.payment_date > TODAY;

  const sortedPayments = [...payments].sort((left, right) => {
    const leftDate = left.paid_date ?? left.due_date ?? left.created_at;
    const rightDate = right.paid_date ?? right.due_date ?? right.created_at;
    return rightDate.localeCompare(leftDate);
  });

  const handleSave = async () => {
    if (!source.expense_id) {
      toast.error('Add the obligation amount first before recording payments.');
      return;
    }

    if (!enteredAmount || enteredAmount <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }

    if (excessAmount > 0 && !formData.extra_category_id) {
      toast.error('Select a category for the excess amount.');
      return;
    }

    try {
      await createPayment.mutateAsync({
        sourceId: source.id,
        amount: enteredAmount,
        direction: 'outflow',
        status: isScheduled ? 'scheduled' : 'posted',
        due_date: formData.payment_date,
        paid_date: isScheduled ? null : formData.payment_date,
        payment_method: isScheduled ? null : formData.payment_method,
        paid_by_side: formData.paid_by_side,
        notes: formData.notes || null,
        new_items:
          excessAmount > 0 && formData.extra_category_id
            ? [
                {
                  category_id: formData.extra_category_id,
                  description: formData.extra_description || 'Additional charge',
                  amount: excessAmount,
                  side: formData.extra_side,
                  bride_share_percentage:
                    formData.extra_side === 'shared'
                      ? formData.extra_bride_share_percentage
                      : null,
                },
              ]
            : undefined,
      });

      toast.success(isScheduled ? 'Planned payment saved.' : 'Payment recorded.');
      onClose();
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Failed to save payment.';
      toast.error(message);
    }
  };

  const handleDelete = async (paymentId: string) => {
    try {
      await deletePayment.mutateAsync({ sourceId: source.id, paymentId });
      toast.success('Scheduled payment deleted.');
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Failed to delete payment.';
      toast.error(message);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gold-200">
            <div>
              <h2 className="text-xl font-display font-bold text-maroon-800">{source.name}</h2>
              <div className="flex flex-wrap gap-4 text-sm mt-1">
                <span className="text-gray-600">Committed: {formatCurrency(committed)}</span>
                <span className="text-green-700">Paid: {formatCurrency(paid)}</span>
                <span className="text-orange-700">Outstanding: {formatCurrency(outstanding)}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="section-title">Payment Timeline</h3>
                {!source.expense_id && (
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                    No obligation linked yet
                  </span>
                )}
              </div>

              {sortedPayments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-5 text-sm text-gray-400 text-center">
                  No payments recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedPayments.map((payment) => {
                    const dateLabel = payment.paid_date ?? payment.due_date ?? payment.created_at;
                    const isDeleteAllowed = payment.status === 'scheduled';
                    const isInflow = payment.direction === 'inflow';
                    return (
                      <div
                        key={payment.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`font-semibold ${
                                isInflow ? 'text-sky-700' : payment.status === 'posted' ? 'text-green-700' : 'text-maroon-800'
                              }`}
                            >
                              {formatCurrency(payment.amount)}
                            </span>
                            <span className="badge bg-gray-100 text-gray-700 capitalize">
                              {payment.status.replaceAll('_', ' ')}
                            </span>
                            <span className="badge bg-gray-100 text-gray-700 capitalize">
                              {payment.direction}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(dateLabel).toLocaleDateString('en-IN')}
                            {payment.payment_method &&
                              ` · ${PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method}`}
                            {payment.notes ? ` · ${payment.notes}` : ''}
                          </div>
                        </div>
                        {isDeleteAllowed && (
                          <button
                            onClick={() => handleDelete(payment.id)}
                            disabled={deletePayment.isPending}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                            title="Delete scheduled payment"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="section-title">Add Payment</h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, amount: event.target.value }))
                    }
                    className="input"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="label">{isScheduled ? 'Due Date' : 'Payment Date'}</label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, payment_date: event.target.value }))
                    }
                    className="input"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, payment_method: event.target.value }))
                    }
                    className="input"
                    disabled={isScheduled}
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Paid By Side</label>
                  <select
                    value={formData.paid_by_side}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        paid_by_side: event.target.value as 'bride' | 'groom' | 'shared',
                      }))
                    }
                    className="input"
                  >
                    <option value="bride">Bride</option>
                    <option value="groom">Groom</option>
                    <option value="shared">Shared</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  className="input min-h-[88px]"
                  placeholder={
                    isScheduled
                      ? 'Optional reminder note'
                      : 'Optional reference, cheque number, or note'
                  }
                />
              </div>

              {isScheduled && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  This will be saved as a scheduled payment reminder.
                </div>
              )}

              {excessAmount > 0 && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-4">
                  <div className="text-sm text-orange-800">
                    You are paying {formatCurrency(excessAmount)} more than the current outstanding
                    amount. Classify this extra amount so it can be added as a new finance item in
                    the same transaction.
                  </div>

                  <div>
                    <label className="label">Extra Amount Category</label>
                    <CategoryCombobox
                      value={formData.extra_category_id}
                      onChange={(id) =>
                        setFormData((prev) => ({ ...prev, extra_category_id: id }))
                      }
                      level="subcategory"
                      placeholder="Select category"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Extra Amount Label</label>
                      <input
                        type="text"
                        value={formData.extra_description}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            extra_description: event.target.value,
                          }))
                        }
                        className="input"
                        placeholder="Tip, late fee, extra service"
                      />
                    </div>
                    <div>
                      <label className="label">Liability Side</label>
                      <select
                        value={formData.extra_side}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            extra_side: event.target.value as 'bride' | 'groom' | 'shared',
                          }))
                        }
                        className="input"
                      >
                        <option value="bride">Bride</option>
                        <option value="groom">Groom</option>
                        <option value="shared">Shared</option>
                      </select>
                    </div>
                  </div>

                  {formData.extra_side === 'shared' && (
                    <div>
                      <label className="label">
                        Bride Share Percentage ({formData.extra_bride_share_percentage}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.extra_bride_share_percentage}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            extra_bride_share_percentage: Number(event.target.value),
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-gold-200">
            <button type="button" onClick={onClose} className="btn-outline flex-1">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={createPayment.isPending}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {createPayment.isPending
                ? 'Saving...'
                : isScheduled
                  ? 'Save Planned Payment'
                  : 'Record Payment'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
