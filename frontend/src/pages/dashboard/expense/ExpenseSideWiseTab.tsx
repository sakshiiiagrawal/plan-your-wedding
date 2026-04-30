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

interface SideCardProps {
  label: string;
  subtitle: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  count: number;
  total: number;
  directCount: number;
  sharedCount: number;
  directTotal: number;
  sharedTotal: number;
  formatCurrency: (amount: number) => string;
}

function SideCard({
  label,
  subtitle,
  color,
  icon: Icon,
  iconBg,
  iconColor,
  count,
  total,
  directCount,
  sharedCount,
  directTotal,
  sharedTotal,
  formatCurrency,
}: SideCardProps) {
  return (
    <div className={`card border-l-4 ${color} overflow-hidden`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center shadow-sm`}
          >
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <div
              className={`font-semibold ${color.replace('border-', 'text-').replace('-500', '-700')}`}
            >
              {label}
            </div>
            <div className="text-sm text-gray-500">{subtitle}</div>
          </div>
        </div>
        <div className="rounded-full bg-white/80 border border-black/5 px-3 py-1 text-xs font-medium text-gray-500">
          {count} items
        </div>
      </div>
      <div
        className={`text-3xl font-bold mb-4 ${color.replace('border-', 'text-').replace('-500', '-700')}`}
      >
        {formatCurrency(total)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-black/5 bg-black/[0.02] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Direct</div>
          <div className="mt-1 text-sm font-semibold text-gray-800">
            {formatCurrency(directTotal)}
          </div>
          <div className="text-xs text-gray-500">{directCount} dedicated items</div>
        </div>
        <div className="rounded-2xl border border-black/5 bg-black/[0.02] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Shared</div>
          <div className="mt-1 text-sm font-semibold text-gray-800">
            {formatCurrency(sharedTotal)}
          </div>
          <div className="text-xs text-gray-500">{sharedCount} shared allocations</div>
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
  const brideWidth = grandTotal > 0 ? (brideTotal / grandTotal) * 100 : 50;
  const groomWidth = grandTotal > 0 ? (groomTotal / grandTotal) * 100 : 50;

  return (
    <div className="card relative overflow-hidden bg-[linear-gradient(135deg,rgba(236,72,153,0.07),rgba(255,255,255,0.96)_40%,rgba(59,130,246,0.08))]">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(236,72,153,0.4),rgba(212,175,55,0.5),rgba(59,130,246,0.4))]" />
      <div className="uppercase-eyebrow">Side-wise Split</div>
      <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="display text-3xl text-stone-900">Bride and groom totals, side by side</h3>
          <p className="mt-2 max-w-2xl text-sm text-stone-500">
            Shared expenses are folded into both columns using the configured split, so each side
            reflects the amount it actually carries.
          </p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
          <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
            Combined view
          </div>
          <div className="mt-1 text-2xl font-semibold text-stone-900">
            {formatCurrency(grandTotal)}
          </div>
          <div className="text-xs text-stone-500">
            {brideCount + groomCount} visible allocations
          </div>
        </div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/80 ring-1 ring-black/5">
        <div className="flex h-full">
          <div
            className="bg-gradient-to-r from-pink-400 to-pink-500"
            style={{ width: `${brideWidth}%` }}
          />
          <div
            className="bg-gradient-to-r from-blue-400 to-blue-500"
            style={{ width: `${groomWidth}%` }}
          />
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-pink-100 bg-pink-50/80 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-pink-500">
            Bride share
          </div>
          <div className="mt-1 text-lg font-semibold text-pink-800">
            {formatCurrency(brideTotal)}
          </div>
          <div className="text-xs text-pink-700/80">
            {brideCount} line items shown in this column
          </div>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-blue-500">
            Groom share
          </div>
          <div className="mt-1 text-lg font-semibold text-blue-800">
            {formatCurrency(groomTotal)}
          </div>
          <div className="text-xs text-blue-700/80">
            {groomCount} line items shown in this column
          </div>
        </div>
      </div>
    </div>
  );
}

interface ExpenseListProps {
  title: string;
  subtitle: string;
  items: SideItem[];
  emptyText: string;
  headerBg: string;
  headerBorder: string;
  headerColor: string;
  amountColor: string;
  totalBg: string;
  totalColor: string;
  formatCurrency: (amount: number) => string;
}

function ExpenseList({
  title,
  subtitle,
  items,
  emptyText,
  headerBg,
  headerBorder,
  headerColor,
  amountColor,
  totalBg,
  totalColor,
  formatCurrency,
}: ExpenseListProps) {
  return (
    <div className="card overflow-hidden p-0 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.35)]">
      <div className={`p-5 ${headerBg} border-b ${headerBorder}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={`font-semibold text-base ${headerColor}`}>{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>
          <div className="rounded-full border border-black/5 bg-white/80 px-3 py-1 text-xs font-medium text-gray-500">
            {items.length} items
          </div>
        </div>
      </div>
      {items.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 transition-colors hover:bg-black/[0.015] flex justify-between items-start gap-3"
            >
              <div className="min-w-0">
                <div className="font-medium text-sm text-gray-800 flex flex-wrap items-center gap-2">
                  <span>{item.description}</span>
                  {item.is_shared && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      Shared bill
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-500">{item.category_name}</div>
                <div className="mt-1 text-xs text-gray-400">
                  {item.expense_title} · {new Date(item.expense_date).toLocaleDateString('en-IN')}
                </div>
                {item.is_shared && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-600">
                      Shown here {formatCurrency(item.amount)}
                    </span>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-600">
                      Shared bill {formatCurrency(item.shared_total_amount ?? 0)}
                    </span>
                    <span className="rounded-full bg-pink-50 px-2.5 py-1 text-pink-700">
                      Bride pays {formatCurrency(item.bride_share_amount ?? 0)}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                      Groom pays {formatCurrency(item.groom_share_amount ?? 0)}
                    </span>
                  </div>
                )}
              </div>
              <div
                className={`rounded-2xl px-3 py-2 text-sm font-semibold ${amountColor} ml-2 shrink-0 bg-black/[0.03]`}
              >
                {formatCurrency(item.amount)}
              </div>
            </div>
          ))}
          <div
            className={`p-4 ${totalBg} flex justify-between items-center font-bold ${totalColor}`}
          >
            <span>{title} total</span>
            <span className="text-base">
              {formatCurrency(items.reduce((sum, item) => sum + item.amount, 0))}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.03]">
            <div className="h-2.5 w-2.5 rounded-full bg-black/20" />
          </div>
          <div className="text-sm font-medium text-gray-500">{emptyText}</div>
          <div className="mt-1 text-xs text-gray-400">
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
          label="Bride Side"
          subtitle="Direct costs plus the bride's share of joint expenses"
          color="border-pink-500"
          icon={HiOutlineUser}
          iconBg="bg-pink-100"
          iconColor="text-pink-600"
          count={sideWiseExpenses.bride.items.length}
          total={sideWiseExpenses.bride.total}
          directCount={sideWiseExpenses.bride.directCount}
          sharedCount={sideWiseExpenses.bride.sharedCount}
          directTotal={sideWiseExpenses.bride.directTotal}
          sharedTotal={sideWiseExpenses.bride.sharedTotal}
          formatCurrency={formatCurrency}
        />
        <SideCard
          label="Groom Side"
          subtitle="Direct costs plus the groom's share of joint expenses"
          color="border-blue-500"
          icon={HiOutlineUser}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
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
          title="Bride Side"
          subtitle="Every direct bride-side item and every shared allocation billed to the bride."
          items={sideWiseExpenses.bride.items}
          emptyText="No bride-side items"
          headerBg="bg-pink-50"
          headerBorder="border-pink-100"
          headerColor="text-pink-700"
          amountColor="text-pink-700"
          totalBg="bg-pink-50"
          totalColor="text-pink-700"
          formatCurrency={formatCurrency}
        />
        <ExpenseList
          title="Groom Side"
          subtitle="Every direct groom-side item and every shared allocation billed to the groom."
          items={sideWiseExpenses.groom.items}
          emptyText="No groom-side items"
          headerBg="bg-blue-50"
          headerBorder="border-blue-100"
          headerColor="text-blue-700"
          amountColor="text-blue-700"
          totalBg="bg-blue-50"
          totalColor="text-blue-700"
          formatCurrency={formatCurrency}
        />
      </div>
    </div>
  );
}
