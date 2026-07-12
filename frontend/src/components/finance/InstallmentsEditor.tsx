import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';
import DatePicker from '../ui/DatePicker';
import SplitShare from '../ui/SplitShare';
import { formatCurrency } from '../../utils/currency';

export interface InstallmentFormRow {
  id: string;
  amount: string;
  payment_date: string;
  payment_method: string;
  paid_by_side: 'bride' | 'groom' | 'shared';
  paid_bride_share_percentage: number;
  notes: string;
}

const TODAY = new Date().toISOString().split('T')[0] ?? '';

export const createInstallmentRow = (): InstallmentFormRow => ({
  id: Math.random().toString(36).slice(2),
  amount: '',
  payment_date: TODAY,
  payment_method: 'cash',
  paid_by_side: 'shared',
  paid_bride_share_percentage: 50,
  notes: '',
});

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
  const updateRow = (id: string, patch: Partial<InstallmentFormRow>) => {
    onChange(installments.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeRow = (id: string) => {
    onChange(installments.filter((row) => row.id !== id));
  };

  const addRow = () => {
    onChange([...installments, createInstallmentRow()]);
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
            const isScheduled = installment.payment_date > TODAY;

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
                    <label className="label">{isScheduled ? 'Due Date' : 'Payment Date'}</label>
                    <DatePicker
                      value={installment.payment_date}
                      onChange={(v) => updateRow(installment.id, { payment_date: v })}
                      required
                      placeholder={isScheduled ? 'Due date' : 'Payment date'}
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
