import { useState, useMemo } from 'react';
import { HiOutlinePlus } from 'react-icons/hi';
import { useCategoryTree } from '../hooks/useApi';

interface Category {
  id: string;
  name: string;
  children?: Category[];
}

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  allowCustom?: boolean;
  onAddCustom?: (parentId: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function CategorySelector({
  value,
  onChange,
  allowCustom = false,
  onAddCustom,
  required = false,
  disabled = false,
}: CategorySelectorProps) {
  const { data: categoryTree = [], isLoading } = useCategoryTree() as {
    data: Category[];
    isLoading: boolean;
  };
  const [selectedParent, setSelectedParent] = useState('');

  const selectedCategory = useMemo(() => {
    if (!value || !categoryTree.length) return null;

    for (const parent of categoryTree) {
      if (parent.id === value) {
        return { parent, child: null };
      }
      if (parent.children) {
        const child = parent.children.find((c) => c.id === value);
        if (child) {
          return { parent, child };
        }
      }
    }
    return null;
  }, [value, categoryTree]);

  useMemo(() => {
    if (selectedCategory?.parent) {
      setSelectedParent(selectedCategory.parent.id);
    }
  }, [selectedCategory]);

  const subcategories = useMemo(() => {
    if (!selectedParent) return [];
    const parent = categoryTree.find((cat) => cat.id === selectedParent);
    return parent?.children || [];
  }, [selectedParent, categoryTree]);

  const handleParentChange = (parentId: string) => {
    setSelectedParent(parentId);
    const parent = categoryTree.find((cat) => cat.id === parentId);
    if (!parent?.children || parent.children.length === 0) {
      onChange(parentId);
    } else {
      onChange('');
    }
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    onChange(subcategoryId);
  };

  if (isLoading) {
    return <div className="text-gray-500 text-sm">Loading categories...</div>;
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Category *</label>
        <select
          value={selectedParent}
          onChange={(e) => handleParentChange(e.target.value)}
          className="input"
          required={required}
          disabled={disabled}
        >
          <option value="">-- Select Category --</option>
          {categoryTree.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.name}
            </option>
          ))}
        </select>
      </div>

      {selectedParent && subcategories.length > 0 && (
        <div>
          <label className="label">Subcategory {required && '*'}</label>
          <div className="flex gap-2">
            <select
              value={value || ''}
              onChange={(e) => handleSubcategoryChange(e.target.value)}
              className="input flex-1"
              required={required}
              disabled={disabled}
            >
              <option value="">-- Select Subcategory --</option>
              {subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>

            {allowCustom && onAddCustom && (
              <button
                type="button"
                onClick={() => onAddCustom(selectedParent)}
                className="btn-outline flex items-center gap-1 whitespace-nowrap"
                disabled={disabled}
              >
                <HiOutlinePlus className="w-4 h-4" />
                Custom
              </button>
            )}
          </div>
        </div>
      )}

      {selectedParent && subcategories.length === 0 && allowCustom && onAddCustom && (
        <button
          type="button"
          onClick={() => onAddCustom(selectedParent)}
          className="btn-outline flex items-center gap-2 text-sm"
          disabled={disabled}
        >
          <HiOutlinePlus className="w-4 h-4" />
          Add Custom Subcategory
        </button>
      )}

      {selectedCategory && (
        <div className="text-xs text-gray-500">
          Selected:{' '}
          <span className="font-medium text-maroon-800">
            {selectedCategory.parent.name}
            {selectedCategory.child && ` → ${selectedCategory.child.name}`}
          </span>
        </div>
      )}
    </div>
  );
}
