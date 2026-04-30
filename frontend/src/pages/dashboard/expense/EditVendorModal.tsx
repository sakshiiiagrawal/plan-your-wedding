import { useState, useEffect } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import Portal from '../../../components/Portal';
import CategoryCombobox from '../../../components/CategoryCombobox';
import useUnsavedChangesPrompt from '../../../hooks/useUnsavedChangesPrompt';

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

function getEditVendorFormState(vendor: VendorRow | null): FormData | null {
  if (!vendor) return null;
  return {
    name: vendor.description || '',
    category_id: vendor.category_id ?? null,
    total_cost: vendor.amount || '',
    side: vendor.is_shared ? 'mutual' : vendor.side || 'mutual',
    is_shared: vendor.is_shared || false,
  };
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
      setFormData(getEditVendorFormState(vendor));
    }
  }, [vendor]);

  const isDirty =
    formData && vendor
      ? JSON.stringify(formData) !== JSON.stringify(getEditVendorFormState(vendor))
      : false;
  const { attemptClose, dialog: unsavedDialog } = useUnsavedChangesPrompt({
    isDirty,
    onDiscard: onClose,
    onSave: () => {
      (document.getElementById('edit-vendor-form') as HTMLFormElement | null)?.requestSubmit();
    },
    isSaving: isPending,
  });

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
            maxWidth: 480,
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
                Vendor
              </div>
              <h2 className="display" style={{ margin: 0, fontSize: 20, color: 'var(--ink-high)' }}>
                Edit Vendor
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
              <HiOutlineX style={{ width: 16, height: 16 }} />
            </button>
          </div>

          <form id="edit-vendor-form" onSubmit={handleSubmit} className="p-6 space-y-4">
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
              <div style={{ display: 'flex', gap: 6 }}>
                {(['bride', 'groom', 'mutual'] as const).map((s) => {
                  const isActive = formData.side === s;
                  const activeStyle =
                    s === 'bride'
                      ? {
                          borderColor: '#be185d',
                          background: 'rgba(190,24,93,0.06)',
                          color: '#be185d',
                        }
                      : s === 'groom'
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
                      key={s}
                      type="button"
                      onClick={() => set({ side: s, is_shared: s === 'mutual' })}
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
                        textTransform: 'capitalize',
                        transition: 'all 150ms',
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
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
              form="edit-vendor-form"
              disabled={isPending}
              className="btn-primary"
              style={{ flex: 1, opacity: isPending ? 0.5 : 1 }}
            >
              {isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
      {unsavedDialog}
    </Portal>
  );
}
