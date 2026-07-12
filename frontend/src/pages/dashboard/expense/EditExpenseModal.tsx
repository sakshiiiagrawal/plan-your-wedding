import { useEffect, useMemo, useState } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';
import Portal from '../../../components/Portal';
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

const createItem = (): ExpenseItemForm => ({
  local_id: Math.random().toString(36).slice(2),
  description: '',
  amount: '',
  planned_amount: '',
  category_id: null,
  side: 'shared',
  bride_share_percentage: 50,
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

  useEffect(() => {
    if (!expense) return;
    setFormData(getExpenseFormState(expense));
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
  // Blank planned falls back to the item's amount (mirrors the server default).
  const totalPlanned = useMemo(
    () =>
      formData?.items.reduce(
        (sum, item) =>
          sum + (item.planned_amount === '' ? Number(item.amount || 0) : Number(item.planned_amount)),
        0,
      ) ?? 0,
    [formData],
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(expense.id, {
      description: formData.description,
      expense_date: formData.expense_date,
      notes: formData.notes || null,
      items: formData.items.map((item, index) => ({
        ...(item.id ? { id: item.id } : {}),
        category_id: item.category_id,
        description: item.description,
        amount: Number(item.amount || 0),
        // B1: blank planned is an explicit reset-to-allocated (the field is
        // pre-filled, so clearing it is intentional).
        planned_amount:
          item.planned_amount === '' ? Number(item.amount || 0) : Number(item.planned_amount),
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
      <Portal>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 16,
          }}
          onClick={attemptClose}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-panel)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: 768,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid var(--line-soft)',
              }}
            >
              <div>
                <div className="uppercase-eyebrow" style={{ marginBottom: 4 }}>
                  Expenses
                </div>
                <h2
                  className="display"
                  style={{ margin: 0, fontSize: 22, color: 'var(--ink-high)' }}
                >
                  Edit Expense
                </h2>
              </div>
              <button
                onClick={attemptClose}
                style={{
                  padding: '6px 8px',
                  borderRadius: 6,
                  color: 'var(--ink-dim)',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <HiOutlineX style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <form id="edit-expense-form" onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Expense Title *</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(event) =>
                      setFormData((prev) =>
                        prev ? { ...prev, description: event.target.value } : prev,
                      )
                    }
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Expense Date *</label>
                  <DatePicker
                    value={formData.expense_date}
                    onChange={(v) =>
                      setFormData((prev) => (prev ? { ...prev, expense_date: v } : prev))
                    }
                    required
                    placeholder="Expense date"
                  />
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(event) =>
                    setFormData((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
                  }
                  className="input min-h-[88px]"
                  placeholder="Optional notes"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="section-title">Line Items</h3>
                    <p className="text-sm text-ink-low">
                      Keep the allocated amount aligned with the real category breakdown.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) =>
                        prev ? { ...prev, items: [...prev.items, createItem()] } : prev,
                      )
                    }
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
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
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
                      <div className="flex items-center justify-between">
                        <h4 style={{ fontWeight: 600, color: 'var(--ink-high)', fontSize: 13 }}>
                          Item {index + 1}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeItem(item.local_id)}
                          disabled={
                            formData.items.length === 1 ||
                            (!!item.id && (paidByItem.get(item.id) ?? 0) > 0)
                          }
                          title={
                            item.id && (paidByItem.get(item.id) ?? 0) > 0
                              ? `${formatCurrency(paidByItem.get(item.id) ?? 0)} paid against this item — reverse those payments first`
                              : undefined
                          }
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>

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

                      <div className="grid sm:grid-cols-2 gap-4">
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
                            className="input"
                            placeholder="Blank resets to allocated"
                          />
                        </div>
                        <div>
                          <label className="label">Allocated *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.amount}
                            onChange={(event) =>
                              updateItem(item.local_id, { amount: event.target.value })
                            }
                            className="input"
                            required
                          />
                        </div>
                      </div>

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

                      {canSeeSplits && (
                      <div>
                        <label className="label">Liability Side</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {(['bride', 'groom', 'shared'] as const).map((side) => {
                            const isActive = item.side === side;
                            const activeStyle =
                              side === 'bride'
                                ? {
                                    borderColor: 'var(--bride-line)',
                                    background: 'var(--bride-soft)',
                                    color: 'var(--bride-deep)',
                                  }
                                : side === 'groom'
                                  ? {
                                      borderColor: 'var(--groom-line)',
                                      background: 'var(--groom-soft)',
                                      color: 'var(--groom-deep)',
                                    }
                                  : {
                                      borderColor: 'var(--line-strong)',
                                      background: 'var(--bg-highest)',
                                      color: 'var(--ink-high)',
                                    };
                            return (
                              <button
                                key={side}
                                type="button"
                                onClick={() => updateItem(item.local_id, { side })}
                                style={{
                                  flex: 1,
                                  padding: '8px 4px',
                                  borderRadius: 8,
                                  border: `2px solid ${isActive ? activeStyle.borderColor : 'var(--line)'}`,
                                  background: isActive ? activeStyle.background : 'transparent',
                                  color: isActive ? activeStyle.color : 'var(--ink-low)',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  transition: 'all 150ms',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {side === 'shared'
                                  ? 'Shared'
                                  : `${side.charAt(0).toUpperCase()}${side.slice(1)}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      )}

                      {canSeeSplits && item.side === 'shared' && (
                        <SplitShare
                          total={Number(item.amount) || 0}
                          bridePercentage={item.bride_share_percentage}
                          onChange={(pct) =>
                            updateItem(item.local_id, { bride_share_percentage: pct })
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>

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
                    Planned {formatCurrency(totalPlanned)}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--ink-low)' }}>
                    Allocated{' '}
                    <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--gold-deep)' }}>
                      {formatCurrency(totalCommitted)}
                    </span>
                  </span>
                </div>
              </div>

            </form>

            {/* A8: kept outside the form so a payment-panel key press can't
                submit the expense edit. */}
            <div className="px-6 pb-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="section-title">Payments</h3>
                  <p className="text-sm text-ink-low">
                    Record advance, milestone, and final payments against this expense.
                  </p>
                </div>
                <PaymentTimelinePanel
                  payments={payments}
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
              <div className="space-y-3" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 16 }}>
                <div className="flex items-center gap-2">
                  <h3 className="section-title" style={{ margin: 0 }}>Status</h3>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 100,
                      textTransform: 'capitalize',
                      background: 'var(--bg-raised)',
                      color: 'var(--ink-low)',
                    }}
                  >
                    {expense.status}
                  </span>
                </div>
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
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => void onSubmit(expense.id, { status: 'active' })}
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                padding: '16px 24px',
                borderTop: '1px solid var(--line-soft)',
              }}
            >
              <button
                type="button"
                onClick={attemptClose}
                className="btn-outline"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-expense-form"
                disabled={isPending}
                className="btn-primary"
                style={{ flex: 1, opacity: isPending ? 0.5 : 1 }}
              >
                {isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </Portal>

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
