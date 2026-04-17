import { useMemo, useState } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';
import Portal from '../../../components/Portal';
import CategoryCombobox from '../../../components/CategoryCombobox';
import CustomCategoryModal from '../../../components/CustomCategoryModal';

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
  category_id: string | null;
  side: 'bride' | 'groom' | 'shared';
  bride_share_percentage: number;
}

interface FormData {
  description: string;
  expense_date: string;
  notes: string;
  items: ExpenseItemForm[];
  record_payment_now: boolean;
  payment_amount: string;
  payment_date: string;
  payment_method: string;
  paid_by_side: 'bride' | 'groom' | 'shared';
  payment_notes: string;
}

const TODAY = new Date().toISOString().split('T')[0] ?? '';

const createItem = (): ExpenseItemForm => ({
  id: Math.random().toString(36).slice(2),
  description: '',
  amount: '',
  category_id: null,
  side: 'shared',
  bride_share_percentage: 50,
});

const INITIAL_FORM: FormData = {
  description: '',
  expense_date: TODAY,
  notes: '',
  items: [createItem()],
  record_payment_now: false,
  payment_amount: '',
  payment_date: TODAY,
  payment_method: 'cash',
  paid_by_side: 'shared',
  payment_notes: '',
};

export default function AddExpenseModal({
  show,
  onClose,
  onSubmit,
  isPending,
}: AddExpenseModalProps) {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
  const [customCategoryParentId, setCustomCategoryParentId] = useState<string | null>(null);

  const totalCommitted = useMemo(
    () => formData.items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [formData.items],
  );
  const paymentAmount = Number(formData.payment_amount || 0);
  const paymentExceedsTotal = formData.record_payment_now && paymentAmount > totalCommitted;

  const handleClose = () => {
    setFormData(INITIAL_FORM);
    onClose();
  };

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
        side: item.side,
        bride_share_percentage: item.side === 'shared' ? item.bride_share_percentage : null,
        display_order: index + 1,
      })),
      payments: formData.record_payment_now
        ? [
            {
              amount: paymentAmount,
              direction: 'outflow',
              status: formData.payment_date > TODAY ? 'scheduled' : 'posted',
              due_date: formData.payment_date,
              paid_date: formData.payment_date > TODAY ? null : formData.payment_date,
              payment_method: formData.payment_date > TODAY ? null : formData.payment_method,
              paid_by_side: formData.paid_by_side,
              notes: formData.payment_notes || null,
            },
          ]
        : [],
    });

    setFormData(INITIAL_FORM);
  };

  if (!show) return null;

  return (
    <>
      <Portal>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gold-200">
              <h2 className="text-xl font-display font-bold text-maroon-800">Add Expense</h2>
              <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
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
                      setFormData((prev) => ({ ...prev, description: event.target.value }))
                    }
                    className="input"
                    placeholder="Photography contract, decor advance, etc."
                    required
                  />
                </div>
                <div>
                  <label className="label">Expense Date *</label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, expense_date: event.target.value }))
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
                    <p className="text-sm text-gray-500">
                      Categories, side splits, and committed totals come from these items.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, items: [...prev.items, createItem()] }))
                    }
                    className="text-sm text-maroon-700 hover:text-maroon-900 font-medium flex items-center gap-1"
                  >
                    <HiOutlinePlus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={item.id} className="rounded-xl border border-gold-200 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-maroon-800">Item {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
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
                              updateItem(item.id, { description: event.target.value })
                            }
                            className="input"
                            placeholder="Base package, flowers, travel fee"
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
                            onChange={(event) => updateItem(item.id, { amount: event.target.value })}
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

                      <div>
                        <label className="label">Liability Side</label>
                        <div className="flex gap-2">
                          {(['bride', 'groom', 'shared'] as const).map((side) => (
                            <button
                              key={side}
                              type="button"
                              onClick={() => updateItem(item.id, { side })}
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
                              updateItem(item.id, {
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

              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.record_payment_now}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        record_payment_now: event.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-maroon-800"
                  />
                  <span className="label mb-0">Record payment now</span>
                </label>

                {formData.record_payment_now && (
                  <div className="rounded-xl border border-gold-200 p-4 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Payment Amount *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.payment_amount}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              payment_amount: event.target.value,
                            }))
                          }
                          className="input"
                          placeholder="0"
                          required
                        />
                      </div>
                      <div>
                        <label className="label">
                          {formData.payment_date > TODAY ? 'Due Date' : 'Payment Date'}
                        </label>
                        <input
                          type="date"
                          value={formData.payment_date}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              payment_date: event.target.value,
                            }))
                          }
                          className="input"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Payment Method</label>
                        <select
                          value={formData.payment_method}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              payment_method: event.target.value,
                            }))
                          }
                          className="input"
                          disabled={formData.payment_date > TODAY}
                        >
                          <option value="cash">Cash</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="upi">UPI</option>
                          <option value="cheque">Cheque</option>
                          <option value="credit_card">Credit Card</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Paid By Side</label>
                        <select
                          value={formData.paid_by_side}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              paid_by_side: event.target.value as 'bride' | 'groom' | 'shared',
                            }))
                          }
                          className="input"
                        >
                          <option value="bride">Bride</option>
                          <option value="groom">Groom</option>
                          <option value="shared">Shared</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="label">Payment Notes</label>
                      <textarea
                        value={formData.payment_notes}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            payment_notes: event.target.value,
                          }))
                        }
                        className="input min-h-[88px]"
                        placeholder="Optional notes or reference"
                      />
                    </div>

                    {paymentExceedsTotal && (
                      <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                        Payment amount is higher than the committed total. Add more line items above
                        before saving.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2 border-t border-gold-200 mt-2">
                <button type="button" onClick={handleClose} className="btn-outline flex-1">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || paymentExceedsTotal}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Add Expense'}
                </button>
              </div>
            </form>
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
