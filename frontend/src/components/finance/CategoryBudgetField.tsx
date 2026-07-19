import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useExpenseCategories, useUpdateExpenseCategory } from '../../hooks/useApi';
import { currencySymbol, formatCurrency } from '../../utils/currency';

interface ExpenseCategoryRow {
  id: string;
  name: string;
  allocated_amount?: number | string | null;
}

interface CategoryBudgetFieldProps {
  /** Resolve the category by id (vendor forms)… */
  categoryId?: string | null;
  /** …or by name (venue forms, where the category is derived from venue type). */
  categoryName?: string | null;
}

/**
 * Inline editor for a category's budget (expense_categories.allocated_amount),
 * so budgets can be set right where the spending decision happens — the
 * vendor/venue form — instead of only on the Expenses page. Saves
 * independently of the surrounding form.
 */
export default function CategoryBudgetField({ categoryId, categoryName }: CategoryBudgetFieldProps) {
  const { data: categories = [] } = useExpenseCategories() as { data: ExpenseCategoryRow[] };
  const updateCategory = useUpdateExpenseCategory();

  const category = categoryId
    ? categories.find((row) => row.id === categoryId)
    : categoryName
      ? categories.find((row) => row.name === categoryName)
      : undefined;
  const currentBudget = Number(category?.allocated_amount ?? 0);

  const [draft, setDraft] = useState('');
  // Re-seed the input whenever the resolved category (or its saved budget) changes.
  useEffect(() => {
    setDraft(currentBudget > 0 ? String(currentBudget) : '');
  }, [category?.id, currentBudget]);

  if (!category) return null;

  const parsed = parseFloat(draft);
  const isDirty = (isNaN(parsed) ? 0 : parsed) !== currentBudget && draft !== '';

  const handleSave = async () => {
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      await updateCategory.mutateAsync({ id: category.id, allocated_amount: parsed });
      toast.success(`Budget for ${category.name} updated.`);
    } catch {
      toast.error('Failed to update category budget.');
    }
  };

  return (
    <div>
      <label className="label">Category Budget</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
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
            {currencySymbol()}
          </span>
          <input
            type="number"
            min="0"
            step="10000"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Save the budget; don't submit the surrounding vendor/venue form.
              if (e.key === 'Enter') {
                e.preventDefault();
                if (isDirty) void handleSave();
              }
            }}
            className="input no-spinner"
            style={{ paddingLeft: 28 }}
            placeholder={currentBudget > 0 ? String(currentBudget) : 'Not set'}
          />
        </div>
        {isDirty && (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={updateCategory.isPending}
            className="btn-outline"
            style={{ whiteSpace: 'nowrap' }}
          >
            {updateCategory.isPending ? 'Saving…' : 'Save budget'}
          </button>
        )}
      </div>
      <p style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 4 }}>
        Overall budget for {category.name}
        {currentBudget > 0 ? ` (currently ${formatCurrency(currentBudget)})` : ''} — shared by every
        expense in this category. Saves separately from this form.
      </p>
    </div>
  );
}
