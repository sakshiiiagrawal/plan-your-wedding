/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const COLORS = ['#8B0000', '#D4AF37', '#228B22', '#1A237E', '#E91E63', '#FF6F00', '#607D8B'];

interface ExpenseOverviewTabProps {
  expenseOverview: any[] | undefined;
  formatCurrency: (amount: number) => string;
}

export default function ExpenseOverviewTab({
  expenseOverview,
  formatCurrency,
}: ExpenseOverviewTabProps) {
  const [sortBy, setSortBy] = useState<'committed' | 'allocated' | 'name'>('committed');

  const categoryData =
    expenseOverview?.map((category) => ({
      name: category.name,
      allocated: parseFloat(category.allocated_amount || 0),
      committed: parseFloat(category.committed || category.spent || 0),
      paid: parseFloat(category.paid || 0),
      outstanding: parseFloat(category.outstanding || 0),
    })) || [];

  const categoriesWithSpend = categoryData.filter((c) => c.committed > 0);
  const sorted = [...categoriesWithSpend].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return b[sortBy] - a[sortBy];
  });
  const totalCommitted = categoryData.reduce((s, c) => s + c.committed, 0);
  const totalAllocated = categoryData.reduce((s, c) => s + c.allocated, 0);
  const hasBudgets = totalAllocated > 0;
  const visibleTotalAllocated = categoriesWithSpend.reduce((sum, category) => sum + category.allocated, 0);
  const visibleTotalCommitted = categoriesWithSpend.reduce((sum, category) => sum + category.committed, 0);
  const visibleHasBudgets = visibleTotalAllocated > 0;
  const maxCommitted = Math.max(...categoriesWithSpend.map((c) => c.committed), 1);

  const pieData = categoriesWithSpend.map((category, index) => ({
    name: category.name,
    value: category.committed,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Top row: Pie + totals ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, position: 'relative', zIndex: 0 }}>
        {/* Pie */}
        <div className="card" style={{ overflow: 'visible', position: 'relative', zIndex: 2 }}>
          <h3 className="section-title" style={{ marginBottom: 16 }}>Committed by Category</h3>
          <div style={{ display: 'flex', gap: 16 }}>
            {pieData.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ink-dim)', padding: '24px 0', textAlign: 'center', width: '100%' }}>
                No committed expenses yet.
              </p>
            ) : (
              <>
                <div style={{ width: 160, height: 200, flexShrink: 0, overflow: 'visible', position: 'relative', zIndex: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={44}
                        outerRadius={72}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color ?? ''} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => formatCurrency(value)}
                        allowEscapeViewBox={{ x: true, y: true }}
                        wrapperStyle={{ zIndex: 20, pointerEvents: 'none' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1, minWidth: 0, maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pieData.map((entry, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--ink-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
                      <span className="mono" style={{ fontSize: 12, color: 'var(--gold-deep)', fontWeight: 600, flexShrink: 0 }}>{formatCurrency(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 className="section-title">Budget Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Total Allocated', value: totalAllocated, color: 'var(--ink-mid)' },
              { label: 'Total Committed', value: totalCommitted, color: 'var(--gold-deep)' },
              { label: 'Total Paid', value: categoryData.reduce((s, c) => s + c.paid, 0), color: 'var(--ok)' },
              { label: 'Total Outstanding', value: categoryData.reduce((s, c) => s + c.outstanding, 0), color: 'var(--warn)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-raised)', borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-low)' }}>{label}</span>
                <span className="mono" style={{ fontSize: 14, fontWeight: 700, color }}>{formatCurrency(value)}</span>
              </div>
            ))}
          </div>

          {/* Overall progress bar */}
          {totalAllocated > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>Budget used</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: totalCommitted > totalAllocated ? 'var(--err)' : 'var(--ink-mid)' }}>
                  {((totalCommitted / totalAllocated) * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{ height: 8, background: 'var(--bg-raised)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${Math.min(100, (totalCommitted / totalAllocated) * 100)}%`,
                  background: totalCommitted > totalAllocated ? 'var(--err)' : totalCommitted / totalAllocated >= 0.8 ? 'var(--warn)' : 'var(--gold)',
                  transition: 'width 600ms',
                }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Category budget tracker ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--line-soft)' }}>
          <h3 className="section-title">Allocated vs Committed</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>Sort:</span>
            {([['committed', 'Committed'], ['allocated', 'Allocated'], ['name', 'Name']] as const).map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setSortBy(val)}
                style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                  background: sortBy === val ? 'var(--gold-glow)' : 'transparent',
                  color: sortBy === val ? 'var(--gold-deep)' : 'var(--ink-dim)',
                  border: sortBy === val ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
                  fontWeight: sortBy === val ? 600 : 400,
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: visibleHasBudgets ? '1fr 110px 110px 80px 160px' : '1fr 130px 180px',
          gap: 8, padding: '8px 20px', background: 'var(--bg-raised)', borderBottom: '1px solid var(--line-soft)',
        }}>
          {(visibleHasBudgets
            ? ['Category', 'Allocated', 'Committed', 'Used', 'Spend bar']
            : ['Category', 'Committed', 'Spend bar']
          ).map((h) => (
            <span key={h} className="uppercase-eyebrow" style={{ fontSize: 9, textAlign: h !== 'Category' ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {sorted.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--ink-dim)', fontStyle: 'italic' }}>
            No categories with payments yet.
          </div>
        ) : (
          <div>
            {sorted.map((cat, i) => {
              const catHasBudget = cat.allocated > 0;
              const pct = catHasBudget ? (cat.committed / cat.allocated) * 100 : null;
              const isOver = pct != null && pct > 100;
              const isNear = pct != null && pct >= 80 && !isOver;
              const barColor = isOver ? 'var(--err)' : isNear ? 'var(--warn)' : 'var(--gold)';
              const pctColor = isOver ? 'var(--err)' : isNear ? 'var(--warn)' : 'var(--ok)';
              // when budgets set: bar = % of allocated; otherwise: bar = % of max committed
              const barFill = pct != null
                ? Math.min(100, pct)
                : (cat.committed / maxCommitted) * 100;

              return (
                <div
                  key={cat.name}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: visibleHasBudgets ? '1fr 110px 110px 80px 160px' : '1fr 130px 180px',
                    gap: 8,
                    padding: '11px 20px',
                    borderBottom: i < sorted.length - 1 ? '1px solid var(--line-soft)' : 'none',
                    alignItems: 'center',
                    background: isOver ? 'rgba(220,38,38,0.02)' : 'transparent',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isOver ? 'rgba(220,38,38,0.05)' : 'var(--bg-raised)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isOver ? 'rgba(220,38,38,0.02)' : 'transparent'; }}
                >
                  {/* Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: COLORS[i % COLORS.length] }} />
                    <span style={{ fontSize: 13, color: 'var(--ink-high)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cat.name}
                    </span>
                    {isOver && (
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 100, background: 'rgba(220,38,38,0.1)', color: 'var(--err)', fontWeight: 700, flexShrink: 0 }}>OVER</span>
                    )}
                  </div>

                  {/* Allocated — only when budgets exist */}
                  {visibleHasBudgets && (
                    <span className="mono" style={{ fontSize: 12, color: catHasBudget ? 'var(--ink-mid)' : 'var(--ink-dim)', textAlign: 'right' }}>
                      {catHasBudget ? formatCurrency(cat.allocated) : '—'}
                    </span>
                  )}

                  {/* Committed */}
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: cat.committed > 0 ? 'var(--gold-deep)' : 'var(--ink-dim)', textAlign: 'right' }}>
                    {cat.committed > 0 ? formatCurrency(cat.committed) : '—'}
                  </span>

                  {/* % used — only when budgets exist */}
                  {visibleHasBudgets && (
                    <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: pct != null ? pctColor : 'var(--ink-dim)', textAlign: 'right' }}>
                      {pct != null ? `${pct.toFixed(0)}%` : '—'}
                    </span>
                  )}

                  {/* Bar */}
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--line-soft)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${barFill}%`,
                      background: barColor,
                      transition: 'width 600ms',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer totals */}
        {sorted.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: visibleHasBudgets ? '1fr 110px 110px 80px 160px' : '1fr 130px 180px',
            gap: 8, padding: '10px 20px',
            background: 'var(--bg-raised)', borderTop: '1px solid var(--line)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-mid)' }}>Total</span>
            {visibleHasBudgets && (
              <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-mid)', textAlign: 'right' }}>{formatCurrency(visibleTotalAllocated)}</span>
            )}
            <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-deep)', textAlign: 'right' }}>{formatCurrency(visibleTotalCommitted)}</span>
            {visibleHasBudgets && (
              <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: visibleTotalCommitted > visibleTotalAllocated ? 'var(--err)' : 'var(--ok)', textAlign: 'right' }}>
                {`${((visibleTotalCommitted / visibleTotalAllocated) * 100).toFixed(0)}%`}
              </span>
            )}
            <span />
          </div>
        )}
      </div>
    </div>
  );
}
