import { HiOutlineUser } from 'react-icons/hi';

interface SideItem {
  id: string;
  description: string;
  category_name: string;
  amount: number;
  expense_date: string;
  expense_title: string;
  bride_share_percentage?: number | null;
  shared_share_percentage?: number | null;
  is_shared?: boolean;
  shared_total_amount?: number;
  bride_share_amount?: number;
  groom_share_amount?: number;
}

type SideKey = 'bride' | 'groom';

// Single source of truth for the two sides' identity — rosewood & bronze,
// a CVD-validated pair drawn from the app's own palette tokens.
const SIDE_THEME: Record<
  SideKey,
  { label: string; color: string; deep: string; soft: string; line: string }
> = {
  bride: {
    label: 'Bride',
    color: 'var(--bride)',
    deep: 'var(--bride-deep)',
    soft: 'var(--bride-soft)',
    line: 'var(--bride-line)',
  },
  groom: {
    label: 'Groom',
    color: 'var(--groom)',
    deep: 'var(--groom-deep)',
    soft: 'var(--groom-soft)',
    line: 'var(--groom-line)',
  },
};

interface SideCardProps {
  side: SideKey;
  subtitle: string;
  count: number;
  total: number;
  directCount: number;
  sharedCount: number;
  directTotal: number;
  sharedTotal: number;
  formatCurrency: (amount: number) => string;
}

function SideCard({
  side,
  subtitle,
  count,
  total,
  directCount,
  sharedCount,
  directTotal,
  sharedTotal,
  formatCurrency,
}: SideCardProps) {
  const theme = SIDE_THEME[side];
  return (
    <div
      className="card overflow-hidden"
      style={{ borderTop: `3px solid ${theme.color}` }}
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: theme.soft, border: `1px solid ${theme.line}` }}
          >
            <HiOutlineUser className="w-5 h-5" style={{ color: theme.deep }} />
          </div>
          <div>
            <div className="font-semibold" style={{ color: theme.deep }}>
              {theme.label} Side
            </div>
            <div className="text-sm text-ink-low">{subtitle}</div>
          </div>
        </div>
        <div
          className="rounded-full px-3 py-1 text-xs font-medium"
          style={{ background: theme.soft, color: theme.deep }}
        >
          {count} items
        </div>
      </div>
      <div className="text-3xl font-bold mb-4" style={{ color: theme.deep }}>
        {formatCurrency(total)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line-soft bg-surface-raised px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink-dim">Direct</div>
          <div className="mt-1 text-sm font-semibold text-ink-high">
            {formatCurrency(directTotal)}
          </div>
          <div className="text-xs text-ink-low">{directCount} dedicated items</div>
        </div>
        <div className="rounded-xl border border-line-soft bg-surface-raised px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink-dim">Shared</div>
          <div className="mt-1 text-sm font-semibold text-ink-high">
            {formatCurrency(sharedTotal)}
          </div>
          <div className="text-xs text-ink-low">{sharedCount} shared allocations</div>
        </div>
      </div>
    </div>
  );
}

interface SideSummaryCardProps {
  brideTotal: number;
  groomTotal: number;
  brideCount: number;
  groomCount: number;
  formatCurrency: (amount: number) => string;
}

function SideSummaryCard({
  brideTotal,
  groomTotal,
  brideCount,
  groomCount,
  formatCurrency,
}: SideSummaryCardProps) {
  const grandTotal = brideTotal + groomTotal;
  const bridePct = grandTotal > 0 ? (brideTotal / grandTotal) * 100 : 50;
  const groomPct = grandTotal > 0 ? (groomTotal / grandTotal) * 100 : 50;

  return (
    <div className="card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="uppercase-eyebrow">Side-wise Split</div>
          <h3 className="display mt-2 text-2xl text-ink-high">Bride and groom totals</h3>
          <p className="mt-1 max-w-xl text-sm text-ink-low">
            Shared expenses are folded into both columns using each bill's split, so every side
            reflects the amount it actually carries.
          </p>
        </div>
        <div className="rounded-xl border border-line-soft bg-surface-raised px-4 py-3 text-right shrink-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink-dim">Combined</div>
          <div className="mt-1 text-2xl font-semibold text-ink-high">
            {formatCurrency(grandTotal)}
          </div>
          <div className="text-xs text-ink-low">{brideCount + groomCount} allocations</div>
        </div>
      </div>

      {/* Split meter — 2px surface gap between the two fills */}
      <div
        className="mt-5 flex h-3 overflow-hidden rounded-full"
        style={{ background: 'var(--bg-highest)', gap: 2 }}
      >
        <div style={{ width: `${bridePct}%`, background: 'var(--bride)' }} />
        <div style={{ width: `${groomPct}%`, background: 'var(--groom)' }} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {(['bride', 'groom'] as const).map((side) => {
          const theme = SIDE_THEME[side];
          const total = side === 'bride' ? brideTotal : groomTotal;
          const count = side === 'bride' ? brideCount : groomCount;
          const pct = side === 'bride' ? bridePct : groomPct;
          return (
            <div
              key={side}
              className="rounded-xl px-4 py-3"
              style={{ background: theme.soft, border: `1px solid ${theme.line}` }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="text-xs font-medium uppercase tracking-[0.18em]"
                  style={{ color: theme.deep }}
                >
                  {theme.label} share
                </div>
                <div className="text-xs font-semibold" style={{ color: theme.deep }}>
                  {pct.toFixed(0)}%
                </div>
              </div>
              <div className="mt-1 text-lg font-semibold" style={{ color: theme.deep }}>
                {formatCurrency(total)}
              </div>
              <div className="text-xs text-ink-low">{count} line items in this column</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ExpenseListProps {
  side: SideKey;
  subtitle: string;
  items: SideItem[];
  emptyText: string;
  formatCurrency: (amount: number) => string;
}

function ExpenseList({ side, subtitle, items, emptyText, formatCurrency }: ExpenseListProps) {
  const theme = SIDE_THEME[side];
  const listTotal = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="card overflow-hidden p-0">
      <div
        className="p-5 border-b border-line-soft"
        style={{ background: theme.soft, borderTop: `3px solid ${theme.color}` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base" style={{ color: theme.deep }}>
              {theme.label} Side
            </h3>
            <p className="mt-1 text-sm text-ink-low">{subtitle}</p>
          </div>
          <div
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{ background: 'var(--bg-panel)', color: theme.deep }}
          >
            {items.length} items
          </div>
        </div>
      </div>
      {items.length > 0 ? (
        <div className="divide-y divide-line-soft">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 transition-colors hover:bg-surface-raised flex justify-between items-start gap-3"
            >
              <div className="min-w-0">
                <div className="font-medium text-sm text-ink-high flex flex-wrap items-center gap-2">
                  <span>{item.description}</span>
                  {item.is_shared && (
                    <span className="inline-flex items-center rounded-full bg-surface-highest px-2 py-0.5 text-[11px] font-medium text-ink-mid">
                      Shared bill
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-ink-low">{item.category_name}</div>
                <div className="mt-1 text-xs text-ink-low">
                  {item.expense_title} · {new Date(item.expense_date).toLocaleDateString('en-IN')}
                </div>
                {item.is_shared && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-surface-raised px-2.5 py-1 text-ink-mid">
                      Shared bill {formatCurrency(item.shared_total_amount ?? 0)}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-1"
                      style={{ background: SIDE_THEME.bride.soft, color: SIDE_THEME.bride.deep }}
                    >
                      Bride {formatCurrency(item.bride_share_amount ?? 0)}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-1"
                      style={{ background: SIDE_THEME.groom.soft, color: SIDE_THEME.groom.deep }}
                    >
                      Groom {formatCurrency(item.groom_share_amount ?? 0)}
                    </span>
                  </div>
                )}
              </div>
              <div
                className="rounded-xl px-3 py-2 text-sm font-semibold ml-2 shrink-0"
                style={{ background: theme.soft, color: theme.deep }}
              >
                {formatCurrency(item.amount)}
              </div>
            </div>
          ))}
          <div
            className="p-4 flex justify-between items-center font-bold"
            style={{ background: theme.soft, color: theme.deep }}
          >
            <span>{theme.label} total</span>
            <span className="text-base">{formatCurrency(listTotal)}</span>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised">
            <HiOutlineUser className="h-5 w-5 text-ink-dim" />
          </div>
          <div className="text-sm font-medium text-ink-low">{emptyText}</div>
          <div className="mt-1 text-xs text-ink-dim">
            New entries will appear here once they are assigned to this side.
          </div>
        </div>
      )}
    </div>
  );
}

interface SideWiseExpenses {
  bride: {
    items: SideItem[];
    total: number;
    directCount: number;
    sharedCount: number;
    directTotal: number;
    sharedTotal: number;
  };
  groom: {
    items: SideItem[];
    total: number;
    directCount: number;
    sharedCount: number;
    directTotal: number;
    sharedTotal: number;
  };
}

interface ExpenseSideWiseTabProps {
  sideWiseExpenses: SideWiseExpenses;
  formatCurrency: (amount: number) => string;
}

export default function ExpenseSideWiseTab({
  sideWiseExpenses,
  formatCurrency,
}: ExpenseSideWiseTabProps) {
  return (
    <div className="space-y-6">
      <SideSummaryCard
        brideTotal={sideWiseExpenses.bride.total}
        groomTotal={sideWiseExpenses.groom.total}
        brideCount={sideWiseExpenses.bride.items.length}
        groomCount={sideWiseExpenses.groom.items.length}
        formatCurrency={formatCurrency}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <SideCard
          side="bride"
          subtitle="Direct costs plus the bride's share of joint expenses"
          count={sideWiseExpenses.bride.items.length}
          total={sideWiseExpenses.bride.total}
          directCount={sideWiseExpenses.bride.directCount}
          sharedCount={sideWiseExpenses.bride.sharedCount}
          directTotal={sideWiseExpenses.bride.directTotal}
          sharedTotal={sideWiseExpenses.bride.sharedTotal}
          formatCurrency={formatCurrency}
        />
        <SideCard
          side="groom"
          subtitle="Direct costs plus the groom's share of joint expenses"
          count={sideWiseExpenses.groom.items.length}
          total={sideWiseExpenses.groom.total}
          directCount={sideWiseExpenses.groom.directCount}
          sharedCount={sideWiseExpenses.groom.sharedCount}
          directTotal={sideWiseExpenses.groom.directTotal}
          sharedTotal={sideWiseExpenses.groom.sharedTotal}
          formatCurrency={formatCurrency}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ExpenseList
          side="bride"
          subtitle="Every direct bride-side item and every shared allocation billed to the bride."
          items={sideWiseExpenses.bride.items}
          emptyText="No bride-side items"
          formatCurrency={formatCurrency}
        />
        <ExpenseList
          side="groom"
          subtitle="Every direct groom-side item and every shared allocation billed to the groom."
          items={sideWiseExpenses.groom.items}
          emptyText="No groom-side items"
          formatCurrency={formatCurrency}
        />
      </div>
    </div>
  );
}
