import { useEffect, useMemo, useState } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';
import Portal from '../../../components/Portal';
import CategoryCombobox from '../../../components/CategoryCombobox';
import CustomCategoryModal from '../../../components/CustomCategoryModal';
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
    setFormData({
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
    });
  }, [expense]);

  const totalCommitted = useMemo(
    () =>
      formData?.items.reduce((sum, item) => sum + Number(item.amount || 0), 0) ?? 0,
    [formData],
  );

  if (!expense || !formData) return null;

  const updateItem = (id: string, patch: Partial<ExpenseItemForm>) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((item) =>
              item.local_id === id ? { ...item, ...patch } : item,
            ),
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gold-200">
              <h2 className="text-xl font-display font-bold text-maroon-800">Edit Expense</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(event) =>
                      setFormData((prev) =>
                        prev ? { ...prev, expense_date: event.target.value } : prev,
                      )
                    }
                    className="input"
                    required
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
                    className="text-sm text-maroon-700 hover:text-maroon-900 font-medium flex items-center gap-1"
                  >
                    <HiOutlinePlus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={item.local_id} className="rounded-xl border border-gold-200 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-maroon-800">Item {index + 1}</h4>
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
                        <div className="flex gap-2">
                          {(['bride', 'groom', 'shared'] as const).map((side) => (
                            <button
                              key={side}
                              type="button"
                              onClick={() => updateItem(item.local_id, { side })}
                              className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                                item.side === side
                                  ? side === 'bride'
                                    ? 'border-pink-500 bg-pink-50 text-pink-700'
                                    : side === 'groom'
                                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                                      : 'border-gold-500 bg-gold-50 text-gold-700'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {side === 'shared'
                                ? 'Shared'
                                : `${side.charAt(0).toUpperCase()}${side.slice(1)}`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {item.side === 'shared' && (
                        <div>
                          <label className="label">
                            Bride Share Percentage ({item.bride_share_percentage}%)
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={item.bride_share_percentage}
                            onChange={(event) =>
                              updateItem(item.local_id, {
                                bride_share_percentage: Number(event.target.value),
                              })
                            }
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Committed Total</span>
                  <span className="text-lg font-semibold text-maroon-800">
                    ₹{totalCommitted.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </form>

            <div className="flex gap-3 p-6 border-t border-gold-200">
              <button type="button" onClick={onClose} className="btn-outline flex-1">
                Cancel
              </button>
              <button
                onClick={(event) => void handleSubmit(event as unknown as React.FormEvent<HTMLFormElement>)}
                disabled={isPending}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </Portal>

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
