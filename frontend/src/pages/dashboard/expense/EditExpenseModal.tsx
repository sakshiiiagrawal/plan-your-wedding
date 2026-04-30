import { useEffect, useMemo, useState } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';
import Portal from '../../../components/Portal';
import CategoryCombobox from '../../../components/CategoryCombobox';
import CustomCategoryModal from '../../../components/CustomCategoryModal';
import DatePicker from '../../../components/ui/DatePicker';
import SplitShare from '../../../components/ui/SplitShare';
import useUnsavedChangesPrompt from '../../../hooks/useUnsavedChangesPrompt';
import type { ExpenseWithDetails } from '@wedding-planner/shared';

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
  const [formData, setFormData] = useState<FormData | null>(null);
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
  const [customCategoryParentId, setCustomCategoryParentId] = useState<string | null>(null);

  useEffect(() => {
    if (!expense) return;
    setFormData(getExpenseFormState(expense));
  }, [expense]);

  const totalCommitted = useMemo(
    () => formData?.items.reduce((sum, item) => sum + Number(item.amount || 0), 0) ?? 0,
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

  if (!expense || !formData) return null;

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
        side: item.side,
        bride_share_percentage: item.side === 'shared' ? item.bride_share_percentage : null,
        display_order: index + 1,
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
                    <p className="text-sm text-gray-500">
                      Keep the committed amount aligned with the real category breakdown.
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
                          disabled={formData.items.length === 1}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
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
                        <div>
                          <label className="label">Amount *</label>
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

                      {item.side === 'shared' && (
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
                  <span style={{ fontSize: 13, color: 'var(--ink-low)' }}>Committed Total</span>
                  <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--gold-deep)' }}>
                    ₹{totalCommitted.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </form>

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
