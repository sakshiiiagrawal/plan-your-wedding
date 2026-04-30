import { useState, useEffect } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import Portal from '../../../components/Portal';
import CategoryCombobox from '../../../components/CategoryCombobox';

export interface VendorRow {
  vendorId: string;
  description: string;
  amount: number;
  category: string | null;
  category_id?: string | null;
  side: string | null;
  is_shared: boolean;
}

interface EditVendorModalProps {
  vendor: VendorRow | null;
  onClose: () => void;
  onSubmit: (id: string, payload: Record<string, unknown>) => Promise<void>;
  isPending: boolean;
}

interface FormData {
  name: string;
  category_id: string | null;
  total_cost: number | string;
  side: string;
  is_shared: boolean;
}

export default function EditVendorModal({
  vendor,
  onClose,
  onSubmit,
  isPending,
}: EditVendorModalProps) {
  const [formData, setFormData] = useState<FormData | null>(null);

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.description || '',
        category_id: vendor.category_id ?? null,
        total_cost: vendor.amount || '',
        side: vendor.is_shared ? 'mutual' : vendor.side || 'mutual',
        is_shared: vendor.is_shared || false,
      });
    }
  }, [vendor]);

  if (!vendor || !formData) return null;

  const set = (patch: Partial<FormData>) =>
    setFormData((prev) => (prev ? { ...prev, ...patch } : null));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData) return;
    const { side, ...rest } = formData;
    await onSubmit(vendor.vendorId, {
      ...rest,
      total_cost: parseFloat(String(formData.total_cost)) || 0,
      side: formData.is_shared ? null : side,
    });
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-6 border-b border-gold-200">
            <h2 className="text-xl font-display font-bold text-maroon-800">Edit Vendor</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="label">Vendor Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => set({ name: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Category</label>
              <CategoryCombobox
                value={formData.category_id}
                onChange={(id) => set({ category_id: id })}
                level="subcategory"
                placeholder="Search vendor categories…"
              />
            </div>

            <div>
              <label className="label">Total Cost *</label>
              <input
                type="number"
                value={formData.total_cost}
                onChange={(e) => set({ total_cost: e.target.value })}
                className="input"
                placeholder="0"
                required
              />
            </div>

            <div>
              <label className="label">Side *</label>
              <div className="flex gap-2">
                {(['bride', 'groom', 'mutual'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set({ side: s, is_shared: s === 'mutual' })}
                    className={`flex-1 py-2 rounded-lg border-2 capitalize transition-colors ${
                      formData.side === s
                        ? s === 'bride'
                          ? 'border-pink-500 bg-pink-50 text-pink-700'
                          : s === 'groom'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gold-500 bg-gold-50 text-gold-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
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
  );
}
