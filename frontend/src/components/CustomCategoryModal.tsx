import { useEffect, useState } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import { useCreateCustomCategory, useCategoryTree } from '../hooks/useApi';
import toast from 'react-hot-toast';
import Portal from './Portal';
import useUnsavedChangesPrompt from '../hooks/useUnsavedChangesPrompt';

interface CustomCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultParentId?: string | null;
}

export default function CustomCategoryModal({
  isOpen,
  onClose,
  defaultParentId = null,
}: CustomCategoryModalProps) {
  const { data: categoryTree = [] } = useCategoryTree();
  const createMutation = useCreateCustomCategory();
  const initialFormData = {
    name: '',
    parent_category_id: defaultParentId ?? '',
    allocated_amount: '',
    description: '',
  };
  const [formData, setFormData] = useState(initialFormData);
  const handleDiscard = () => {
    setFormData(initialFormData);
    onClose();
  };
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);
  const { attemptClose, dialog: unsavedDialog } = useUnsavedChangesPrompt({
    isDirty,
    onDiscard: handleDiscard,
    onSave: () => {
      (document.getElementById('custom-category-form') as HTMLFormElement | null)?.requestSubmit();
    },
    isSaving: createMutation.isPending,
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
    }
  }, [defaultParentId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createMutation.mutateAsync({
        name: formData.name,
        parent_category_id: formData.parent_category_id || null,
        allocated_amount: parseFloat(formData.allocated_amount) || 0,
        description: formData.description || null,
      });

      toast.success('Custom category created successfully!');

      setFormData({
        name: '',
        parent_category_id: defaultParentId ?? '',
        allocated_amount: '',
        description: '',
      });

      handleDiscard();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      const errorMessage = err?.response?.data?.error || 'Failed to create category';
      toast.error(errorMessage);
    }
  };

  if (!isOpen) return null;

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
          zIndex: 60,
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
                Categories
              </div>
              <h2 className="display" style={{ margin: 0, fontSize: 20, color: 'var(--ink-high)' }}>
                Add custom category
              </h2>
            </div>
            <button
              type="button"
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

          <form
            id="custom-category-form"
            onSubmit={handleSubmit}
            style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div>
              <label className="label">Category Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="Enter category name"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Parent Category</label>
              <select
                value={formData.parent_category_id}
                onChange={(e) => setFormData({ ...formData, parent_category_id: e.target.value })}
                className="input"
              >
                <option value="">— Top level category —</option>
                {categoryTree.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 4 }}>
                Leave empty to create a top-level category
              </p>
            </div>

            <div>
              <label className="label">Allocated Budget (optional)</label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--ink-dim)',
                    fontSize: 13,
                  }}
                >
                  ₹
                </span>
                <input
                  type="number"
                  value={formData.allocated_amount}
                  onChange={(e) => setFormData({ ...formData, allocated_amount: e.target.value })}
                  className="input"
                  style={{ paddingLeft: 28 }}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="label">Description (optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={3}
                placeholder="Brief description of this category…"
              />
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
              disabled={createMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="custom-category-form"
              disabled={createMutation.isPending}
              className="btn-primary"
              style={{ flex: 1, opacity: createMutation.isPending ? 0.5 : 1 }}
            >
              {createMutation.isPending ? 'Creating…' : 'Create category'}
            </button>
          </div>
        </div>
      </div>
      {unsavedDialog}
    </Portal>
  );
}
