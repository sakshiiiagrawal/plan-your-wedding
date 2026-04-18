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
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
        <div style={{ background: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 672, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--line-soft)' }}>
            <div>
              <div className="uppercase-eyebrow" style={{ marginBottom: 4 }}>Payments</div>
              <h2 className="display" style={{ margin: '0 0 6px', fontSize: 20, color: 'var(--ink-high)' }}>{source.name}</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12 }}>
                <span style={{ color: 'var(--ink-low)' }}>Committed: <strong style={{ color: 'var(--ink-mid)' }}>{formatCurrency(committed)}</strong></span>
                <span style={{ color: 'var(--ok)' }}>Paid: <strong>{formatCurrency(paid)}</strong></span>
                <span style={{ color: 'var(--warn)' }}>Outstanding: <strong>{formatCurrency(outstanding)}</strong></span>
              </div>
            </div>
            <button onClick={onClose} style={{ padding: '6px 8px', borderRadius: 6, color: 'var(--ink-dim)', background: 'transparent', cursor: 'pointer' }}>
              <HiOutlineX style={{ width: 18, height: 18 }} />
            </button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Payment timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 className="section-title">Payment Timeline</h3>
                {!source.expense_id && (
                  <span style={{ fontSize: 11, color: 'var(--warn)', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 100, padding: '3px 10px' }}>
                    No obligation linked yet
                  </span>
                )}
              </div>

              {sortedPayments.length === 0 ? (
                <div style={{ border: '1.5px dashed var(--line)', borderRadius: 10, padding: '18px 20px', fontSize: 13, color: 'var(--ink-dim)', textAlign: 'center' }}>
                  No payments recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sortedPayments.map((payment) => {
                    const dateLabel = payment.paid_date ?? payment.due_date ?? payment.created_at;
                    const isDeleteAllowed = payment.status === 'scheduled';
                    const isInflow = payment.direction === 'inflow';
                    const amtColor = isInflow ? '#0369a1' : payment.status === 'posted' ? 'var(--ok)' : 'var(--gold-deep)';
                    return (
                      <div
                        key={payment.id}
                        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, border: '1px solid var(--line-soft)', borderRadius: 10, padding: '10px 14px' }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: amtColor }}>
                              {formatCurrency(payment.amount)}
                            </span>
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: 'var(--bg-raised)', color: 'var(--ink-low)', textTransform: 'capitalize' }}>
                              {payment.status.replaceAll('_', ' ')}
                            </span>
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: 'var(--bg-raised)', color: 'var(--ink-low)', textTransform: 'capitalize' }}>
                              {payment.direction}
                            </span>
                          </div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                            {new Date(dateLabel).toLocaleDateString('en-IN')}
                            {payment.payment_method && ` · ${PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method}`}
                            {payment.notes ? ` · ${payment.notes}` : ''}
                          </div>
                        </div>
                        {isDeleteAllowed && (
                          <button
                            onClick={() => handleDelete(payment.id)}
                            disabled={deletePayment.isPending}
                            style={{ padding: '6px 8px', borderRadius: 6, color: 'var(--err)', background: 'transparent', cursor: 'pointer', flexShrink: 0, opacity: deletePayment.isPending ? 0.5 : 1 }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.08)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
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
                  <input type="number" min="0" step="0.01" value={formData.amount} onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))} className="input" placeholder="0" />
                </div>
                <div>
                  <label className="label">{isScheduled ? 'Due Date' : 'Payment Date'}</label>
                  <input type="date" value={formData.payment_date} onChange={(e) => setFormData((p) => ({ ...p, payment_date: e.target.value }))} className="input" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Payment Method</label>
                  <select value={formData.payment_method} onChange={(e) => setFormData((p) => ({ ...p, payment_method: e.target.value }))} className="input" disabled={isScheduled}>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Paid By Side</label>
                  <select value={formData.paid_by_side} onChange={(e) => setFormData((p) => ({ ...p, paid_by_side: e.target.value as 'bride' | 'groom' | 'shared' }))} className="input">
                    <option value="bride">Bride</option>
                    <option value="groom">Groom</option>
                    <option value="shared">Shared</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} className="input" style={{ minHeight: 72 }} placeholder={isScheduled ? 'Optional reminder note' : 'Optional reference, cheque number, or note'} />
              </div>

              {isScheduled && (
                <div style={{ border: '1px solid rgba(217,119,6,0.25)', background: 'rgba(217,119,6,0.06)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--warn)' }}>
                  This will be saved as a scheduled payment reminder.
                </div>
              )}

              {excessAmount > 0 && (
                <div style={{ border: '1px solid rgba(234,88,12,0.25)', background: 'rgba(234,88,12,0.05)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 13, color: '#9a3412' }}>
                    You are paying {formatCurrency(excessAmount)} more than the current outstanding amount. Classify this extra amount so it can be added as a new finance item.
                  </div>

                  <div>
                    <label className="label">Extra Amount Category</label>
                    <CategoryCombobox value={formData.extra_category_id} onChange={(id) => setFormData((p) => ({ ...p, extra_category_id: id }))} level="subcategory" placeholder="Select category" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="label">Extra Amount Label</label>
                      <input type="text" value={formData.extra_description} onChange={(e) => setFormData((p) => ({ ...p, extra_description: e.target.value }))} className="input" placeholder="Tip, late fee, extra service" />
                    </div>
                    <div>
                      <label className="label">Liability Side</label>
                      <select value={formData.extra_side} onChange={(e) => setFormData((p) => ({ ...p, extra_side: e.target.value as 'bride' | 'groom' | 'shared' }))} className="input">
                        <option value="bride">Bride</option>
                        <option value="groom">Groom</option>
                        <option value="shared">Shared</option>
                      </select>
                    </div>
                  </div>

                  {formData.extra_side === 'shared' && (
                    <div>
                      <label className="label">Bride Share Percentage ({formData.extra_bride_share_percentage}%)</label>
                      <input type="range" min="0" max="100" value={formData.extra_bride_share_percentage} onChange={(e) => setFormData((p) => ({ ...p, extra_bride_share_percentage: Number(e.target.value) }))} style={{ width: '100%', accentColor: 'var(--gold)' }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--line-soft)' }}>
            <button type="button" onClick={onClose} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
            <button type="button" onClick={handleSave} disabled={createPayment.isPending} className="btn-primary" style={{ flex: 1, opacity: createPayment.isPending ? 0.5 : 1 }}>
              {createPayment.isPending ? 'Saving…' : isScheduled ? 'Save Planned Payment' : 'Record Payment'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
