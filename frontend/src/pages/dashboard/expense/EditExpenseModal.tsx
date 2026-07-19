import { useEffect, useMemo, useState } from 'react';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';
import { Modal, FormSection, SectionAction, SideToggle } from '../../../components/ui/Modal';
import CategoryCombobox from '../../../components/CategoryCombobox';
import CustomCategoryModal from '../../../components/CustomCategoryModal';
import DatePicker from '../../../components/ui/DatePicker';
import SplitShare from '../../../components/ui/SplitShare';
import PaymentTimelinePanel from '../../../components/finance/PaymentTimelinePanel';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import useUnsavedChangesPrompt from '../../../hooks/useUnsavedChangesPrompt';
import { useModalDismiss } from '../../../hooks/useModalDismiss';
import type { ExpenseWithDetails, FinanceHeaderStatus } from '@wedding-planner/shared';
import { financeTier } from '@wedding-planner/shared';
import { formatCurrency } from '../../../utils/currency';
import { useAuth } from '../../../contexts/AuthContext';
import {
  useBudgetPageData,
  useCreateExpensePayment,
  useDeleteExpensePayment,
  useExpensePaymentsForExpense,
  useUpdateExpensePayment,
} from '../../../hooks/useApi';

export type ExpenseRow = ExpenseWithDetails;

interface EditExpenseModalProps {
  expense: ExpenseRow | null;
  onClose: () => void;
  onSubmit: (id: string, payload: Record<string, unknown>) => Promise<void>;
  isPending: boolean;
}

interface ExpenseItemForm {
  id?: string;
  local_id: string;
  description: string;
  amount: string;
  planned_amount: string;
  category_id: string | null;
  side: 'bride' | 'groom' | 'shared';
  bride_share_percentage: number;
}

interface FormData {
  description: string;
  expense_date: string;
  notes: string;
  items: ExpenseItemForm[];
}

// New items inherit the previous item's side/split so multi-item entry
// doesn't re-ask a question already answered.
const createItem = (prev?: ExpenseItemForm): ExpenseItemForm => ({
  local_id: Math.random().toString(36).slice(2),
  description: '',
  amount: '',
  planned_amount: '',
  category_id: null,
  side: prev?.side ?? 'shared',
  bride_share_percentage: prev?.bride_share_percentage ?? 50,
});

function getExpenseFormState(expense: ExpenseRow | null): FormData | null {
  if (!expense) return null;
  return {
    description: expense.description,
    expense_date: expense.expense_date,
    notes: expense.notes ?? '',
    items:
      expense.items.length > 0
        ? expense.items.map((item) => ({
            id: item.id,
            local_id: item.id,
            description: item.description,
            amount: String(item.amount),
            planned_amount: String(item.planned_amount ?? ''),
            category_id: item.category_id,
            side: item.side,
            bride_share_percentage: item.bride_share_percentage ?? 50,
          }))
        : [createItem()],
  };
}

export default function EditExpenseModal({
  expense,
  onClose,
  onSubmit,
  isPending,
}: EditExpenseModalProps) {
  const { user } = useAuth();
  const canSeeSplits = financeTier(user) === 'full';
  const [formData, setFormData] = useState<FormData | null>(null);
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
  const [customCategoryParentId, setCustomCategoryParentId] = useState<string | null>(null);
  // Items whose planned estimate genuinely differs from the amount (or was
  // revealed by hand). Hidden planned fields track the amount on save.
  const [plannedOpen, setPlannedOpen] = useState<Set<string>>(new Set());
  // True when the single item's description is just the expense title — then
  // we don't show a second field asking for the same words.
  const [soloDescSynced, setSoloDescSynced] = useState(false);

  useEffect(() => {
    if (!expense) return;
    const state = getExpenseFormState(expense);
    setFormData(state);
    if (state) {
      setPlannedOpen(
        new Set(
          state.items
            .filter(
              (item) =>
                item.planned_amount !== '' &&
                Number(item.planned_amount) !== Number(item.amount),
            )
            .map((item) => item.local_id),
        ),
      );
      setSoloDescSynced(
        state.items.length === 1 &&
          (state.items[0]!.description === '' ||
            state.items[0]!.description === state.description),
      );
    }
  }, [expense]);

  const { data: payments = [] } = useExpensePaymentsForExpense(expense?.id);
  const createExpensePayment = useCreateExpensePayment();
  const deleteExpensePayment = useDeleteExpensePayment();
  const updateExpensePayment = useUpdateExpensePayment();
  const [statusConfirm, setStatusConfirm] = useState<FinanceHeaderStatus | null>(null);

  // A3: live copy so the payment panel reflects fresh summary/items/allocations
  // without reopening. Form fields still init from the prop snapshot.
  const { data: pageData } = useBudgetPageData();
  const liveExpense = pageData?.expenses.find((e) => e.id === expense?.id) ?? expense;

  // A4-client: net paid per item, so items backing payments can't be deleted.
  const paidByItem = useMemo(() => {
    const map = new Map<string, number>();
    if (!liveExpense) return map;
    for (const allocation of liveExpense.allocations) {
      const owning = liveExpense.payments.find((p) => p.id === allocation.payment_id);
      const sign = owning?.direction === 'inflow' ? -1 : 1;
      map.set(
        allocation.expense_item_id,
        (map.get(allocation.expense_item_id) ?? 0) + sign * allocation.amount,
      );
    }
    return map;
  }, [liveExpense]);

  const totalCommitted = useMemo(
    () => formData?.items.reduce((sum, item) => sum + Number(item.amount || 0), 0) ?? 0,
    [formData],
  );
  // Hidden or blank planned falls back to the item's amount (mirrors what the
  // submit payload sends).
  const totalPlanned = useMemo(
    () =>
      formData?.items.reduce(
        (sum, item) =>
          sum +
          (!plannedOpen.has(item.local_id) || item.planned_amount === ''
            ? Number(item.amount || 0)
            : Number(item.planned_amount)),
        0,
      ) ?? 0,
    [formData, plannedOpen],
  );
  const isDirty = JSON.stringify(formData) !== JSON.stringify(getExpenseFormState(expense));
  const { attemptClose, dialog: unsavedDialog } = useUnsavedChangesPrompt({
    isDirty,
    onDiscard: onClose,
    onSave: () => {
      (document.getElementById('edit-expense-form') as HTMLFormElement | null)?.requestSubmit();
    },
    isSaving: isPending,
  });
  useModalDismiss(expense !== null, attemptClose);

  if (!expense || !formData) return null;
  const detail = liveExpense ?? expense;
  const singleItem = formData.items.length === 1;
  const hideSoloDescription = singleItem && soloDescSynced;

  const updateItem = (id: string, patch: Partial<ExpenseItemForm>) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((item) => (item.local_id === id ? { ...item, ...patch } : item)),
          }
        : prev,
    );
  };

  const removeItem = (id: string) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            items:
              prev.items.length > 1
                ? prev.items.filter((item) => item.local_id !== id)
                : prev.items,
          }
        : prev,
    );
  };

  // Amount = the allocated amount. The separate planned estimate stays hidden
  // until asked for — most items don't track one.
  const renderAmountField = (item: ExpenseItemForm) => (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <label className="label">Amount *</label>
        {!plannedOpen.has(item.local_id) && (
          <button
            type="button"
            onClick={() => setPlannedOpen((prev) => new Set(prev).add(item.local_id))}
            style={{
              fontSize: 11,
              color: 'var(--ink-dim)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            + planned estimate
          </button>
        )}
      </div>
      <input
        type="number"
        min="0"
        step="0.01"
        value={item.amount}
        onChange={(event) => updateItem(item.local_id, { amount: event.target.value })}
        className="input no-spinner"
        required
      />
    </div>
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(expense.id, {
      description: formData.description,
      expense_date: formData.expense_date,
      notes: formData.notes || null,
      items: formData.items.map((item, index) => ({
        ...(item.id ? { id: item.id } : {}),
        category_id: item.category_id,
        // A hidden solo description follows the title; otherwise keep what the
        // user typed (falling back to the title for safety).
        description:
          singleItem && soloDescSynced
            ? formData.description
            : item.description || formData.description,
        amount: Number(item.amount || 0),
        // A hidden planned field means "no separate estimate" — it tracks the
        // amount. When visible, blank is an explicit reset-to-allocated (B1).
        planned_amount: !plannedOpen.has(item.local_id)
          ? Number(item.amount || 0)
          : item.planned_amount === ''
            ? Number(item.amount || 0)
            : Number(item.planned_amount),
        display_order: index + 1,
        ...(canSeeSplits
          ? {
              side: item.side,
              bride_share_percentage: item.side === 'shared' ? item.bride_share_percentage : null,
            }
          : {}),
      })),
    });
  };

  return (
    <>
      <Modal
        onClose={attemptClose}
        eyebrow="Expenses"
        title="Edit expense"
        size="lg"
        headerRight={
          <span
            style={{
              fontSize: 11,
              padding: '2px 10px',
              borderRadius: 100,
              textTransform: 'capitalize',
              background: 'var(--bg-raised)',
              border: '1px solid var(--line-soft)',
              color: 'var(--ink-low)',
              whiteSpace: 'nowrap',
            }}
          >
            {expense.status}
          </span>
        }
        footerLeft={
          <span>
            {totalPlanned !== totalCommitted && <>Planned {formatCurrency(totalPlanned)} · </>}
            Total{' '}
            <strong style={{ color: 'var(--gold-deep)' }}>{formatCurrency(totalCommitted)}</strong>
          </span>
        }
        footer={
          <>
            <button type="button" onClick={attemptClose} className="btn-outline">
              Cancel
            </button>
            <button
              type="submit"
              form="edit-expense-form"
              disabled={isPending}
              className="btn-primary"
              style={{ minWidth: 150 }}
            >
              {isPending ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      >
        <form
          id="edit-expense-form"
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Expense Title *</label>
              <input
                type="text"
                value={formData.description}
                onChange={(event) =>
                  setFormData((prev) => (prev ? { ...prev, description: event.target.value } : prev))
                }
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Expense Date *</label>
              <DatePicker
                value={formData.expense_date}
                onChange={(v) => setFormData((prev) => (prev ? { ...prev, expense_date: v } : prev))}
                required
                placeholder="Expense date"
              />
            </div>
          </div>

          <FormSection
            title="Line Items"
            hint="Keep the allocated amount aligned with the real category breakdown."
            action={
              <SectionAction
                onClick={() =>
                  setFormData((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      items: [
                        // Going from one item to several: a hidden solo
                        // description was the title, so materialize it.
                        ...prev.items.map((item, i) =>
                          i === 0 && prev.items.length === 1 && hideSoloDescription
                            ? { ...item, description: prev.description }
                            : item,
                        ),
                        createItem(prev.items[prev.items.length - 1]),
                      ],
                    };
                  })
                }
              >
                <HiOutlinePlus className="w-4 h-4" />
                Add Item
              </SectionAction>
            }
          >
            {formData.items.map((item, index) => (
              <div
                key={item.local_id}
                style={{
                  borderRadius: 10,
                  border: '1px solid var(--line-soft)',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                {!singleItem && (
                  <div className="flex items-center justify-between">
                    <h4
                      style={{ margin: 0, fontWeight: 600, color: 'var(--ink-high)', fontSize: 13 }}
                    >
                      Item {index + 1}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removeItem(item.local_id)}
                      disabled={!!item.id && (paidByItem.get(item.id) ?? 0) > 0}
                      title={
                        item.id && (paidByItem.get(item.id) ?? 0) > 0
                          ? `${formatCurrency(paidByItem.get(item.id) ?? 0)} paid against this item — reverse those payments first`
                          : undefined
                      }
                      aria-label={`Remove item ${index + 1}`}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  {/* One item whose description is the title = don't ask twice. */}
                  {!hideSoloDescription && (
                    <div>
                      <label className="label">Item Description *</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(event) =>
                          updateItem(item.local_id, { description: event.target.value })
                        }
                        className="input"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="label">Category *</label>
                    <CategoryCombobox
                      value={item.category_id}
                      onChange={(id) => updateItem(item.local_id, { category_id: id })}
                      level="subcategory"
                      placeholder="Search categories…"
                      allowCustom
                      onAddCustom={(parentId) => {
                        setCustomCategoryParentId(parentId);
                        setShowCustomCategoryModal(true);
                      }}
                      required
                    />
                  </div>
                  {hideSoloDescription && renderAmountField(item)}
                </div>

                {!hideSoloDescription && (
                  <div className="grid sm:grid-cols-2 gap-3">{renderAmountField(item)}</div>
                )}

                {plannedOpen.has(item.local_id) && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label">Planned (estimate)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.planned_amount}
                        onChange={(event) =>
                          updateItem(item.local_id, { planned_amount: event.target.value })
                        }
                        className="input no-spinner"
                        placeholder="Blank resets to amount"
                      />
                    </div>
                  </div>
                )}

                {canSeeSplits && (
                  <div>
                    <label className="label">Liability Side</label>
                    <SideToggle
                      value={item.side}
                      onChange={(side) => updateItem(item.local_id, { side })}
                    />
                  </div>
                )}

                {canSeeSplits && item.side === 'shared' && (
                  <SplitShare
                    total={Number(item.amount) || 0}
                    bridePercentage={item.bride_share_percentage}
                    onChange={(pct) => updateItem(item.local_id, { bride_share_percentage: pct })}
                  />
                )}
              </div>
            ))}

            <div
              style={{
                background: 'var(--bg-raised)',
                borderRadius: 10,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid var(--line-soft)',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--ink-low)' }}>
                {totalPlanned !== totalCommitted ? `Planned ${formatCurrency(totalPlanned)}` : ''}
              </span>
              <span style={{ fontSize: 13, color: 'var(--ink-low)' }}>
                Total{' '}
                <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--gold-deep)' }}>
                  {formatCurrency(totalCommitted)}
                </span>
              </span>
            </div>
          </FormSection>

          <FormSection title="Notes">
            <textarea
              value={formData.notes}
              onChange={(event) =>
                setFormData((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
              }
              className="input min-h-[72px]"
              placeholder="Optional notes"
            />
          </FormSection>
        </form>

        {/* A8: kept outside the form so a payment-panel key press can't
            submit the expense edit. */}
        <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 20 }}>
          <PaymentTimelinePanel
            payments={payments}
            planned={detail.summary?.planned_amount ?? 0}
            committed={detail.summary?.committed_amount ?? totalCommitted}
            paid={detail.summary?.paid_amount ?? 0}
            outstanding={detail.summary?.outstanding_amount ?? totalCommitted}
            onCreate={(payload) =>
              createExpensePayment.mutateAsync({ expenseId: expense.id, ...payload })
            }
            onDelete={(paymentId) =>
              deleteExpensePayment.mutateAsync({ expenseId: expense.id, paymentId })
            }
            onUpdate={(paymentId, payload) =>
              updateExpensePayment.mutateAsync({ paymentId, ...payload })
            }
            isUpdating={updateExpensePayment.isPending}
            items={detail.items}
            allocations={detail.allocations}
            isCreating={createExpensePayment.isPending}
            isDeleting={deleteExpensePayment.isPending}
            defaultSplit={{
              side: detail.items[0]?.side ?? 'shared',
              bridePercentage: detail.items[0]?.bride_share_percentage ?? 50,
            }}
            canSeeSplits={canSeeSplits}
            canRecordPayment={detail.items.length > 0}
            disabledReason="Add a line item first before recording payments."
          />
        </div>

        {/* A5/C6: lifecycle actions */}
        <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 20 }}>
          <FormSection
            title="Status"
            hint={
              expense.status === 'active'
                ? 'Close the expense when it is settled, or terminate to cancel what remains.'
                : 'This expense is not active — reopen it to make further changes.'
            }
          >
            {expense.status === 'active' ? (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setStatusConfirm('closed')}
                >
                  Close expense
                </button>
                <button
                  type="button"
                  onClick={() => setStatusConfirm('terminated')}
                  style={{
                    fontSize: 12,
                    color: 'var(--ink-dim)',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  Terminate…
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => void onSubmit(expense.id, { status: 'active' })}
                >
                  Reopen
                </button>
              </div>
            )}
          </FormSection>
        </div>
      </Modal>

      {unsavedDialog}

      <ConfirmDialog
        open={statusConfirm != null}
        title={statusConfirm === 'terminated' ? 'Terminate expense' : 'Close expense'}
        message={
          statusConfirm === 'terminated'
            ? 'This cancels any scheduled payments and trims each line item down to what has actually been paid. This cannot be undone.'
            : 'Mark this expense as closed. Scheduled payments stay, and you can reopen it later.'
        }
        confirmLabel={statusConfirm === 'terminated' ? 'Terminate' : 'Close'}
        isPending={isPending}
        onConfirm={() => {
          const next = statusConfirm;
          setStatusConfirm(null);
          if (next) void onSubmit(expense.id, { status: next });
        }}
        onCancel={() => setStatusConfirm(null)}
      />

      <CustomCategoryModal
        isOpen={showCustomCategoryModal}
        onClose={() => {
          setShowCustomCategoryModal(false);
          setCustomCategoryParentId(null);
        }}
        defaultParentId={customCategoryParentId}
      />
    </>
  );
}
