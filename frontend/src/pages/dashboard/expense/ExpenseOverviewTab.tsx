/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import toast from 'react-hot-toast';
import { useExpensePayments, useSideSummary, useUpdateTotalBudget } from '../../../hooks/useApi';
import { parseLocalDate } from '../../../utils/date';
import { financeTier } from '@wedding-planner/shared';
import { useAuth } from '../../../contexts/AuthContext';

// Theme-cohesive categorical palette (rosewood → bronze → pine → plum → terracotta
// → berry → indigo). CVD-validated: worst adjacent pair ΔE 19.8, all ≥3:1 on panel.
const COLORS = ['#97404e', '#b08d3e', '#2e7d43', '#8a4489', '#bf5b2d', '#c2185b', '#5a55a8'];

// Same rosewood/bronze identity the old Sides tab used — CVD-validated pair
// drawn from the app's own palette tokens.
const SIDE_THEME = {
  bride: { label: 'Bride', deep: 'var(--bride-deep)', fill: 'var(--bride)' },
  groom: { label: 'Groom', deep: 'var(--groom-deep)', fill: 'var(--groom)' },
} as const;

interface OverviewSummary {
  totalBudget: number;
  planned: number;
  committed: number;
  paid: number;
  outstanding: number;
  remainingBudget: number;
}

interface ExpenseOverviewTabProps {
  expenseOverview: any[] | undefined;
  formatCurrency: (amount: number) => string;
  summary: OverviewSummary;
  alerts: any;
  onNavigate: (tab: string) => void;
  /** Jump to the scheduled-payments table on the Payments view. */
  onReviewPayments: () => void;
  /** Jump to the outstanding-balances table on the Payments view. */
  onReviewOutstanding: () => void;
}

function MiniStat({
  label,
  value,
  color,
  onClick,
  title,
}: {
  label: string;
  value: string;
  color: string;
  onClick?: (() => void) | undefined;
  title?: string | undefined;
}) {
  const body = (
    <>
      <div className="uppercase-eyebrow" style={{ fontSize: 9.5, marginBottom: 2 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color }}>
        {value}
      </div>
    </>
  );
  return onClick ? (
    <button
      onClick={onClick}
      title={title}
      style={{ background: 'transparent', cursor: 'pointer', textAlign: 'left', padding: 0 }}
    >
      {body}
    </button>
  ) : (
    <div>{body}</div>
  );
}

function dueBadge(dueDate: string, formatDate: (d: Date) => string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseLocalDate(dueDate);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)
    return { text: `Overdue · ${formatDate(due)}`, color: 'var(--err)' };
  if (diffDays === 0) return { text: 'Due today', color: 'var(--warn)' };
  if (diffDays <= 7) return { text: `Due in ${diffDays}d`, color: 'var(--warn)' };
  return { text: formatDate(due), color: 'var(--ink-dim)' };
}

export default function ExpenseOverviewTab({
  expenseOverview,
  formatCurrency,
  summary,
  alerts,
  onNavigate,
  onReviewPayments,
  onReviewOutstanding,
}: ExpenseOverviewTabProps) {
  const { totalBudget, planned, committed, paid, outstanding, remainingBudget } = summary;
  const updateTotalBudget = useUpdateTotalBudget();
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState('');
  const { data: paymentsResponse } = useExpensePayments();
  // No page/per_page passed above, so this is always the plain-array branch.
  const payments = Array.isArray(paymentsResponse) ? paymentsResponse : [];
  const { user } = useAuth();
  const canSeeSplits = financeTier(user) === 'full';
  const { data: sideSummary } = useSideSummary(canSeeSplits);

  const handleBudgetSave = async () => {
    const value = parseFloat(budgetDraft);
    if (isNaN(value) || value < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      await updateTotalBudget.mutateAsync(value);
      toast.success('Wedding budget updated.');
      setEditingBudget(false);
    } catch {
      toast.error('Failed to update budget.');
    }
  };

  const nextPayments = payments
    .filter((payment) => payment.status === 'scheduled' && payment.direction === 'outflow')
    .sort(
      (a, b) =>
        parseLocalDate(a.due_date ?? a.created_at).getTime() -
        parseLocalDate(b.due_date ?? b.created_at).getTime(),
    )
    .slice(0, 4);

  const alertRows: { key: string; text: string; color: string; bg: string; onClick: () => void }[] =
    [];
  if (alerts?.overdueCount > 0)
    alertRows.push({
      key: 'overdue',
      text: `${alerts.overdueCount} overdue payment${alerts.overdueCount !== 1 ? 's' : ''} · ${formatCurrency(alerts.overdueTotal)}`,
      color: 'var(--err)',
      bg: 'rgba(220,38,38,0.06)',
      onClick: onReviewPayments,
    });
  if (alerts?.upcomingCount > 0)
    alertRows.push({
      key: 'upcoming',
      text: `${alerts.upcomingCount} payment${alerts.upcomingCount !== 1 ? 's' : ''} due in 7 days · ${formatCurrency(alerts.upcomingTotal)}`,
      color: 'var(--warn)',
      bg: 'rgba(217,119,6,0.07)',
      onClick: onReviewPayments,
    });
  for (const category of alerts?.overBudgetCategories ?? [])
    alertRows.push({
      key: `ob-${category.id}`,
      text: `${category.name} over budget by ${formatCurrency(category.overBy)}`,
      color: 'var(--err)',
      bg: 'rgba(220,38,38,0.06)',
      onClick: () => onNavigate('budget'),
    });
  for (const category of alerts?.overPlanCategories ?? [])
    alertRows.push({
      key: `op-${category.id}`,
      text: `${category.name} allocations exceed plan by ${formatCurrency(category.overBy)}`,
      color: 'var(--warn)',
      bg: 'rgba(217,119,6,0.07)',
      onClick: () => onNavigate('budget'),
    });

  const cats = (expenseOverview ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    parent: (c.parent_category_id ?? null) as string | null,
    budget: parseFloat(c.allocated_amount || 0),
    committed: parseFloat(c.committed || c.spent || 0),
  }));

  // Parent-level rollups: a category counts as unbudgeted only when money is
  // allocated to it (or its children) and no budget exists anywhere in the group.
  const parentGroups = cats
    .filter((c) => !c.parent)
    .map((parent) => {
      const kids = cats.filter((c) => c.parent === parent.id);
      return {
        name: parent.name,
        budget: parent.budget + kids.reduce((s, k) => s + k.budget, 0),
        committed: parent.committed + kids.reduce((s, k) => s + k.committed, 0),
      };
    });
  const unbudgeted = parentGroups.filter((g) => g.committed > 0 && g.budget === 0);
  if (unbudgeted.length > 0)
    alertRows.push({
      key: 'unbudgeted',
      text:
        unbudgeted.length === 1
          ? `No budget set for ${unbudgeted[0]?.name} — ${formatCurrency(unbudgeted[0]?.committed ?? 0)} already allocated`
          : `No budget set for ${unbudgeted.length} spending categories`,
      color: 'var(--info)',
      bg: 'var(--info-soft)',
      onClick: () => onNavigate('budget'),
    });

  const pieData = cats
    .filter((c) => c.committed > 0)
    .sort((a, b) => b.committed - a.committed)
    .map((category, index) => ({
      name: category.name,
      value: category.committed,
      color: COLORS[index % COLORS.length],
    }));

  const denom = Math.max(totalBudget, committed, 1);
  const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const showSplit = canSeeSplits && !!sideSummary;
  const brideTotal = sideSummary?.bride.total ?? 0;
  const groomTotal = sideSummary?.groom.total ?? 0;
  const splitGrandTotal = brideTotal + groomTotal;
  const bridePct = splitGrandTotal > 0 ? (brideTotal / splitGrandTotal) * 100 : 50;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Budget hero ── */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4">
          <div style={{ minWidth: 200 }}>
            <div className="uppercase-eyebrow" style={{ marginBottom: 4 }}>
              Wedding budget
            </div>
            {editingBudget ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={budgetDraft}
                  onChange={(e) => setBudgetDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleBudgetSave();
                    if (e.key === 'Escape') setEditingBudget(false);
                  }}
                  autoFocus
                  placeholder="Total budget"
                  className="input no-spinner"
                  style={{ width: 160, fontSize: 16 }}
                />
                <button
                  onClick={() => void handleBudgetSave()}
                  disabled={updateTotalBudget.isPending}
                  className="btn-primary"
                  style={{ padding: '6px 12px' }}
                  aria-label="Save budget"
                >
                  ✓
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setBudgetDraft(totalBudget > 0 ? String(totalBudget) : '');
                  setEditingBudget(true);
                }}
                className="display"
                style={{
                  fontSize: 26,
                  lineHeight: 1.15,
                  color: 'var(--gold-deep)',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 0,
                  textAlign: 'left',
                }}
                title="Edit wedding budget"
              >
                {totalBudget > 0 ? formatCurrency(totalBudget) : 'Set budget →'}
              </button>
            )}
            {/* Without a budget, "remaining" is just −allocated — noise, not signal. */}
            {totalBudget > 0 && (
              <div
                style={{
                  fontSize: 12,
                  marginTop: 2,
                  color: remainingBudget < 0 ? 'var(--err)' : 'var(--ink-low)',
                }}
              >
                {remainingBudget < 0
                  ? `over budget by ${formatCurrency(Math.abs(remainingBudget))}`
                  : `${formatCurrency(remainingBudget)} remaining`}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
            <MiniStat
              label="Planned"
              value={formatCurrency(planned)}
              color="var(--ink-mid)"
            />
            <MiniStat
              label="Allocated"
              value={formatCurrency(committed)}
              color="var(--gold-deep)"
            />
            <MiniStat label="Paid" value={formatCurrency(paid)} color="var(--ok)" />
            <MiniStat
              label="Outstanding"
              value={formatCurrency(outstanding)}
              color={outstanding > 0 ? 'var(--warn)' : 'var(--ink-dim)'}
              onClick={outstanding > 0 ? onReviewOutstanding : undefined}
              title={outstanding > 0 ? 'See outstanding balances' : undefined}
            />
          </div>
        </div>

        {(totalBudget > 0 || committed > 0) && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: 'var(--bg-raised)',
                overflow: 'hidden',
                display: 'flex',
              }}
            >
              <div style={{ width: `${(paid / denom) * 100}%`, background: 'var(--ok)' }} />
              <div
                style={{
                  width: `${(Math.max(0, committed - paid) / denom) * 100}%`,
                  background: 'var(--warn)',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                marginTop: 5,
                fontSize: 11,
                color: 'var(--ink-dim)',
              }}
            >
              <span>
                <span style={{ color: 'var(--ok)' }}>●</span> Paid ·{' '}
                <span style={{ color: 'var(--warn)' }}>●</span> Outstanding
              </span>
              {totalBudget > 0 && (
                <span>{((committed / totalBudget) * 100).toFixed(0)}% of budget allocated</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div
        className={`grid grid-cols-1 gap-4 items-start ${showSplit ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}
      >
        {/* ── Needs attention ── */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <h3 className="section-title">Needs Attention</h3>
            <button
              onClick={() => onNavigate('payments')}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--gold-deep)',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              All payments →
            </button>
          </div>

          {alertRows.length === 0 && nextPayments.length === 0 ? (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--bg-raised)',
                fontSize: 12.5,
                color: 'var(--ink-low)',
              }}
            >
              <span style={{ color: 'var(--ok)' }}>✓</span> All clear — budgets set, nothing due,
              every category on track.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {alertRows.map((alert) => (
                <button
                  key={alert.key}
                  onClick={alert.onClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: alert.bg,
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: alert.color,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span>⚠ {alert.text}</span>
                  <span>→</span>
                </button>
              ))}

              {nextPayments.length > 0 && (
                <>
                  <div className="uppercase-eyebrow" style={{ fontSize: 9.5, margin: '10px 0 2px' }}>
                    Next payments
                  </div>
                  {nextPayments.map((payment) => {
                    const badge = dueBadge(payment.due_date ?? payment.created_at, formatDate);
                    return (
                      <button
                        key={payment.id}
                        onClick={onReviewPayments}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '7px 12px',
                          borderRadius: 8,
                          background: 'var(--bg-raised)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: 13,
                            color: 'var(--ink-high)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {payment.expense.description}
                        </span>
                        <span style={{ fontSize: 11, color: badge.color, flexShrink: 0 }}>
                          {badge.text}
                        </span>
                        <span
                          className="mono"
                          style={{
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: 'var(--ink-mid)',
                            flexShrink: 0,
                          }}
                        >
                          {formatCurrency(payment.amount)}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Allocation pie ── */}
        <div className="card" style={{ overflow: 'visible' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <h3 className="section-title">Allocated by Category</h3>
            <button
              onClick={() => onNavigate('budget')}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--gold-deep)',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              Manage budgets →
            </button>
          </div>
          {pieData.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: 'var(--ink-dim)',
                padding: '24px 0',
                textAlign: 'center',
              }}
            >
              No allocated expenses yet.
            </p>
          ) : (
            <div style={{ display: 'flex', gap: 16 }}>
              <div
                style={{
                  width: 150,
                  height: 170,
                  flexShrink: 0,
                  overflow: 'visible',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                {/* Fixed size, not ResponsiveContainer: the box is a hard
                    150×170, and the container measured -1×-1 before its
                    ResizeObserver settled, which recharts warns about. */}
                <PieChart width={150} height={170}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={66}
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
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  maxHeight: 170,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {pieData.map((entry, i) => (
                  <div
                    key={i}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: entry.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: 12,
                        color: 'var(--ink-mid)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.name}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 12,
                        color: 'var(--gold-deep)',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {formatCurrency(entry.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Bride/groom split ── */}
        {showSplit && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <h3 className="section-title">Bride &amp; Groom Split</h3>
              <button
                onClick={() => onNavigate('expenses')}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--gold-deep)',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                Filter by side →
              </button>
            </div>

            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: 'var(--bg-raised)',
                overflow: 'hidden',
                display: 'flex',
              }}
            >
              <div style={{ width: `${bridePct}%`, background: 'var(--bride)' }} />
              <div style={{ width: `${100 - bridePct}%`, background: 'var(--groom)' }} />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 5,
                fontSize: 11,
                color: 'var(--ink-dim)',
              }}
            >
              <span>
                <span style={{ color: 'var(--bride)' }}>●</span> Bride {bridePct.toFixed(0)}%
              </span>
              <span>
                Groom {(100 - bridePct).toFixed(0)}%{' '}
                <span style={{ color: 'var(--groom)' }}>●</span>
              </span>
            </div>

            <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
              {(['bride', 'groom'] as const).map((side) => {
                const theme = SIDE_THEME[side];
                const figures = sideSummary[side];
                return (
                  <div key={side} style={{ flex: 1, minWidth: 0 }}>
                    <div className="uppercase-eyebrow" style={{ fontSize: 9.5, marginBottom: 2 }}>
                      {theme.label}
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: 15, fontWeight: 700, color: theme.deep }}
                    >
                      {formatCurrency(figures.total)}
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                      <div>
                        <div className="uppercase-eyebrow" style={{ fontSize: 9 }}>
                          Paid
                        </div>
                        <div
                          className="mono"
                          style={{ fontSize: 12, fontWeight: 600, color: 'var(--ok)' }}
                        >
                          {formatCurrency(figures.paid)}
                        </div>
                      </div>
                      <div>
                        <div className="uppercase-eyebrow" style={{ fontSize: 9 }}>
                          Owed
                        </div>
                        <div
                          className="mono"
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: figures.outstanding > 0 ? 'var(--warn)' : 'var(--ink-dim)',
                          }}
                        >
                          {formatCurrency(figures.outstanding)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
