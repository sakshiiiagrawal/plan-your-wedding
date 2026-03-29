import { useState, useEffect } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import Portal from '../../../components/Portal';
import CategorySelector from '../../../components/CategorySelector';
import CustomCategoryModal from '../../../components/CustomCategoryModal';

export interface ExpenseRow {
  id: string;
  type: 'expense';
  description: string;
  amount: number;
  category_id: string | null;
  expense_date: string;
  paid_by: string | null;
  side: string | null;
  is_shared: boolean;
  share_percentage: number | null;
  payment_method: string | null;
  vendor_id: string | null;
  event_id: string | null;
  paid_amount: number | null;
}

interface EditExpenseModalProps {
  expense: ExpenseRow | null;
  onClose: () => void;
  onSubmit: (id: string, payload: Record<string, unknown>) => Promise<void>;
  isPending: boolean;
  vendors: Array<{ id: string; name: string }>;
}

interface FormData {
  description: string;
  amount: number | string;
  category_id: string | null;
  expense_date: string;
  paid_by: string;
  side: string;
  is_shared: boolean;
  share_percentage: number;
  payment_method: string;
  vendor_id: string | null;
  event_id: string | null;
  is_partially_paid: boolean;
  paid_amount: number | string;
}

export default function EditExpenseModal({
  expense,
  onClose,
  onSubmit,
  isPending,
  vendors,
}: EditExpenseModalProps) {
  const [formData, setFormData] = useState<FormData | null>(null);
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
  const [customCategoryParentId, setCustomCategoryParentId] = useState<string | null>(null);

  useEffect(() => {
    if (expense) {
      setFormData({
        description: expense.description || '',
        amount: expense.amount || '',
        category_id: expense.category_id || null,
        expense_date: (expense.expense_date || new Date().toISOString().split('T')[0]) ?? '',
        paid_by: expense.paid_by || '',
        side: expense.side || 'bride',
        is_shared: expense.is_shared || false,
        share_percentage: expense.share_percentage || 50,
        payment_method: expense.payment_method || 'cash',
        vendor_id: expense.vendor_id || null,
        event_id: expense.event_id || null,
        is_partially_paid: expense.paid_amount != null && expense.paid_amount < expense.amount,
        paid_amount: expense.paid_amount || '',
      });
    }
  }, [expense]);

  if (!expense || !formData) return null;

  const set = (patch: Partial<FormData>) =>
    setFormData((prev) => (prev ? { ...prev, ...patch } : null));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData) return;
    const { is_partially_paid, paid_amount, ...rest } = formData;
    await onSubmit(expense.id, {
      ...rest,
      paid_amount: is_partially_paid ? parseFloat(String(paid_amount)) : null,
    });
  };

  return (
    <>
      <Portal>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gold-200">
              <h2 className="text-xl font-display font-bold text-maroon-800">Edit Expense</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Description *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => set({ description: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Total Amount *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => set({ amount: e.target.value })}
                  className="input"
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.is_partially_paid}
                    onChange={(e) => set({ is_partially_paid: e.target.checked, paid_amount: '' })}
                    className="w-4 h-4 accent-maroon-800"
                  />
                  <span className="label mb-0">Partially Paid</span>
                </label>
                {formData.is_partially_paid && (
                  <div>
                    <label className="label">Amount Paid So Far *</label>
                    <input
                      type="number"
                      value={formData.paid_amount}
                      onChange={(e) => set({ paid_amount: e.target.value })}
                      className="input"
                      placeholder="0"
                      max={formData.amount || undefined}
                      required
                    />
                    {formData.amount && formData.paid_amount && (
                      <p className="text-sm text-gray-500 mt-1">
                        Remaining: ₹
                        {(
                          parseFloat(String(formData.amount)) -
                          parseFloat(String(formData.paid_amount) || '0')
                        ).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <CategorySelector
                value={formData.category_id ?? ''}
                onChange={(categoryId: string | null) => set({ category_id: categoryId })}
                allowCustom={true}
                onAddCustom={(parentId: string | null) => {
                  setCustomCategoryParentId(parentId);
                  setShowCustomCategoryModal(true);
                }}
                required
              />

              <div>
                <label className="label">Expense Date *</label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => set({ expense_date: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Paid By</label>
                <input
                  type="text"
                  value={formData.paid_by}
                  onChange={(e) => set({ paid_by: e.target.value })}
                  className="input"
                  placeholder="Person name"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Side *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => set({ side: 'bride', is_shared: false })}
                      className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                        formData.side === 'bride' && !formData.is_shared
                          ? 'border-pink-500 bg-pink-50 text-pink-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      Bride
                    </button>
                    <button
                      type="button"
                      onClick={() => set({ side: 'groom', is_shared: false })}
                      className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                        formData.side === 'groom' && !formData.is_shared
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      Groom
                    </button>
                    <button
                      type="button"
                      onClick={() => set({ is_shared: true })}
                      className={`flex-1 py-2 rounded-lg border-2 transition-colors ${
                        formData.is_shared
                          ? 'border-gold-500 bg-gold-50 text-gold-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      Shared
                    </button>
                  </div>
                </div>

                {formData.is_shared && (
                  <div>
                    <label className="label">Share Split</label>
                    <div className="flex items-center gap-2">
                      <span className="text-pink-600 text-sm">Bride</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.share_percentage || 50}
                        onChange={(e) => set({ share_percentage: Number(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-blue-600 text-sm">Groom</span>
                    </div>
                    <div className="text-center text-sm text-gray-500 mt-1">
                      {formData.share_percentage || 50}% - {100 - (formData.share_percentage || 50)}
                      %
                    </div>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => set({ payment_method: e.target.value })}
                    className="input"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="cheque">Cheque</option>
                    <option value="credit_card">Credit Card</option>
                  </select>
                </div>
                <div>
                  <label className="label">Vendor (Optional)</label>
                  <select
                    value={formData.vendor_id || ''}
                    onChange={(e) => set({ vendor_id: e.target.value || null })}
                    className="input"
                  >
                    <option value="">None</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </form>

            <div className="flex gap-3 p-6 border-t border-gold-200">
              <button type="button" onClick={onClose} className="btn-outline flex-1">
                Cancel
              </button>
              <button
                onClick={(e) => handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)}
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
