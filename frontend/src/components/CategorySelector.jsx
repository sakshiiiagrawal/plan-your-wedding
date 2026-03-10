import { useState, useMemo } from 'react';
import { HiOutlinePlus } from 'react-icons/hi';
import { useCategoryTree } from '../hooks/useApi';

export default function CategorySelector({
  value,
  onChange,
  allowCustom = false,
  onAddCustom,
  placeholder = 'Select category',
  required = false,
  disabled = false
}) {
  const { data: categoryTree = [], isLoading } = useCategoryTree();
  const [selectedParent, setSelectedParent] = useState('');

  // Get parent category if value is provided
  const selectedCategory = useMemo(() => {
    if (!value || !categoryTree.length) return null;

    for (const parent of categoryTree) {
      if (parent.id === value) {
        return { parent, child: null };
      }
      if (parent.children) {
        const child = parent.children.find(c => c.id === value);
        if (child) {
          return { parent, child };
        }
      }
    }
    return null;
  }, [value, categoryTree]);

  // Set selectedParent when component mounts or value changes
  useMemo(() => {
    if (selectedCategory?.parent) {
      setSelectedParent(selectedCategory.parent.id);
    }
  }, [selectedCategory]);

  // Get subcategories for selected parent
  const subcategories = useMemo(() => {
    if (!selectedParent) return [];
    const parent = categoryTree.find(cat => cat.id === selectedParent);
    return parent?.children || [];
  }, [selectedParent, categoryTree]);

  const handleParentChange = (parentId) => {
    setSelectedParent(parentId);
    // If parent has no children, select the parent itself
    const parent = categoryTree.find(cat => cat.id === parentId);
    if (!parent?.children || parent.children.length === 0) {
      onChange(parentId);
    } else {
      // Clear selection when parent changes
      onChange('');
    }
  };

  const handleSubcategoryChange = (subcategoryId) => {
    onChange(subcategoryId);
  };

  if (isLoading) {
    return (
      <div className="text-gray-500 text-sm">Loading categories...</div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Parent Category Selector */}
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

      {/* Subcategory Selector (shown only if parent has children) */}
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

      {/* Show add custom button for parent without children */}
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

      {/* Helper text */}
      {selectedCategory && (
        <div className="text-xs text-gray-500">
          Selected: <span className="font-medium text-maroon-800">
            {selectedCategory.parent.name}
            {selectedCategory.child && ` → ${selectedCategory.child.name}`}
          </span>
        </div>
      )}
    </div>
  );
}
