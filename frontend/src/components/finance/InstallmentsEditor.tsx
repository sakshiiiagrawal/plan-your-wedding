import { useState } from 'react';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';
import DatePicker from '../ui/DatePicker';
import SplitShare from '../ui/SplitShare';
import { formatCurrency } from '../../utils/currency';
import { addMonthsClamped, todayLocal } from '../../utils/date';

export type PaymentMode = 'record' | 'schedule';

export interface InstallmentFormRow {
  id: string;
  amount: string;
  payment_date: string;
  payment_method: string;
  paid_by_side: 'bride' | 'groom' | 'shared';
  paid_bride_share_percentage: number;
  notes: string;
  // Explicit record-vs-schedule choice. Derived from the date until the user
  // touches the toggle (modeTouched), after which the date no longer changes it.
  mode: PaymentMode;
  modeTouched: boolean;
}

export const deriveModeFromDate = (dateStr: string): PaymentMode =>
  dateStr > todayLocal() ? 'schedule' : 'record';

export const createInstallmentRow = (): InstallmentFormRow => {
  const payment_date = todayLocal();
  return {
    id: Math.random().toString(36).slice(2),
    amount: '',
    payment_date,
    payment_method: 'cash',
    paid_by_side: 'shared',
    paid_bride_share_percentage: 50,
    notes: '',
    mode: deriveModeFromDate(payment_date),
    modeTouched: false,
  };
};

// Single source of truth for turning a form row into a payment mutation body.
// Consumed by AddExpenseModal, Vendors and Venues so the shape can't drift.
export const installmentToPaymentPayload = (
  row: InstallmentFormRow,
  canSeeSplits: boolean,
): Record<string, unknown> => {
  const amount = Number(row.amount || 0);
  const direction = amount < 0 ? 'inflow' : 'outflow';
  const magnitude = Math.abs(amount);
  const isScheduled = row.mode === 'schedule';
  return {
    amount: magnitude,
    direction,
    status: isScheduled ? 'scheduled' : 'posted',
    due_date: row.payment_date,
    paid_date: isScheduled ? null : row.payment_date,
    payment_method: isScheduled ? null : row.payment_method,
    ...(canSeeSplits
      ? {
          paid_by_side: row.paid_by_side,
          paid_bride_share_percentage:
            row.paid_by_side === 'shared' ? row.paid_bride_share_percentage : null,
        }
      : {}),
    notes: row.notes || null,
  };
};

// D4: expand a scheduled row into `count` monthly installments (+1 month each,
// clamping the day of month). Notes get a "(k/count)" suffix for traceability.
export const fanOutMonthly = (row: InstallmentFormRow, count: number): InstallmentFormRow[] => {
  const total = Math.max(2, Math.min(24, Math.floor(count)));
  const baseNotes = row.notes.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
  return Array.from({ length: total }, (_, index) => {
    const suffix = ` (${index + 1}/${total})`;
    return {
      ...row,
      id: index === 0 ? row.id : Math.random().toString(36).slice(2),
      payment_date: addMonthsClamped(row.payment_date, index),
      mode: 'schedule',
      modeTouched: true,
      notes: `${baseNotes}${suffix}`.trim(),
    };
  });
};

export const sumOutflowInstallments = (installments: InstallmentFormRow[]) =>
  installments.reduce((sum, installment) => {
    const amount = Number(installment.amount || 0);
    return amount < 0 ? sum : sum + amount;
  }, 0);

export const installmentsExceedTotal = (
  installments: InstallmentFormRow[],
  committedTotal: number,
) => sumOutflowInstallments(installments) > committedTotal;

interface InstallmentsEditorProps {
  installments: InstallmentFormRow[];
  onChange: (installments: InstallmentFormRow[]) => void;
  committedTotal: number;
  canSeeSplits: boolean;
}

export default function InstallmentsEditor({
  installments,
  onChange,
  committedTotal,
  canSeeSplits,
}: InstallmentsEditorProps) {
  const [repeatCounts, setRepeatCounts] = useState<Record<string, string>>({});

  const updateRow = (id: string, patch: Partial<InstallmentFormRow>) => {
    onChange(installments.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  // Changing the date re-derives the mode until the user explicitly toggles it.
  const updateDate = (id: string, payment_date: string) => {
    onChange(
      installments.map((row) =>
        row.id === id
          ? {
              ...row,
              payment_date,
              mode: row.modeTouched ? row.mode : deriveModeFromDate(payment_date),
            }
          : row,
      ),
    );
  };

  const setMode = (id: string, mode: PaymentMode) => {
    updateRow(id, { mode, modeTouched: true });
  };

  const removeRow = (id: string) => {
    onChange(installments.filter((row) => row.id !== id));
  };

  const addRow = () => {
    onChange([...installments, createInstallmentRow()]);
  };

  const applyRepeat = (row: InstallmentFormRow) => {
    const count = Number(repeatCounts[row.id] || 0);
    if (!Number.isFinite(count) || count < 2) return;
    const generated = fanOutMonthly(row, count);
    const index = installments.findIndex((r) => r.id === row.id);
    if (index < 0) return;
    const next = [...installments];
    next.splice(index, 1, ...generated);
    onChange(next);
    setRepeatCounts((prev) => {
      const rest = { ...prev };
      delete rest[row.id];
      return rest;
    });
  };

  const exceedsTotal = installmentsExceedTotal(installments, committedTotal);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="section-title">Installments</h3>
        <button
          type="button"
          onClick={addRow}
          style={{
            fontSize: 13,
            color: 'var(--gold-deep)',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <HiOutlinePlus className="w-4 h-4" />
          Add Installment
        </button>
      </div>

      {installments.length === 0 ? (
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
          No installments added. Add one to record an advance, milestone, or final payment.
        </div>
      ) : (
        <div className="space-y-4">
          {installments.map((installment, index) => {
            const amount = Number(installment.amount || 0);
            const direction = amount < 0 ? 'inflow' : 'outflow';
            const magnitude = Math.abs(amount);
            const isReversal = direction === 'inflow';
            const isScheduled = installment.mode === 'schedule';

            return (
              <div
                key={installment.id}
                style={{
                  borderRadius: 10,
                  border: '1px solid var(--line-soft)',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div className="flex items-center justify-between">
                  <h4 style={{ fontWeight: 600, color: 'var(--ink-high)', fontSize: 13 }}>
                    Installment {index + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeRow(installment.id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>

                <ModeToggle mode={installment.mode} onChange={(m) => setMode(installment.id, m)} />

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={installment.amount}
                      onChange={(event) =>
                        updateRow(installment.id, { amount: event.target.value })
                      }
                      className="input"
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">{isScheduled ? 'Due Date' : 'Paid On'}</label>
                    <DatePicker
                      value={installment.payment_date}
                      onChange={(v) => updateDate(installment.id, v)}
                      required
                      placeholder={isScheduled ? 'Due date' : 'Paid on'}
                    />
                  </div>
                </div>

                <div className={canSeeSplits ? 'grid sm:grid-cols-2 gap-4' : undefined}>
                  <div>
                    <label className="label">Payment Method</label>
                    <select
                      value={installment.payment_method}
                      onChange={(event) =>
                        updateRow(installment.id, { payment_method: event.target.value })
                      }
                      className="input"
                      disabled={isScheduled}
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="upi">UPI</option>
                      <option value="cheque">Cheque</option>
                      <option value="credit_card">Credit Card</option>
                    </select>
                  </div>
                  {canSeeSplits && (
                    <div>
                      <label className="label">Paid By Side</label>
                      <select
                        value={installment.paid_by_side}
                        onChange={(event) =>
                          updateRow(installment.id, {
                            paid_by_side: event.target.value as 'bride' | 'groom' | 'shared',
                          })
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

                {!isScheduled && new Date(installment.payment_date) > new Date(todayLocal()) && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--ink-low)',
                    }}
                  >
                    Recording a future-dated payment (post-dated instrument).
                  </div>
                )}

                {canSeeSplits && installment.paid_by_side === 'shared' && (
                  <SplitShare
                    total={magnitude}
                    bridePercentage={installment.paid_bride_share_percentage}
                    onChange={(pct) =>
                      updateRow(installment.id, { paid_bride_share_percentage: pct })
                    }
                  />
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

                {isScheduled && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <label className="label">Repeat monthly ×</label>
                      <input
                        type="number"
                        min={2}
                        max={24}
                        value={repeatCounts[installment.id] ?? ''}
                        onChange={(event) =>
                          setRepeatCounts((prev) => ({
                            ...prev,
                            [installment.id]: event.target.value,
                          }))
                        }
                        className="input"
                        style={{ width: 120 }}
                        placeholder="e.g. 6"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => applyRepeat(installment)}
                      className="btn-outline"
                      style={{ height: 40 }}
                    >
                      Apply
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
                      Generates monthly reminders from this due date.
                    </span>
                  </div>
                )}

                <div>
                  <label className="label">Notes</label>
                  <textarea
                    value={installment.notes}
                    onChange={(event) => updateRow(installment.id, { notes: event.target.value })}
                    className="input min-h-[72px]"
                    placeholder="Optional notes or reference"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {exceedsTotal && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          Installments total {formatCurrency(sumOutflowInstallments(installments))}, which is
          higher than the allocated total ({formatCurrency(committedTotal)}). Add more line items
          above before saving.
        </div>
      )}
    </div>
  );
}

interface ModeToggleProps {
  mode: PaymentMode;
  onChange: (mode: PaymentMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const options: Array<{ id: PaymentMode; label: string }> = [
    { id: 'record', label: 'Record as paid' },
    { id: 'schedule', label: 'Schedule for later' },
  ];
  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 4,
        padding: 3,
        borderRadius: 8,
        background: 'var(--bg-raised)',
        border: '1px solid var(--line-soft)',
        alignSelf: 'flex-start',
      }}
    >
      {options.map((option) => {
        const active = mode === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              border: 'none',
              background: active ? 'var(--bg-panel)' : 'transparent',
              color: active ? 'var(--ink-high)' : 'var(--ink-low)',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
