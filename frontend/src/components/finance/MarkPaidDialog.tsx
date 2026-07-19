import { useState } from 'react';
import Portal from '../Portal';
import DatePicker from '../ui/DatePicker';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { formatCurrency } from '../../utils/currency';
import { todayLocal } from '../../utils/date';
import type { PaymentRow } from '@wedding-planner/shared';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  cheque: 'Cheque',
  credit_card: 'Credit Card',
};

export interface MarkPaidResult {
  amount: number;
  paid_date: string;
  payment_method: string;
}

interface MarkPaidDialogProps {
  payment: PaymentRow;
  isPending?: boolean | undefined;
  onConfirm: (result: MarkPaidResult) => void;
  onCancel: () => void;
}

/**
 * Confirms marking a scheduled payment as paid. Prefills the scheduled amount
 * (editable — a smaller amount is a partial payment, with the remainder returning
 * to the unscheduled balance), today's date, and a payment method (required).
 */
export default function MarkPaidDialog({
  payment,
  isPending = false,
  onConfirm,
  onCancel,
}: MarkPaidDialogProps) {
  const [amount, setAmount] = useState(String(payment.amount));
  const [paidDate, setPaidDate] = useState(todayLocal());
  const [method, setMethod] = useState<string>(payment.payment_method ?? 'cash');

  useModalDismiss(true, onCancel);

  const enteredAmount = Number(amount || 0);
  const isPartial = enteredAmount > 0 && enteredAmount < payment.amount;
  const remaining = Math.max(0, Number((payment.amount - enteredAmount).toFixed(2)));
  const canConfirm = enteredAmount > 0 && !!method;

  return (
    <Portal>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: 16,
        }}
        onClick={onCancel}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--bg-panel)',
            borderRadius: 'var(--radius-lg)',
            padding: 28,
            maxWidth: 420,
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          }}
        >
          <h3 className="display" style={{ margin: '0 0 4px', fontSize: 20, color: 'var(--ink-high)' }}>
            Mark payment as paid
          </h3>
          <p style={{ fontSize: 13, color: 'var(--ink-low)', marginBottom: 20 }}>
            Scheduled for {formatCurrency(payment.amount)}
            {payment.due_date ? ` · due ${payment.due_date}` : ''}.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">Amount paid</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input no-spinner"
              />
            </div>
            <div>
              <label className="label">Paid on</label>
              <DatePicker value={paidDate} onChange={setPaidDate} placeholder="Paid on" />
            </div>
            <div>
              <label className="label">Payment method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="input"
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            {isPartial && (
              <div style={{ fontSize: 12, color: 'var(--ink-low)' }}>
                Remaining {formatCurrency(remaining)} returns to the unscheduled balance.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onCancel} className="btn-outline">
              Cancel
            </button>
            <button
              type="button"
              disabled={!canConfirm || isPending}
              onClick={() =>
                onConfirm({ amount: enteredAmount, paid_date: paidDate, payment_method: method })
              }
              className="btn-primary"
              style={{ opacity: !canConfirm || isPending ? 0.5 : 1 }}
            >
              {isPending ? 'Saving…' : 'Mark paid'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
