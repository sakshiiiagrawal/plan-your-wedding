/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import {
  HiOutlineChevronRight,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineX,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useUpdateExpenseCategory } from '../../../hooks/useApi';
import { currencySymbol } from '../../../utils/currency';

// Category | Budget | Allocated | Paid | Outstanding | Used | bar
const GRID = '1fr 130px 95px 95px 95px 48px 110px';
const MIN_WIDTH = 785;

interface CategoryRow {
  id: string;
  name: string;
  parent: string | null;
  /** group figure (own + children) as computed server-side — what we display */
  budget: number;
  /** the category's own allocated_amount — what the budget editor writes */
  ownBudget: number;
  committed: number;
  paid: number;
  outstanding: number;
}

interface ParentGroup {
  row: CategoryRow;
  kids: CategoryRow[];
}

function BudgetCell({
  id,
  own,
  display,
  title,
  formatCurrency,
}: {
  id: string;
  /** the category's own allocated_amount — what editing writes */
  own: number;
  /** what to show (rollup for parents with budgeted children) */
  display: number;
  title?: string | undefined;
  formatCurrency: (n: number) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const updateCategory = useUpdateExpenseCategory();

  const handleSave = async () => {
    const val = parseFloat(draft);
    if (isNaN(val) || val < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      await updateCategory.mutateAsync({ id, allocated_amount: val });
      toast.success('Budget updated');
      setEditing(false);
    } catch {
      toast.error('Failed to update budget');
    }
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>{currencySymbol()}</span>
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
          onClick={(e) => e.stopPropagation()}
          autoFocus
          className="no-spinner"
          style={{
            width: 80,
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
          onClick={(e) => {
            e.stopPropagation();
            void handleSave();
          }}
          disabled={updateCategory.isPending}
          style={{
            padding: '3px 4px',
            borderRadius: 4,
            background: 'var(--gold-glow)',
            color: 'var(--gold-deep)',
            cursor: 'pointer',
            border: 'none',
          }}
          aria-label="Save budget"
        >
          <HiOutlineCheck style={{ width: 11, height: 11 }} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditing(false);
          }}
          style={{
            padding: '3px 4px',
            borderRadius: 4,
            background: 'transparent',
            color: 'var(--ink-dim)',
            cursor: 'pointer',
            border: 'none',
          }}
          aria-label="Cancel"
        >
          <HiOutlineX style={{ width: 11, height: 11 }} />
        </button>
      </div>
    );
  }

  return (
    <div
      title={title}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}
    >
      <span
        className="mono"
        style={{ fontSize: 12, color: display > 0 ? 'var(--ink-mid)' : 'var(--ink-dim)' }}
      >
        {display > 0 ? formatCurrency(display) : '—'}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setDraft(own > 0 ? String(own) : '');
          setEditing(true);
        }}
        style={{
          padding: '2px 3px',
          borderRadius: 4,
          background: 'transparent',
          color: 'var(--ink-dim)',
          cursor: 'pointer',
          border: 'none',
        }}
        title="Set budget"
        aria-label="Set budget"
      >
        <HiOutlinePencil style={{ width: 11, height: 11 }} />
      </button>
    </div>
  );
}

function MoneyCell({
  value,
  color,
  bold,
  formatCurrency,
}: {
  value: number;
  color: string;
  bold?: boolean;
  formatCurrency: (n: number) => string;
}) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 12,
        fontWeight: bold ? 600 : 400,
        color: value > 0 ? color : 'var(--ink-dim)',
        textAlign: 'right',
      }}
    >
      {value > 0 ? formatCurrency(value) : '—'}
    </span>
  );
}

function CategoryTableRow({
  cat,
  isChild,
  hasKids,
  expanded,
  onToggle,
  ownBudget,
  budgetTitle,
  maxCommitted,
  formatCurrency,
}: {
  cat: Pick<CategoryRow, 'id' | 'name' | 'budget' | 'committed' | 'paid' | 'outstanding'>;
  isChild: boolean;
  hasKids: boolean;
  expanded: boolean;
  onToggle?: (() => void) | undefined;
  ownBudget: number;
  budgetTitle?: string | undefined;
  maxCommitted: number;
  formatCurrency: (n: number) => string;
}) {
  const pct = cat.budget > 0 ? (cat.committed / cat.budget) * 100 : null;
  const isOver = pct != null && pct > 100;
  const isNear = pct != null && pct >= 80 && !isOver;
  const barColor = isOver ? 'var(--err)' : isNear ? 'var(--warn)' : 'var(--gold)';
  const barFill = pct != null ? Math.min(100, pct) : (cat.committed / maxCommitted) * 100;

  return (
    <div
      role={hasKids ? 'button' : undefined}
      onClick={onToggle}
      style={{
        display: 'grid',
        gridTemplateColumns: GRID,
        gap: 8,
        padding: isChild ? '7px 20px' : '10px 20px',
        minWidth: MIN_WIDTH,
        borderBottom: '1px solid var(--line-soft)',
        alignItems: 'center',
        cursor: hasKids ? 'pointer' : 'default',
        background: isOver ? 'rgba(220,38,38,0.02)' : 'transparent',
        transition: 'background 120ms',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = isOver
          ? 'rgba(220,38,38,0.05)'
          : 'var(--bg-raised)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = isOver
          ? 'rgba(220,38,38,0.02)'
          : 'transparent';
      }}
    >
      {/* Name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          minWidth: 0,
          paddingLeft: isChild ? 22 : 0,
        }}
      >
        {hasKids ? (
          <HiOutlineChevronRight
            style={{
              width: 13,
              height: 13,
              flexShrink: 0,
              color: 'var(--ink-dim)',
              transform: expanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 150ms',
            }}
          />
        ) : (
          !isChild && <span style={{ width: 13, flexShrink: 0 }} />
        )}
        <span
          style={{
            fontSize: 13,
            fontWeight: isChild ? 400 : 600,
            color: isChild ? 'var(--ink-mid)' : 'var(--ink-high)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {cat.name}
        </span>
        {hasKids && !expanded && (
          <span style={{ fontSize: 10, color: 'var(--ink-dim)', flexShrink: 0 }}>incl. sub</span>
        )}
        {isOver && (
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
            OVER
          </span>
        )}
      </div>

      <BudgetCell
        id={cat.id}
        own={ownBudget}
        display={cat.budget}
        title={budgetTitle}
        formatCurrency={formatCurrency}
      />
      <MoneyCell
        value={cat.committed}
        color="var(--gold-deep)"
        bold
        formatCurrency={formatCurrency}
      />
      <MoneyCell value={cat.paid} color="var(--ok)" formatCurrency={formatCurrency} />
      <MoneyCell value={cat.outstanding} color="var(--warn)" formatCurrency={formatCurrency} />

      {/* % used */}
      <span
        className="mono"
        style={{
          fontSize: 12,
          fontWeight: 600,
          color:
            pct == null
              ? 'var(--ink-dim)'
              : isOver
                ? 'var(--err)'
                : isNear
                  ? 'var(--warn)'
                  : 'var(--ok)',
          textAlign: 'right',
        }}
      >
        {pct != null ? `${pct.toFixed(0)}%` : '—'}
      </span>

      {/* Bar */}
      <div
        style={{ height: 7, borderRadius: 4, background: 'var(--line-soft)', overflow: 'hidden' }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 4,
            width: `${Math.min(100, Math.max(0, barFill))}%`,
            background: barColor,
            opacity: pct == null ? 0.45 : 1,
            transition: 'width 600ms',
          }}
        />
      </div>
    </div>
  );
}

export default function ExpenseBudgetTab({
  expenseOverview,
  formatCurrency,
}: {
  expenseOverview: any[] | undefined;
  formatCurrency: (amount: number) => string;
}) {
  const [sortBy, setSortBy] = useState<'committed' | 'budget' | 'name'>('committed');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const cats = useMemo<CategoryRow[]>(
    () =>
      (expenseOverview ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        parent: c.parent_category_id ?? null,
        budget: parseFloat(c.budget || 0),
        ownBudget: parseFloat(c.allocated_amount || 0),
        committed: parseFloat(c.committed || 0),
        paid: parseFloat(c.paid || 0),
        outstanding: parseFloat(c.outstanding || 0),
      })),
    [expenseOverview],
  );

  // Every money figure already arrives rolled up (own + children) from
  // getExpenseOverview, so parent rows are displayed as-is — the client must
  // NOT sum children again or each one is counted twice.
  const groups = useMemo<ParentGroup[]>(() => {
    const byId = new Set(cats.map((c) => c.id));
    const kidsByParent = new Map<string, CategoryRow[]>();
    for (const c of cats) {
      if (!c.parent || !byId.has(c.parent)) continue;
      const list = kidsByParent.get(c.parent) ?? [];
      list.push(c);
      kidsByParent.set(c.parent, list);
    }
    // A category whose parent isn't in this list stands in as its own group —
    // otherwise it renders nowhere and silently drops out of the totals.
    return cats
      .filter((c) => !c.parent || !byId.has(c.parent))
      .map((row) => ({ row, kids: kidsByParent.get(row.id) ?? [] }));
  }, [cats]);

  const sortedGroups = [...groups].sort((a, b) => {
    if (sortBy === 'name') return a.row.name.localeCompare(b.row.name);
    return b.row[sortBy] - a.row[sortBy];
  });

  // Sum parents only — their figures already include their children's.
  const totals = groups.reduce(
    (acc, { row }) => ({
      budget: acc.budget + row.budget,
      committed: acc.committed + row.committed,
      paid: acc.paid + row.paid,
      outstanding: acc.outstanding + row.outstanding,
    }),
    { budget: 0, committed: 0, paid: 0, outstanding: 0 },
  );
  const maxCommitted = Math.max(...groups.map((g) => g.row.committed), 1);

  const toggle = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        className="flex-wrap"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '14px 20px',
          borderBottom: '1px solid var(--line-soft)',
        }}
      >
        <div>
          <h3 className="section-title">Category Budgets</h3>
          <p style={{ fontSize: 11.5, color: 'var(--ink-dim)', margin: '2px 0 0' }}>
            Set a budget on any category — it powers the over-budget alerts and the usage bars.
          </p>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="input"
          style={{ width: 'auto' }}
        >
          <option value="committed">Allocated</option>
          <option value="budget">Budget</option>
          <option value="name">Name</option>
        </select>
      </div>

      {groups.length === 0 ? (
        <div
          style={{
            padding: '32px 20px',
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--ink-dim)',
            fontStyle: 'italic',
          }}
        >
          No categories yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Column headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: GRID,
              gap: 8,
              padding: '8px 20px',
              background: 'var(--bg-raised)',
              borderBottom: '1px solid var(--line-soft)',
              minWidth: MIN_WIDTH,
            }}
          >
            {['Category', 'Budget', 'Allocated', 'Paid', 'Outstanding', 'Used', ''].map(
              (h) => (
                <span
                  key={h || 'bar'}
                  className="uppercase-eyebrow"
                  style={{ fontSize: 9, textAlign: h === 'Category' || h === '' ? 'left' : 'right' }}
                >
                  {h}
                </span>
              ),
            )}
          </div>

          {sortedGroups.map(({ row, kids }) => {
            const expanded = expandedIds.has(row.id);
            const kidBudgets = row.budget - row.ownBudget;
            return (
              <div key={row.id}>
                <CategoryTableRow
                  cat={row}
                  isChild={false}
                  hasKids={kids.length > 0}
                  expanded={expanded}
                  onToggle={kids.length > 0 ? () => toggle(row.id) : undefined}
                  ownBudget={row.ownBudget}
                  budgetTitle={
                    kids.length > 0 && kidBudgets > 0
                      ? `Own ${formatCurrency(row.ownBudget)} + sub-categories ${formatCurrency(kidBudgets)}`
                      : undefined
                  }
                  maxCommitted={maxCommitted}
                  formatCurrency={formatCurrency}
                />
                {expanded &&
                  kids.map((kid) => (
                    <CategoryTableRow
                      key={kid.id}
                      cat={kid}
                      isChild
                      hasKids={false}
                      expanded={false}
                      ownBudget={kid.ownBudget}
                      maxCommitted={maxCommitted}
                      formatCurrency={formatCurrency}
                    />
                  ))}
              </div>
            );
          })}

          {/* Footer totals */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: GRID,
              gap: 8,
              padding: '10px 20px',
              background: 'var(--bg-raised)',
              borderTop: '1px solid var(--line)',
              minWidth: MIN_WIDTH,
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-mid)' }}>Total</span>
            <span
              className="mono"
              style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-mid)', textAlign: 'right' }}
            >
              {totals.budget > 0 ? formatCurrency(totals.budget) : '—'}
            </span>
            <MoneyCell
              value={totals.committed}
              color="var(--gold-deep)"
              bold
              formatCurrency={formatCurrency}
            />
            <MoneyCell value={totals.paid} color="var(--ok)" bold formatCurrency={formatCurrency} />
            <MoneyCell
              value={totals.outstanding}
              color="var(--warn)"
              bold
              formatCurrency={formatCurrency}
            />
            <span
              className="mono"
              style={{
                fontSize: 12,
                fontWeight: 700,
                textAlign: 'right',
                color:
                  totals.budget > 0 && totals.committed > totals.budget
                    ? 'var(--err)'
                    : 'var(--ok)',
              }}
            >
              {totals.budget > 0 ? `${((totals.committed / totals.budget) * 100).toFixed(0)}%` : '—'}
            </span>
            <span />
          </div>
        </div>
      )}
    </div>
  );
}
