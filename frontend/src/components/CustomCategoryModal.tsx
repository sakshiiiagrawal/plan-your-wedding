import { useState } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import { useCreateCustomCategory, useCategoryTree } from '../hooks/useApi';
import toast from 'react-hot-toast';

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

  const [formData, setFormData] = useState({
    name: '',
    parent_category_id: defaultParentId ?? '',
    allocated_amount: '',
    description: '',
  });

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

      onClose();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      const errorMessage = err?.response?.data?.error || 'Failed to create category';
      toast.error(errorMessage);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gold-200">
          <h2 className="text-xl font-display font-bold text-maroon-800">Add Custom Category</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              <option value="">-- Top Level Category --</option>
              {categoryTree.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Leave empty to create a top-level category</p>
          </div>

          <div>
            <label className="label">Allocated Budget (Optional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                value={formData.allocated_amount}
                onChange={(e) => setFormData({ ...formData, allocated_amount: e.target.value })}
                className="input pl-8"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="label">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
              placeholder="Brief description of this category..."
            />
          </div>
        </form>

        <div className="flex gap-3 p-6 border-t border-gold-200">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline flex-1"
            disabled={createMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  );
}
