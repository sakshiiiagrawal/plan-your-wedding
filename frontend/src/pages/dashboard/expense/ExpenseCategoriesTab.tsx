import { useState } from 'react';
import { HiOutlinePencil, HiOutlineCheck, HiOutlineX } from 'react-icons/hi';
import { useUpdateExpenseCategory } from '../../../hooks/useApi';
import toast from 'react-hot-toast';

interface CategoryAnalysisItem {
  id?: string;
  name: string;
  committed: number;
  paid: number;
  outstanding: number;
  count: number;
  allocated: number;
}

interface ExpenseCategoriesTabProps {
  categoryAnalysis: CategoryAnalysisItem[];
  loading: boolean;
  formatCurrency: (amount: number) => string;
}

const TOP_N = 6;

function BudgetCell({
  category,
  formatCurrency,
}: {
  category: CategoryAnalysisItem;
  formatCurrency: (n: number) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const updateCategory = useUpdateExpenseCategory();

  const handleSave = async () => {
    if (!category.id) return;
    const val = parseFloat(draft);
    if (isNaN(val) || val < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      await updateCategory.mutateAsync({ id: category.id, allocated_amount: val });
      toast.success('Budget updated');
      setEditing(false);
    } catch {
      toast.error('Failed to update budget');
    }
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>₹</span>
        <input
          type="number"
          min="0"
          step="1000"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSave();
            if (e.key === 'Escape') setEditing(false);
          }}
          autoFocus
          style={{
            width: 90,
            fontSize: 12,
            padding: '3px 6px',
            borderRadius: 6,
            border: '1.5px solid var(--gold)',
            outline: 'none',
            background: 'var(--bg-panel)',
            color: 'var(--ink-high)',
          }}
        />
        <button
          onClick={() => void handleSave()}
          disabled={updateCategory.isPending}
          style={{
            padding: '3px 4px',
            borderRadius: 4,
            background: 'var(--gold-glow)',
            color: 'var(--gold-deep)',
            cursor: 'pointer',
            border: 'none',
          }}
        >
          <HiOutlineCheck style={{ width: 11, height: 11 }} />
        </button>
        <button
          onClick={() => setEditing(false)}
          style={{
            padding: '3px 4px',
            borderRadius: 4,
            background: 'transparent',
            color: 'var(--ink-dim)',
            cursor: 'pointer',
            border: 'none',
          }}
        >
          <HiOutlineX style={{ width: 11, height: 11 }} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span
        style={{
          fontSize: 12,
          color: category.allocated > 0 ? 'var(--ink-mid)' : 'var(--ink-dim)',
        }}
      >
        {category.allocated > 0 ? formatCurrency(category.allocated) : 'Not set'}
      </span>
      {category.id && (
        <button
          onClick={() => {
            setDraft(category.allocated > 0 ? String(category.allocated) : '');
            setEditing(true);
          }}
          style={{
            padding: '2px 3px',
            borderRadius: 4,
            background: 'transparent',
            color: 'var(--ink-dim)',
            cursor: 'pointer',
            border: 'none',
            opacity: 0,
          }}
          className="budget-edit-btn"
          title="Set budget"
        >
          <HiOutlinePencil style={{ width: 10, height: 10 }} />
        </button>
      )}
    </div>
  );
}

export default function ExpenseCategoriesTab({
  categoryAnalysis,
  loading,
  formatCurrency,
}: ExpenseCategoriesTabProps) {
  const grandTotal = categoryAnalysis.reduce((sum, c) => sum + c.committed, 0);
  const top = categoryAnalysis.slice(0, TOP_N);
  const othersTotal = categoryAnalysis.slice(TOP_N).reduce((sum, c) => sum + c.committed, 0);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 0',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '3px solid var(--line-soft)',
            borderTopColor: 'var(--gold)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  return (
    <>
      <style>{`.budget-edit-btn { opacity: 0 !important; } .category-row:hover .budget-edit-btn { opacity: 1 !important; }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <h3 className="section-title">Top Categories</h3>
            <span style={{ fontSize: 12, color: 'var(--ink-low)' }}>
              Committed:{' '}
              <strong style={{ color: 'var(--gold-deep)' }}>{formatCurrency(grandTotal)}</strong>
            </span>
          </div>

          {categoryAnalysis.length === 0 ? (
            <div
              style={{
                padding: '32px 0',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--ink-dim)',
                fontStyle: 'italic',
              }}
            >
              No category finance data available.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {top.map((category, index) => {
                const pctOfTotal = grandTotal > 0 ? (category.committed / grandTotal) * 100 : 0;
                const pctOfBudget =
                  category.allocated > 0 ? (category.committed / category.allocated) * 100 : null;
                const isOverBudget = pctOfBudget != null && pctOfBudget > 100;
                const isNearBudget = pctOfBudget != null && pctOfBudget >= 80 && !isOverBudget;
                const barColor = isOverBudget
                  ? 'var(--err)'
                  : isNearBudget
                    ? 'var(--warn)'
                    : 'var(--gold)';
                const barFill = pctOfBudget != null ? Math.min(100, pctOfBudget) : pctOfTotal;

                return (
                  <div key={`${category.name}-${index}`} className="category-row">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--ink-dim)',
                            width: 16,
                            flexShrink: 0,
                          }}
                        >
                          #{index + 1}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: 'var(--ink-high)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {category.name}
                        </span>
                        {isOverBudget && (
                          <span
                            style={{
                              fontSize: 9,
                              padding: '1px 6px',
                              borderRadius: 100,
                              background: 'rgba(220,38,38,0.1)',
                              color: 'var(--err)',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            OVER BUDGET
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontWeight: 600, color: 'var(--gold-deep)', fontSize: 13 }}>
                          {formatCurrency(category.committed)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                          {pctOfTotal.toFixed(1)}% of total
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        height: 6,
                        borderRadius: 4,
                        background: 'var(--bg-raised)',
                        overflow: 'hidden',
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 4,
                          width: `${barFill}%`,
                          background: barColor,
                          transition: 'width 600ms',
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr 1fr',
                        gap: 4,
                        fontSize: 11,
                        color: 'var(--ink-dim)',
                      }}
                    >
                      <span>
                        Paid:{' '}
                        <strong style={{ color: 'var(--ok)' }}>
                          {formatCurrency(category.paid)}
                        </strong>
                      </span>
                      <span>
                        Outstanding:{' '}
                        <strong style={{ color: 'var(--warn)' }}>
                          {formatCurrency(category.outstanding)}
                        </strong>
                      </span>
                      <span>
                        {category.count} line item{category.count !== 1 ? 's' : ''}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        Budget: <BudgetCell category={category} formatCurrency={formatCurrency} />
                      </span>
                    </div>
                  </div>
                );
              })}

              {categoryAnalysis.length > TOP_N && (
                <div
                  style={{
                    paddingTop: 12,
                    borderTop: '1px solid var(--line-soft)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    color: 'var(--ink-low)',
                  }}
                >
                  <span>Other categories ({categoryAnalysis.length - TOP_N})</span>
                  <span style={{ fontWeight: 500, color: 'var(--ink-mid)' }}>
                    {formatCurrency(othersTotal)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
