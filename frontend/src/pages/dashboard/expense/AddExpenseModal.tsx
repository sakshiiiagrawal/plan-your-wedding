import { useMemo, useRef, useState } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';
import Portal from '../../../components/Portal';
import CategoryCombobox from '../../../components/CategoryCombobox';
import CustomCategoryModal from '../../../components/CustomCategoryModal';
import DatePicker from '../../../components/ui/DatePicker';
import SplitShare from '../../../components/ui/SplitShare';
import InstallmentsEditor, {
  installmentsExceedTotal,
  installmentToPaymentPayload,
  type InstallmentFormRow,
} from '../../../components/finance/InstallmentsEditor';
import useUnsavedChangesPrompt from '../../../hooks/useUnsavedChangesPrompt';
import { useModalDismiss } from '../../../hooks/useModalDismiss';
import { formatCurrency } from '../../../utils/currency';
import { todayLocal } from '../../../utils/date';
import { financeTier } from '@wedding-planner/shared';
import { useAuth } from '../../../contexts/AuthContext';

interface AddExpenseModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  isPending: boolean;
}

interface ExpenseItemForm {
  id: string;
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
  installments: InstallmentFormRow[];
}

const createItem = (): ExpenseItemForm => ({
  id: Math.random().toString(36).slice(2),
  description: '',
  amount: '',
  planned_amount: '',
  category_id: null,
  side: 'shared',
  bride_share_percentage: 50,
});

const createInitialForm = (): FormData => ({
  description: '',
  expense_date: todayLocal(),
  notes: '',
  items: [createItem()],
  installments: [],
});

export default function AddExpenseModal({
  show,
  onClose,
  onSubmit,
  isPending,
}: AddExpenseModalProps) {
  const { user } = useAuth();
  const canSeeSplits = financeTier(user) === 'full';
  // Stable baseline for dirty-checking and reset; the item id stays fixed for
  // this mount so an untouched form compares equal.
  const initialFormRef = useRef<FormData>(createInitialForm());
  const [formData, setFormData] = useState<FormData>(initialFormRef.current);
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
  const [customCategoryParentId, setCustomCategoryParentId] = useState<string | null>(null);

  const totalCommitted = useMemo(
    () => formData.items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [formData.items],
  );
  // Blank planned falls back to the item's amount (mirrors the server default).
  const totalPlanned = useMemo(
    () =>
      formData.items.reduce(
        (sum, item) =>
          sum + (item.planned_amount === '' ? Number(item.amount || 0) : Number(item.planned_amount)),
        0,
      ),
    [formData.items],
  );
  const paymentExceedsTotal = installmentsExceedTotal(formData.installments, totalCommitted);

  const handleClose = () => {
    setFormData(initialFormRef.current);
    onClose();
  };
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormRef.current);
  const { attemptClose, dialog: unsavedDialog } = useUnsavedChangesPrompt({
    isDirty,
    onDiscard: handleClose,
    onSave: () => {
      (document.getElementById('add-expense-form') as HTMLFormElement | null)?.requestSubmit();
    },
    isSaving: isPending,
  });
  useModalDismiss(show, attemptClose);

  const updateItem = (id: string, patch: Partial<ExpenseItemForm>) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const removeItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((item) => item.id !== id) : prev.items,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      description: formData.description,
      expense_date: formData.expense_date,
      notes: formData.notes || null,
      items: formData.items.map((item, index) => ({
        category_id: item.category_id,
        description: item.description,
        amount: Number(item.amount || 0),
        // Blank means "no separate estimate" — the server defaults it to amount.
        ...(item.planned_amount !== '' ? { planned_amount: Number(item.planned_amount) } : {}),
        display_order: index + 1,
        ...(canSeeSplits
          ? {
              side: item.side,
              bride_share_percentage: item.side === 'shared' ? item.bride_share_percentage : null,
            }
          : {}),
      })),
      payments: formData.installments.map((installment) =>
        installmentToPaymentPayload(installment, canSeeSplits),
      ),
    });

    // Only reached on success — onSubmit rethrows on failure, preserving the
    // form (and the unsaved-changes dialog) so nothing is lost.
    const fresh = createInitialForm();
    initialFormRef.current = fresh;
    setFormData(fresh);
  };

  if (!show) return null;

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
                  Add Expense
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

            <form id="add-expense-form" onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Expense Title *</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, description: event.target.value }))
                    }
                    className="input"
                    placeholder="Photography contract, decor advance, etc."
                    required
                  />
                </div>
                <div>
                  <label className="label">Expense Date *</label>
                  <DatePicker
                    value={formData.expense_date}
                    onChange={(v) => setFormData((prev) => ({ ...prev, expense_date: v }))}
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
                    setFormData((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  className="input min-h-[88px]"
                  placeholder="Optional notes about the obligation"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="section-title">Line Items</h3>
                    <p className="text-sm text-ink-low">
                      Categories, side splits, and planned/allocated totals come from these items.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, items: [...prev.items, createItem()] }))
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
                      key={item.id}
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
                          onClick={() => removeItem(item.id)}
                          disabled={formData.items.length === 1}
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
                            updateItem(item.id, { description: event.target.value })
                          }
                          className="input"
                          placeholder="Base package, flowers, travel fee"
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
                              updateItem(item.id, { planned_amount: event.target.value })
                            }
                            className="input"
                            placeholder="Defaults to allocated"
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
                              updateItem(item.id, { amount: event.target.value })
                            }
                            className="input"
                            placeholder="0"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label">Category *</label>
                        <CategoryCombobox
                          value={item.category_id}
                          onChange={(id) => updateItem(item.id, { category_id: id })}
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
                                    borderColor: '#be185d',
                                    background: 'rgba(190,24,93,0.06)',
                                    color: '#be185d',
                                  }
                                : side === 'groom'
                                  ? {
                                      borderColor: '#1d4ed8',
                                      background: 'rgba(29,78,216,0.06)',
                                      color: '#1d4ed8',
                                    }
                                  : {
                                      borderColor: 'var(--gold)',
                                      background: 'var(--gold-glow)',
                                      color: 'var(--gold-deep)',
                                    };
                            return (
                              <button
                                key={side}
                                type="button"
                                onClick={() => updateItem(item.id, { side })}
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
                          onChange={(pct) => updateItem(item.id, { bride_share_percentage: pct })}
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

              <InstallmentsEditor
                installments={formData.installments}
                onChange={(installments) => setFormData((prev) => ({ ...prev, installments }))}
                committedTotal={totalCommitted}
                canSeeSplits={canSeeSplits}
              />

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  paddingTop: 8,
                  borderTop: '1px solid var(--line-soft)',
                  marginTop: 8,
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
                  disabled={isPending || paymentExceedsTotal}
                  className="btn-primary"
                  style={{ flex: 1, opacity: isPending || paymentExceedsTotal ? 0.5 : 1 }}
                >
                  {isPending ? 'Saving…' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Portal>
      {unsavedDialog}

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
