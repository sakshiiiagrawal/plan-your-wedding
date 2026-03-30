import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineSearch, HiOutlineX, HiOutlinePlus } from 'react-icons/hi';
import { useCategoryTree } from '../hooks/useApi';

interface Category {
  id: string;
  name: string;
  children?: Category[];
}

interface CategoryComboboxProps {
  value: string | null;
  onChange: (id: string | null) => void;
  /** 'any' = parents + children selectable; 'parent' = only parents; 'subcategory' = only children */
  level?: 'any' | 'parent' | 'subcategory';
  placeholder?: string;
  allowCustom?: boolean;
  onAddCustom?: (parentId: string | null) => void;
  required?: boolean;
  disabled?: boolean;
}

function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export default function CategoryCombobox({
  value,
  onChange,
  level = 'any',
  placeholder = 'Search categories…',
  allowCustom = false,
  onAddCustom,
  required = false,
  disabled = false,
}: CategoryComboboxProps) {
  const { data: tree = [], isLoading } = useCategoryTree() as {
    data: Category[];
    isLoading: boolean;
  };
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(() => {
    if (!value || !tree.length) return '';
    for (const parent of tree) {
      if (parent.id === value) return parent.name;
      for (const child of parent.children ?? []) {
        if (child.id === value) return `${parent.name} → ${child.name}`;
      }
    }
    return '';
  }, [value, tree]);

  const filteredGroups = useMemo(() => {
    return tree
      .map((parent) => {
        const parentMatches = fuzzyMatch(parent.name, query);
        const allChildren = parent.children ?? [];
        const children =
          level === 'parent'
            ? []
            : query
              ? allChildren.filter((c) => fuzzyMatch(c.name, query))
              : allChildren;

        if (!parentMatches && children.length === 0) return null;
        return { parent, children };
      })
      .filter((g): g is { parent: Category; children: Category[] } => g !== null);
  }, [tree, query, level]);

  const openDropdown = () => {
    if (disabled || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        inputRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      setQuery('');
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
  };

  if (isLoading) {
    return <div className="input text-gray-400 text-sm">Loading categories…</div>;
  }

  const dropdown = isOpen && !disabled ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto"
    >
      {filteredGroups.length === 0 ? (
        <p className="px-4 py-3 text-sm text-gray-500">No categories found</p>
      ) : (
        filteredGroups.map(({ parent, children }) => (
          <div key={parent.id}>
            {/* In 'subcategory' mode: parent is a header ONLY if it has children to choose from.
                If it has no children, make it selectable directly. */}
            {level !== 'subcategory' || children.length === 0 ? (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(parent.id);
                }}
                className={`w-full text-left px-4 py-2 text-sm font-semibold transition-colors hover:bg-gold-50 ${
                  value === parent.id ? 'bg-gold-100 text-maroon-800' : 'text-maroon-700'
                }`}
              >
                {parent.name}
              </button>
            ) : (
              <div className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 bg-gray-50">
                {parent.name}
              </div>
            )}

            {children.map((child) => (
              <button
                key={child.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(child.id);
                }}
                className={`w-full text-left px-4 py-2 pl-8 text-sm transition-colors hover:bg-gold-50 ${
                  value === child.id
                    ? 'bg-gold-100 text-maroon-800 font-medium'
                    : 'text-gray-700'
                }`}
              >
                {child.name}
              </button>
            ))}

            {allowCustom && onAddCustom && children.length > 0 && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAddCustom(parent.id);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-1.5 pl-8 text-xs text-maroon-500 hover:bg-maroon-50 flex items-center gap-1"
              >
                <HiOutlinePlus className="w-3 h-3" />
                Add custom under {parent.name}
              </button>
            )}
          </div>
        ))
      )}

      {allowCustom && onAddCustom && (
        <div className="border-t border-gray-100">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onAddCustom(null);
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-maroon-600 hover:bg-maroon-50 flex items-center gap-2 font-medium"
          >
            <HiOutlinePlus className="w-4 h-4" />
            Add new custom category
          </button>
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      <div className="relative">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : selectedLabel}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) openDropdown();
          }}
          onFocus={openDropdown}
          className="input pl-9 pr-8"
          placeholder={placeholder}
          required={required && !value}
          disabled={disabled}
          autoComplete="off"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <HiOutlineX className="w-4 h-4" />
          </button>
        )}
      </div>

      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </>
  );
}
