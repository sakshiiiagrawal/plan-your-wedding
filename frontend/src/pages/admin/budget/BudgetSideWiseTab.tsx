/* eslint-disable @typescript-eslint/no-explicit-any */
import { HiOutlineUser, HiOutlineUsers } from 'react-icons/hi';

interface SideCardProps {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  count: number;
  total: number;
  formatCurrency: (amount: number) => string;
}

function SideCard({
  label,
  color,
  icon: Icon,
  iconBg,
  iconColor,
  count,
  total,
  formatCurrency,
}: SideCardProps) {
  return (
    <div className={`card border-l-4 ${color}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-full ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <div
            className={`font-semibold ${color.replace('border-', 'text-').replace('-500', '-700')}`}
          >
            {label}
          </div>
          <div className="text-sm text-gray-500">
            {count} expense{count !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      <div
        className={`text-2xl font-bold ${color.replace('border-', 'text-').replace('-500', '-700')}`}
      >
        {formatCurrency(total)}
      </div>
    </div>
  );
}

interface ExpenseListProps {
  items: any[];
  emptyText: string;
  headerBg: string;
  headerBorder: string;
  headerColor: string;
  amountColor: string;
  totalBg: string;
  totalColor: string;
  formatCurrency: (amount: number) => string;
  isShared: boolean;
}

function ExpenseList({
  items,
  emptyText,
  headerBg,
  headerBorder,
  headerColor,
  amountColor,
  totalBg,
  totalColor,
  formatCurrency,
  isShared,
}: ExpenseListProps) {
  return (
    <div className="card overflow-hidden p-0">
      <div className={`p-4 ${headerBg} border-b ${headerBorder}`}>
        <h3 className={`font-semibold ${headerColor}`}>
          {isShared
            ? 'Shared Expenses'
            : `${headerColor.includes('pink') ? 'Bride' : 'Groom'} Side Expenses`}
        </h3>
      </div>
      {items.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {items.map((e: any) => (
            <div key={e.id} className="p-3 flex justify-between items-start">
              <div>
                <div className="font-medium text-sm text-gray-800">{e.description}</div>
                <div className="text-xs text-gray-500 capitalize">
                  {e.budget_categories?.name || 'N/A'}
                </div>
                {isShared ? (
                  <div className="text-xs text-gray-400">
                    Split: {e.share_percentage || 50}% / {100 - (e.share_percentage || 50)}%
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">
                    {e.expense_date ? new Date(e.expense_date).toLocaleDateString('en-IN') : '—'}
                  </div>
                )}
              </div>
              <div className={`text-sm font-semibold ${amountColor} ml-2 shrink-0`}>
                {formatCurrency(parseFloat(e.amount || 0))}
              </div>
            </div>
          ))}
          <div className={`p-3 ${totalBg} flex justify-between font-bold ${totalColor}`}>
            <span>Total</span>
            <span>
              {formatCurrency(
                items.reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0),
              )}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-gray-400 text-sm">{emptyText}</div>
      )}
    </div>
  );
}

interface SideWiseExpenses {
  bride: { items: any[]; total: number };
  groom: { items: any[]; total: number };
  shared: { items: any[]; total: number };
}

interface BudgetSideWiseTabProps {
  sideWiseExpenses: SideWiseExpenses;
  formatCurrency: (amount: number) => string;
}

export default function BudgetSideWiseTab({
  sideWiseExpenses,
  formatCurrency,
}: BudgetSideWiseTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <SideCard
          label="Bride Side"
          color="border-pink-500"
          icon={HiOutlineUser}
          iconBg="bg-pink-100"
          iconColor="text-pink-600"
          count={sideWiseExpenses.bride.items.length}
          total={sideWiseExpenses.bride.total}
          formatCurrency={formatCurrency}
        />
        <SideCard
          label="Groom Side"
          color="border-blue-500"
          icon={HiOutlineUser}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          count={sideWiseExpenses.groom.items.length}
          total={sideWiseExpenses.groom.total}
          formatCurrency={formatCurrency}
        />
        <SideCard
          label="Shared"
          color="border-yellow-500"
          icon={HiOutlineUsers}
          iconBg="bg-yellow-100"
          iconColor="text-yellow-600"
          count={sideWiseExpenses.shared.items.length}
          total={sideWiseExpenses.shared.total}
          formatCurrency={formatCurrency}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <ExpenseList
          items={sideWiseExpenses.bride.items}
          emptyText="No bride side expenses"
          headerBg="bg-pink-50"
          headerBorder="border-pink-100"
          headerColor="text-pink-700"
          amountColor="text-pink-700"
          totalBg="bg-pink-50"
          totalColor="text-pink-700"
          formatCurrency={formatCurrency}
          isShared={false}
        />
        <ExpenseList
          items={sideWiseExpenses.groom.items}
          emptyText="No groom side expenses"
          headerBg="bg-blue-50"
          headerBorder="border-blue-100"
          headerColor="text-blue-700"
          amountColor="text-blue-700"
          totalBg="bg-blue-50"
          totalColor="text-blue-700"
          formatCurrency={formatCurrency}
          isShared={false}
        />
        <ExpenseList
          items={sideWiseExpenses.shared.items}
          emptyText="No shared expenses"
          headerBg="bg-yellow-50"
          headerBorder="border-yellow-100"
          headerColor="text-yellow-700"
          amountColor="text-yellow-700"
          totalBg="bg-yellow-50"
          totalColor="text-yellow-700"
          formatCurrency={formatCurrency}
          isShared={true}
        />
      </div>
    </div>
  );
}
