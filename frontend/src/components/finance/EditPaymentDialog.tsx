import { useState } from 'react';
import Portal from '../Portal';
import DatePicker from '../ui/DatePicker';
import SplitShare from '../ui/SplitShare';
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

type Side = 'bride' | 'groom' | 'shared';

export interface EditPaymentResult {
  amount: number;
  status: 'scheduled' | 'posted';
  due_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
  paid_by_side?: Side;
  paid_bride_share_percentage?: number | null;
  notes: string | null;
}

interface EditPaymentDialogProps {
  payment: PaymentRow;
  canSeeSplits: boolean;
  isPending?: boolean | undefined;
  onConfirm: (result: EditPaymentResult) => void;
  onCancel: () => void;
}

/**
 * Free-form edit of an existing payment — amount, date, method, who paid, and
 * the bride/groom split. Every field stays open regardless of status: a posted
 * payment recorded against the wrong side is a correction, not a new
 * transaction, so it should not require booking a reversal.
 *
 * Reversal entries (direction 'inflow') keep their sign; the amount is edited
 * as a positive magnitude and the direction is left untouched by the caller.
 */
export default function EditPaymentDialog({
  payment,
  canSeeSplits,
  isPending = false,
  onConfirm,
  onCancel,
}: EditPaymentDialogProps) {
  const isReversal = payment.direction === 'inflow';
  const [amount, setAmount] = useState(String(payment.amount));
  const [isScheduled, setIsScheduled] = useState(payment.status === 'scheduled');
  const [date, setDate] = useState(payment.paid_date ?? payment.due_date ?? todayLocal());
  const [method, setMethod] = useState<string>(payment.payment_method ?? 'cash');
  const [side, setSide] = useState<Side>(payment.paid_by_side ?? 'shared');
  const [bridePct, setBridePct] = useState(payment.paid_bride_share_percentage ?? 50);
  const [notes, setNotes] = useState(payment.notes ?? '');

  useModalDismiss(true, onCancel);

  const enteredAmount = Number(amount || 0);
  const canConfirm = enteredAmount > 0 && !!date && (isScheduled || !!method);

  const submit = () => {
    if (!canConfirm) return;
    onConfirm({
      amount: enteredAmount,
      status: isScheduled ? 'scheduled' : 'posted',
      due_date: date,
      paid_date: isScheduled ? null : date,
      payment_method: isScheduled ? null : method,
      ...(canSeeSplits
        ? {
            paid_by_side: side,
            paid_bride_share_percentage: side === 'shared' ? bridePct : null,
          }
        : {}),
      notes: notes || null,
    });
  };

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
            maxWidth: 460,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          }}
        >
          <h3
            className="display"
            style={{ margin: '0 0 4px', fontSize: 20, color: 'var(--ink-high)' }}
          >
            {isReversal ? 'Edit reversal' : 'Edit payment'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--ink-low)', marginBottom: 20 }}>
            Currently {formatCurrency(payment.amount)}
            {payment.paid_date ? ` · paid ${payment.paid_date}` : ''}
            {!payment.paid_date && payment.due_date ? ` · due ${payment.due_date}` : ''}.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input no-spinner"
              />
            </div>

            {!isReversal && (
              <div>
                <label className="label">Status</label>
                <select
                  value={isScheduled ? 'scheduled' : 'posted'}
                  onChange={(e) => setIsScheduled(e.target.value === 'scheduled')}
                  className="input"
                >
                  <option value="posted">Paid</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
            )}

            <div>
              <label className="label">{isScheduled ? 'Due on' : 'Paid on'}</label>
              <DatePicker
                value={date}
                onChange={setDate}
                placeholder={isScheduled ? 'Due on' : 'Paid on'}
              />
            </div>

            {!isScheduled && (
              <div>
                <label className="label">Payment method</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)} className="input">
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {canSeeSplits && (
              <div>
                <label className="label">Paid by</label>
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value as Side)}
                  className="input"
                >
                  <option value="bride">Bride</option>
                  <option value="groom">Groom</option>
                  <option value="shared">Shared</option>
                </select>
              </div>
            )}

            {canSeeSplits && side === 'shared' && (
              <SplitShare
                total={enteredAmount}
                bridePercentage={bridePct}
                onChange={setBridePct}
              />
            )}

            <div>
              <label className="label">Note</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
                placeholder="Optional"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onCancel} className="btn-outline">
              Cancel
            </button>
            <button
              type="button"
              disabled={!canConfirm || isPending}
              onClick={submit}
              className="btn-primary"
              style={{ opacity: !canConfirm || isPending ? 0.5 : 1 }}
            >
              {isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
