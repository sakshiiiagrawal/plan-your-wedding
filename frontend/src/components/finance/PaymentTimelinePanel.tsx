import { useState } from 'react';
import { HiOutlineTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';
import CategoryCombobox from '../CategoryCombobox';
import DatePicker from '../ui/DatePicker';
import SplitShare from '../ui/SplitShare';
import { formatCurrency } from '../../utils/currency';
import { parseLocalDate } from '../../utils/date';
import type { PaymentRow } from '@wedding-planner/shared';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  cheque: 'Cheque',
  credit_card: 'Credit Card',
};

const TODAY = new Date().toISOString().slice(0, 10);

const formatPaymentAmount = (amount: number, direction: 'outflow' | 'inflow') =>
  `${direction === 'inflow' ? '-' : ''}${formatCurrency(amount)}`;

interface PaymentFormState {
  amount: string;
  payment_date: string;
  payment_method: string;
  paid_by_side: 'bride' | 'groom' | 'shared';
  paid_bride_share_percentage: number;
  notes: string;
  extra_category_id: string | null;
  extra_description: string;
  extra_side: 'bride' | 'groom' | 'shared';
  extra_bride_share_percentage: number;
}

interface DefaultSplit {
  side: 'bride' | 'groom' | 'shared';
  bridePercentage: number;
}

function getPaymentFormState(defaultSplit: DefaultSplit): PaymentFormState {
  return {
    amount: '',
    payment_date: TODAY,
    payment_method: 'cash',
    paid_by_side: defaultSplit.side,
    paid_bride_share_percentage: defaultSplit.bridePercentage,
    notes: '',
    extra_category_id: null,
    extra_description: 'Tip',
    extra_side: defaultSplit.side,
    extra_bride_share_percentage: 50,
  };
}

interface ApiError {
  response?: { data?: { error?: string; message?: string } };
}

export interface PaymentTimelinePanelProps {
  payments: PaymentRow[];
  committed: number;
  paid: number;
  outstanding: number;
  onCreate: (payload: Record<string, unknown>) => Promise<unknown>;
  onDelete: (paymentId: string) => Promise<unknown>;
  isCreating: boolean;
  isDeleting: boolean;
  defaultSplit: DefaultSplit;
  canSeeSplits: boolean;
  canRecordPayment: boolean;
  disabledReason?: string;
}

export default function PaymentTimelinePanel({
  payments,
  committed,
  paid,
  outstanding,
  onCreate,
  onDelete,
  isCreating,
  isDeleting,
  defaultSplit,
  canSeeSplits,
  canRecordPayment,
  disabledReason,
}: PaymentTimelinePanelProps) {
  const [formData, setFormData] = useState<PaymentFormState>(() =>
    getPaymentFormState(defaultSplit),
  );

  const enteredAmount = Number(formData.amount || 0);
  const paymentDirection = enteredAmount < 0 ? 'inflow' : 'outflow';
  const paymentMagnitude = Math.abs(enteredAmount);
  const isReversal = paymentDirection === 'inflow';
  const excessAmount = isReversal
    ? 0
    : Math.max(0, Number((paymentMagnitude - outstanding).toFixed(2)));
  const isScheduled = formData.payment_date > TODAY;

  const sortedPayments = [...payments].sort((left, right) => {
    const leftDate = left.paid_date ?? left.due_date ?? left.created_at;
    const rightDate = right.paid_date ?? right.due_date ?? right.created_at;
    return rightDate.localeCompare(leftDate);
  });

  const handleSave = async () => {
    if (!canRecordPayment) {
      toast.error(disabledReason ?? 'Add the obligation amount first before recording payments.');
      return;
    }

    if (!enteredAmount) {
      toast.error('Enter a valid amount.');
      return;
    }

    if (excessAmount > 0 && !formData.extra_category_id) {
      toast.error('Select a category for the excess amount.');
      return;
    }

    try {
      await onCreate({
        amount: paymentMagnitude,
        direction: paymentDirection,
        status: isScheduled ? 'scheduled' : 'posted',
        due_date: formData.payment_date,
        paid_date: isScheduled ? null : formData.payment_date,
        payment_method: isScheduled ? null : formData.payment_method,
        ...(canSeeSplits
          ? {
              paid_by_side: formData.paid_by_side,
              paid_bride_share_percentage:
                formData.paid_by_side === 'shared' ? formData.paid_bride_share_percentage : null,
            }
          : {}),
        notes: formData.notes || null,
        new_items:
          excessAmount > 0 && formData.extra_category_id
            ? [
                {
                  category_id: formData.extra_category_id,
                  description: formData.extra_description || 'Additional charge',
                  amount: excessAmount,
                  ...(canSeeSplits
                    ? {
                        side: formData.extra_side,
                        bride_share_percentage:
                          formData.extra_side === 'shared'
                            ? formData.extra_bride_share_percentage
                            : null,
                      }
                    : {}),
                },
              ]
            : undefined,
      });

      toast.success(
        isScheduled
          ? isReversal
            ? 'Planned reversal saved.'
            : 'Planned payment saved.'
          : isReversal
            ? 'Reversal recorded.'
            : 'Payment recorded.',
      );
      setFormData(getPaymentFormState(defaultSplit));
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message =
        apiError.response?.data?.error ||
        apiError.response?.data?.message ||
        'Failed to save payment.';
      toast.error(message);
    }
  };

  const handleDelete = async (paymentId: string) => {
    try {
      await onDelete(paymentId);
      toast.success('Scheduled payment deleted.');
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message =
        apiError.response?.data?.error ||
        apiError.response?.data?.message ||
        'Failed to delete payment.';
      toast.error(message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12 }}>
        <span style={{ color: 'var(--ink-low)' }}>
          Committed: <strong style={{ color: 'var(--ink-mid)' }}>{formatCurrency(committed)}</strong>
        </span>
        <span style={{ color: 'var(--ok)' }}>
          Paid: <strong>{formatCurrency(paid)}</strong>
        </span>
        <span style={{ color: 'var(--warn)' }}>
          Outstanding: <strong>{formatCurrency(outstanding)}</strong>
        </span>
      </div>

      {/* Payment timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 className="section-title">Payment Timeline</h3>

        {sortedPayments.length === 0 ? (
          <div
            style={{
              border: '1.5px dashed var(--line)',
              borderRadius: 10,
              padding: '18px 20px',
              fontSize: 13,
              color: 'var(--ink-dim)',
              textAlign: 'center',
            }}
          >
            No payments recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sortedPayments.map((payment) => {
              const dateLabel = payment.paid_date ?? payment.due_date ?? payment.created_at;
              const isDeleteAllowed = payment.status === 'scheduled';
              const isInflow = payment.direction === 'inflow';
              const amtColor = isInflow
                ? '#0369a1'
                : payment.status === 'posted'
                  ? 'var(--ok)'
                  : 'var(--gold-deep)';
              return (
                <div
                  key={payment.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    border: '1px solid var(--line-soft)',
                    borderRadius: 10,
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: amtColor }}>
                        {formatPaymentAmount(payment.amount, payment.direction)}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 7px',
                          borderRadius: 100,
                          background: 'var(--bg-raised)',
                          color: 'var(--ink-low)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {payment.status.replaceAll('_', ' ')}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 7px',
                          borderRadius: 100,
                          background: 'var(--bg-raised)',
                          color: 'var(--ink-low)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {payment.direction}
                      </span>
                      {payment.paid_by_side && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 7px',
                            borderRadius: 100,
                            background: 'var(--bg-raised)',
                            color: 'var(--ink-low)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {payment.paid_by_side}
                        </span>
                      )}
                    </div>
                    {payment.paid_by_side === 'shared' && payment.paid_bride_share_percentage != null && (
                      <div style={{ fontSize: 11, color: 'var(--ink-low)', lineHeight: 1.35 }}>
                        Bride {payment.paid_bride_share_percentage}% · Groom{' '}
                        {100 - payment.paid_bride_share_percentage}%
                      </div>
                    )}
                    <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                      {parseLocalDate(dateLabel).toLocaleDateString('en-IN')}
                      {payment.payment_method &&
                        ` · ${PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method}`}
                      {payment.notes ? ` · ${payment.notes}` : ''}
                    </div>
                  </div>
                  {isDeleteAllowed && (
                    <button
                      onClick={() => handleDelete(payment.id)}
                      disabled={isDeleting}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        color: 'var(--err)',
                        background: 'transparent',
                        cursor: 'pointer',
                        flexShrink: 0,
                        opacity: isDeleting ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.08)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <HiOutlineTrash style={{ width: 15, height: 15 }} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add payment form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 className="section-title">Add Payment</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="label">Amount</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
              className="input"
              placeholder="Enter amount"
            />
          </div>
          <div>
            <label className="label">{isScheduled ? 'Due Date' : 'Payment Date'}</label>
            <DatePicker
              value={formData.payment_date}
              onChange={(v) => setFormData((p) => ({ ...p, payment_date: v }))}
              placeholder={isScheduled ? 'Due date' : 'Payment date'}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="label">Payment Method</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData((p) => ({ ...p, payment_method: e.target.value }))}
              className="input"
              disabled={isScheduled}
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          {canSeeSplits && (
            <div>
              <label className="label">Paid By Side</label>
              <select
                value={formData.paid_by_side}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    paid_by_side: e.target.value as 'bride' | 'groom' | 'shared',
                  }))
                }
                className="input"
              >
                <option value="bride">Bride</option>
                <option value="groom">Groom</option>
                <option value="shared">Shared</option>
              </select>
            </div>
          )}
        </div>

        {canSeeSplits && formData.paid_by_side === 'shared' && (
          <SplitShare
            total={paymentMagnitude}
            bridePercentage={formData.paid_bride_share_percentage}
            onChange={(pct) => setFormData((p) => ({ ...p, paid_bride_share_percentage: pct }))}
          />
        )}

        <div>
          <label className="label">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
            className="input"
            style={{ minHeight: 72 }}
            placeholder={
              isScheduled ? 'Optional reminder note' : 'Optional reference, cheque number, or note'
            }
          />
        </div>

        {isScheduled && (
          <div
            style={{
              border: '1px solid rgba(217,119,6,0.25)',
              background: 'rgba(217,119,6,0.06)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              color: 'var(--warn)',
            }}
          >
            This will be saved as a scheduled payment reminder.
          </div>
        )}

        {isReversal && (
          <div
            style={{
              border: '1px solid rgba(3,105,161,0.22)',
              background: 'rgba(3,105,161,0.06)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              color: '#0c4a6e',
            }}
          >
            Negative amounts are recorded as payment reversals and reduce the paid total.
          </div>
        )}

        {excessAmount > 0 && (
          <div
            style={{
              border: '1px solid rgba(234,88,12,0.25)',
              background: 'rgba(234,88,12,0.05)',
              borderRadius: 8,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ fontSize: 13, color: '#9a3412' }}>
              You are paying {formatCurrency(excessAmount)} more than the current outstanding
              amount. Classify this extra amount so it can be added as a new finance item.
            </div>

            <div>
              <label className="label">Extra Amount Category</label>
              <CategoryCombobox
                value={formData.extra_category_id}
                onChange={(id) => setFormData((p) => ({ ...p, extra_category_id: id }))}
                level="subcategory"
                placeholder="Select category"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Extra Amount Label</label>
                <input
                  type="text"
                  value={formData.extra_description}
                  onChange={(e) => setFormData((p) => ({ ...p, extra_description: e.target.value }))}
                  className="input"
                  placeholder="Tip, late fee, extra service"
                />
              </div>
              <div>
                <label className="label">Liability Side</label>
                <select
                  value={formData.extra_side}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      extra_side: e.target.value as 'bride' | 'groom' | 'shared',
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
              <SplitShare
                total={excessAmount}
                bridePercentage={formData.extra_bride_share_percentage}
                onChange={(pct) =>
                  setFormData((p) => ({ ...p, extra_bride_share_percentage: pct }))
                }
              />
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={isCreating}
          className="btn-primary"
          style={{ opacity: isCreating ? 0.5 : 1 }}
        >
          {isCreating ? 'Saving…' : isScheduled ? 'Save Planned Payment' : 'Record Payment'}
        </button>
      </div>
    </div>
  );
}
