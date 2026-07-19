import { useState } from 'react';
import { HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';
import CategoryCombobox from '../CategoryCombobox';
import DatePicker from '../ui/DatePicker';
import SplitShare from '../ui/SplitShare';
import ConfirmDialog from '../ui/ConfirmDialog';
import MarkPaidDialog, { type MarkPaidResult } from './MarkPaidDialog';
import { ModeToggle, type PaymentMode } from './InstallmentsEditor';
import PaymentAttachments from './PaymentAttachments';
import PaymentNotesEditor from './PaymentNotesEditor';
import { formatCurrency } from '../../utils/currency';
import { parseLocalDate, todayLocal } from '../../utils/date';
import type { PaymentRow, ExpenseItemRow, PaymentAllocationRow } from '@wedding-planner/shared';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  cheque: 'Cheque',
  credit_card: 'Credit Card',
};

const round2 = (value: number) => Number(value.toFixed(2));

const formatPaymentAmount = (amount: number, direction: 'outflow' | 'inflow') =>
  `${direction === 'inflow' ? '-' : ''}${formatCurrency(amount)}`;

const formatDateLabel = (date: string) =>
  parseLocalDate(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const SIDE_LABELS: Record<string, string> = {
  bride: 'Bride',
  groom: 'Groom',
  shared: 'Shared',
};

type PanelItem = Pick<ExpenseItemRow, 'id' | 'description' | 'amount'>;

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
  // Explicit record-vs-schedule choice (derived from date until toggled).
  mode: PaymentMode;
  modeTouched: boolean;
  // D6: null = split automatically; otherwise the target expense item id.
  apply_to_item_id: string | null;
  // C3/B5: set when this entry reverses an existing posted payment.
  reverses_payment_id: string | null;
}

interface DefaultSplit {
  side: 'bride' | 'groom' | 'shared';
  bridePercentage: number;
}

function getPaymentFormState(defaultSplit: DefaultSplit): PaymentFormState {
  const payment_date = todayLocal();
  return {
    amount: '',
    payment_date,
    payment_method: 'cash',
    paid_by_side: defaultSplit.side,
    paid_bride_share_percentage: defaultSplit.bridePercentage,
    notes: '',
    extra_category_id: null,
    extra_description: 'Tip',
    extra_side: defaultSplit.side,
    extra_bride_share_percentage: 50,
    mode: payment_date > todayLocal() ? 'schedule' : 'record',
    modeTouched: false,
    apply_to_item_id: null,
    reverses_payment_id: null,
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
  // D3: mark a scheduled payment as paid. Absent hides the action.
  onUpdate?:
    | ((paymentId: string, payload: Record<string, unknown>) => Promise<unknown>)
    | undefined;
  isUpdating?: boolean | undefined;
  // D6: line-item picker + allocation chips.
  items?: PanelItem[] | undefined;
  allocations?: PaymentAllocationRow[] | undefined;
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
  onUpdate,
  isUpdating,
  items,
  allocations,
}: PaymentTimelinePanelProps) {
  const [formData, setFormData] = useState<PaymentFormState>(() =>
    getPaymentFormState(defaultSplit),
  );
  const [deleteTarget, setDeleteTarget] = useState<PaymentRow | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<PaymentRow | null>(null);
  // Method, side, split, and notes stay tucked away — the defaults inherit
  // from the obligation, so most payments only need an amount and a date.
  const [showMore, setShowMore] = useState(false);

  const enteredAmount = Number(formData.amount || 0);
  const paymentDirection = enteredAmount < 0 ? 'inflow' : 'outflow';
  const paymentMagnitude = Math.abs(enteredAmount);
  const isReversal = paymentDirection === 'inflow';
  const isScheduled = formData.mode === 'schedule';

  const hasItemPicker = (items?.length ?? 0) > 1;

  // Net paid per item (outflow allocations minus inflow reversals).
  const paidByItem = new Map<string, number>();
  for (const allocation of allocations ?? []) {
    const owning = payments.find((payment) => payment.id === allocation.payment_id);
    const sign = owning?.direction === 'inflow' ? -1 : 1;
    paidByItem.set(
      allocation.expense_item_id,
      (paidByItem.get(allocation.expense_item_id) ?? 0) + sign * allocation.amount,
    );
  }
  const itemRemaining = (itemId: string): number => {
    const item = items?.find((entry) => entry.id === itemId);
    if (!item) return outstanding;
    return Math.max(0, round2(item.amount - (paidByItem.get(itemId) ?? 0)));
  };

  // Excess/new-item classification only applies to auto-split recorded outflows.
  // When a specific item is targeted the full amount goes to it and the server
  // enforces that item's remaining balance.
  const excessAmount =
    isReversal || isScheduled || formData.apply_to_item_id
      ? 0
      : Math.max(0, round2(paymentMagnitude - outstanding));

  // Schedule-mode over-scheduling: outstanding minus already-scheduled outflows.
  const scheduledOutflowTotal = payments
    .filter((payment) => payment.status === 'scheduled' && payment.direction === 'outflow')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const unscheduled = round2(outstanding - scheduledOutflowTotal);
  const overScheduled =
    isScheduled && !isReversal && paymentMagnitude > unscheduled && unscheduled >= 0;

  const sortedPayments = [...payments].sort((left, right) => {
    const leftDate = left.paid_date ?? left.due_date ?? left.created_at;
    const rightDate = right.paid_date ?? right.due_date ?? right.created_at;
    return rightDate.localeCompare(leftDate);
  });

  const itemLabel = (itemId: string) =>
    items?.find((entry) => entry.id === itemId)?.description ?? 'Item';

  // Switching to schedule clears an auto-filled "today" — scheduling for
  // today is almost never the intent, so the date becomes an explicit choice.
  const setMode = (mode: PaymentMode) =>
    setFormData((prev) => ({
      ...prev,
      mode,
      modeTouched: true,
      payment_date:
        mode === 'schedule' && prev.payment_date === todayLocal()
          ? ''
          : mode === 'record' && prev.payment_date === ''
            ? todayLocal()
            : prev.payment_date,
    }));

  const updateDate = (payment_date: string) =>
    setFormData((prev) => ({
      ...prev,
      payment_date,
      mode: prev.modeTouched ? prev.mode : payment_date > todayLocal() ? 'schedule' : 'record',
    }));

  const startReverse = (payment: PaymentRow) => {
    setFormData((prev) => ({
      ...prev,
      amount: String(-payment.amount),
      mode: 'record',
      modeTouched: true,
      payment_date: todayLocal(),
      payment_method: payment.payment_method ?? prev.payment_method,
      paid_by_side: payment.paid_by_side ?? prev.paid_by_side,
      paid_bride_share_percentage:
        payment.paid_bride_share_percentage ?? prev.paid_bride_share_percentage,
      apply_to_item_id: null,
      reverses_payment_id: payment.id,
      notes: `Reversal of ${formatCurrency(payment.amount)} payment`,
    }));
    setShowMore(true);
    if (typeof document !== 'undefined') {
      document.getElementById('add-payment-heading')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSave = async () => {
    if (!canRecordPayment) {
      toast.error(disabledReason ?? 'Add the obligation amount first before recording payments.');
      return;
    }

    if (!enteredAmount) {
      toast.error('Enter a valid amount.');
      return;
    }

    if (!formData.payment_date) {
      toast.error(
        isScheduled ? 'Pick a due date for this scheduled payment.' : 'Pick the payment date.',
      );
      return;
    }

    if (excessAmount > 0 && !formData.extra_category_id) {
      toast.error('Select a category for the excess amount.');
      return;
    }

    const targetItemId = formData.apply_to_item_id;
    // Full amount to the targeted item — the server rejects if it exceeds that
    // item's remaining balance.
    const allocationForItem = targetItemId && !isScheduled ? paymentMagnitude : 0;

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
        ...(formData.reverses_payment_id
          ? { reverses_payment_id: formData.reverses_payment_id }
          : {}),
        ...(targetItemId && !isScheduled && allocationForItem > 0
          ? { allocations: [{ expense_item_id: targetItemId, amount: allocationForItem }] }
          : {}),
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
          ? 'Scheduled payment saved.'
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await onDelete(deleteTarget.id);
      toast.success('Scheduled payment deleted.');
      setDeleteTarget(null);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message =
        apiError.response?.data?.error ||
        apiError.response?.data?.message ||
        'Failed to delete payment.';
      toast.error(message);
    }
  };

  const confirmMarkPaid = async (result: MarkPaidResult) => {
    if (!markPaidTarget || !onUpdate) return;
    try {
      await onUpdate(markPaidTarget.id, {
        status: 'posted',
        paid_date: result.paid_date,
        payment_method: result.payment_method,
        amount: result.amount,
      });
      toast.success('Payment recorded.');
      setMarkPaidTarget(null);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message =
        apiError.response?.data?.error ||
        apiError.response?.data?.message ||
        'Failed to mark payment as paid.';
      toast.error(message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* The one place the money story is told */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px 28px',
          padding: '10px 16px',
          background: 'var(--bg-raised)',
          border: '1px solid var(--line-soft)',
          borderRadius: 10,
        }}
      >
        {(
          [
            { label: 'Allocated', value: committed, color: 'var(--ink-mid)' },
            { label: 'Paid', value: paid, color: 'var(--ok)' },
            {
              label: 'Outstanding',
              value: outstanding,
              color: outstanding > 0 ? 'var(--warn)' : 'var(--ink-dim)',
            },
          ] as const
        ).map((stat) => (
          <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-dim)',
              }}
            >
              {stat.label}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: stat.color }}>
              {formatCurrency(stat.value)}
            </span>
          </div>
        ))}
      </div>

      {/* Payment timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 className="form-section-title" style={{ margin: 0 }}>Payment Timeline</h3>

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
            {sortedPayments.map((payment) => (
              <PaymentTimelineItem
                key={payment.id}
                payment={payment}
                isDeleting={isDeleting}
                onDelete={(p) => setDeleteTarget(p)}
                onMarkPaid={onUpdate ? (p) => setMarkPaidTarget(p) : undefined}
                onReverse={startReverse}
                allocationChips={
                  hasItemPicker
                    ? (allocations ?? [])
                        .filter((allocation) => allocation.payment_id === payment.id)
                        .map((allocation) => ({
                          label: itemLabel(allocation.expense_item_id),
                          amount: allocation.amount,
                        }))
                    : []
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Add payment form — one working row; the mode toggle sits with the
          heading and everything else hides behind More options. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <h3 className="form-section-title" style={{ margin: 0 }} id="add-payment-heading">
            Add Payment
          </h3>
          {canRecordPayment && <ModeToggle mode={formData.mode} onChange={setMode} />}
        </div>

        {!canRecordPayment ? (
          <div
            style={{
              border: '1.5px dashed var(--line)',
              borderRadius: 10,
              padding: '16px 20px',
              fontSize: 13,
              color: 'var(--ink-low)',
              textAlign: 'center',
            }}
          >
            {disabledReason ?? 'Add the obligation amount first before recording payments.'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 md:items-end">
              <div>
                <label className="label">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                  className="input no-spinner"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <label className="label">{isScheduled ? 'Due Date' : 'Paid On'}</label>
                <DatePicker
                  value={formData.payment_date}
                  onChange={updateDate}
                  placeholder={isScheduled ? 'Pick a due date' : 'Paid on'}
                />
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={isCreating}
                className="btn-primary w-full md:w-auto"
                style={{ opacity: isCreating ? 0.5 : 1 }}
              >
                {isCreating
                  ? 'Saving…'
                  : isScheduled
                    ? 'Schedule payment'
                    : isReversal
                      ? 'Record reversal'
                      : 'Record payment'}
              </button>
            </div>

            {/* Everything below inherits sensible defaults — reveal on demand */}
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                alignSelf: 'flex-start',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--ink-low)',
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {showMore ? (
                <HiOutlineChevronUp style={{ width: 13, height: 13 }} />
              ) : (
                <HiOutlineChevronDown style={{ width: 13, height: 13 }} />
              )}
              {showMore ? 'Hide options' : 'More options'}
              {!showMore && (
                <span style={{ color: 'var(--ink-dim)', fontWeight: 400 }}>
                  ·{' '}
                  {[
                    !isScheduled ? PAYMENT_METHOD_LABELS[formData.payment_method] : null,
                    canSeeSplits ? SIDE_LABELS[formData.paid_by_side] : null,
                    canSeeSplits && formData.paid_by_side === 'shared'
                      ? `Bride ${formData.paid_bride_share_percentage}%`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              )}
            </button>

            {showMore && (
              <>
                {(() => {
                  const showSplit = canSeeSplits && formData.paid_by_side === 'shared';
                  const paymentMethodField = !isScheduled && (
                    <div>
                      <label className="label">Payment Method</label>
                      <select
                        value={formData.payment_method}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, payment_method: e.target.value }))
                        }
                        className="input"
                      >
                        {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                  const paidBySideField = canSeeSplits && (
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
                  );
                  const notesField = (
                    <div className="flex flex-col">
                      <label className="label">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                        className="input"
                        style={{ minHeight: 72, flex: 1, resize: 'vertical' }}
                        placeholder={
                          isScheduled
                            ? 'Optional reminder note'
                            : 'Optional reference, cheque number, or note'
                        }
                      />
                    </div>
                  );

                  // Left column groups the compact selects with the split they
                  // control; notes take the wider right column.
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3 md:items-stretch">
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          {paymentMethodField}
                          {paidBySideField}
                        </div>
                        {showSplit && (
                          <SplitShare
                            total={paymentMagnitude}
                            bridePercentage={formData.paid_bride_share_percentage}
                            onChange={(pct) =>
                              setFormData((p) => ({ ...p, paid_bride_share_percentage: pct }))
                            }
                          />
                        )}
                      </div>
                      {notesField}
                    </div>
                  );
                })()}

                {hasItemPicker && !isScheduled && (
                  <div>
                    <label className="label">Apply to</label>
                    <select
                      value={formData.apply_to_item_id ?? ''}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, apply_to_item_id: e.target.value || null }))
                      }
                      className="input"
                    >
                      <option value="">Split automatically</option>
                      {items?.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.description} · remaining {formatCurrency(itemRemaining(item.id))}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              </>
            )}

            {!isScheduled && formData.payment_date > todayLocal() && (
          <div style={{ fontSize: 12, color: 'var(--ink-low)' }}>
            Recording a future-dated payment (post-dated instrument).
          </div>
        )}

        {overScheduled && (
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
            This schedules more than the {formatCurrency(unscheduled)} still unscheduled. It
            won&apos;t change the paid total, but the schedule will exceed what&apos;s outstanding.
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label">Extra Amount Label</label>
                <input
                  type="text"
                  value={formData.extra_description}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, extra_description: e.target.value }))
                  }
                  className="input"
                  placeholder="Tip, late fee, extra service"
                />
              </div>
              {canSeeSplits && (
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
              )}
            </div>

            {canSeeSplits && formData.extra_side === 'shared' && (
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

          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete scheduled payment"
        message={
          deleteTarget
            ? `Delete the scheduled ${formatCurrency(deleteTarget.amount)} payment? This can't be undone.`
            : ''
        }
        confirmLabel="Delete"
        isPending={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {markPaidTarget && (
        <MarkPaidDialog
          payment={markPaidTarget}
          isPending={isUpdating}
          onConfirm={confirmMarkPaid}
          onCancel={() => setMarkPaidTarget(null)}
        />
      )}
    </div>
  );
}

interface AllocationChip {
  label: string;
  amount: number;
}

interface PaymentTimelineItemProps {
  payment: PaymentRow;
  isDeleting: boolean;
  onDelete: (payment: PaymentRow) => void;
  onMarkPaid?: ((payment: PaymentRow) => void) | undefined;
  onReverse?: ((payment: PaymentRow) => void) | undefined;
  allocationChips: AllocationChip[];
}

function PaymentTimelineItem({
  payment,
  isDeleting,
  onDelete,
  onMarkPaid,
  onReverse,
  allocationChips,
}: PaymentTimelineItemProps) {
  const dateLabel = payment.paid_date ?? payment.due_date ?? payment.created_at;
  const isScheduled = payment.status === 'scheduled';
  const isInflow = payment.direction === 'inflow';
  const isPostedOutflow = payment.status === 'posted' && !isInflow;
  const isOverdue = isScheduled && !!payment.due_date && payment.due_date < todayLocal();
  const amtColor = isInflow
    ? '#0369a1'
    : payment.status === 'posted'
      ? 'var(--ok)'
      : 'var(--gold-deep)';
  // One status chip in plain words — "outflow"/"posted" is ledger jargon.
  const statusChip = isInflow
    ? { text: 'Reversal', color: '#0369a1', bg: 'rgba(3,105,161,0.08)' }
    : isOverdue
      ? { text: 'Overdue', color: 'var(--warn)', bg: 'rgba(217,119,6,0.08)' }
      : isScheduled
        ? { text: 'Scheduled', color: 'var(--gold-deep)', bg: 'var(--gold-glow)' }
        : { text: 'Paid', color: 'var(--ok)', bg: 'rgba(22,163,74,0.08)' };

  return (
    <div
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: amtColor }}>
            {formatPaymentAmount(payment.amount, payment.direction)}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: '2px 7px',
              borderRadius: 100,
              background: statusChip.bg,
              color: statusChip.color,
            }}
          >
            {statusChip.text}
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
        {/* One meta line: when · how · who */}
        <div style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
          {payment.status === 'posted' ? 'Paid ' : 'Due '}
          {formatDateLabel(dateLabel)}
          {payment.payment_method &&
            ` · ${PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method}`}
          {payment.paid_by_side === 'shared' &&
            payment.paid_bride_share_percentage != null &&
            ` · Bride ${payment.paid_bride_share_percentage}% / Groom ${
              100 - payment.paid_bride_share_percentage
            }%`}
        </div>

        {allocationChips.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
            {allocationChips.map((chip, index) => (
              <span
                key={index}
                style={{
                  fontSize: 10,
                  padding: '2px 7px',
                  borderRadius: 6,
                  background: 'var(--bg-raised)',
                  color: 'var(--ink-low)',
                }}
              >
                {chip.label} {formatCurrency(chip.amount)}
              </span>
            ))}
          </div>
        )}

        {/* One action bar: note · receipt · state changes */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '4px 14px',
            marginTop: 4,
          }}
        >
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <PaymentNotesEditor paymentId={payment.id} notes={payment.notes} />
          </div>
          <PaymentAttachments paymentId={payment.id} />
          {isScheduled && onMarkPaid && (
            <button
              type="button"
              onClick={() => onMarkPaid(payment)}
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--ok)',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              Mark paid
            </button>
          )}
          {isPostedOutflow && onReverse && (
            <button
              type="button"
              onClick={() => onReverse(payment)}
              title="Records an offsetting reversal entry"
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--ink-low)',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              Undo payment
            </button>
          )}
        </div>
      </div>
      {isScheduled && (
        <button
          type="button"
          onClick={() => onDelete(payment)}
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
}
