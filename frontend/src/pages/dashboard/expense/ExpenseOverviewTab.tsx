/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
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
  const categoryData =
    expenseOverview?.map((cat) => ({
      name: cat.name,
      allocated: parseFloat(cat.allocated_amount || 0),
      spent: parseFloat(cat.spent || 0),
    })) || [];

  const categoriesWithSpend = categoryData.filter((c) => c.spent > 0);

  const pieData = categoriesWithSpend.map((cat, i) => ({
    name: cat.name,
    value: cat.spent,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="section-title mb-4">Spending by Category</h3>
        <div className="flex flex-col sm:flex-row gap-4 min-h-0">
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center w-full">No spending recorded by category yet.</p>
          ) : (
            <>
              <div className="w-full sm:w-[min(100%,220px)] shrink-0 mx-auto sm:mx-0 h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={88}
                      dataKey="value"
                      label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color ?? ''} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 min-w-0 max-h-[min(50vh,280px)] sm:max-h-[280px] overflow-y-auto overscroll-contain pr-1 border-t sm:border-t-0 sm:border-l border-gray-100 pt-3 sm:pt-0 sm:pl-4">
                <ul className="space-y-2 text-sm">
                  {pieData.map((entry, index) => (
                    <li key={`${entry.name}-${index}`} className="flex items-start gap-2 min-w-0">
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: entry.color }}
                        aria-hidden
                      />
                      <span className="flex-1 min-w-0 text-gray-700 break-words">{entry.name}</span>
                      <span className="shrink-0 tabular-nums text-maroon-800 font-medium">
                        {formatCurrency(entry.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="section-title mb-4">Allocated vs Spent</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={categoryData} layout="vertical">
            <XAxis type="number" tickFormatter={(v: number) => `₹${v / 100000}L`} />
            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: any) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="allocated" fill="#D4AF37" name="Allocated" />
            <Bar dataKey="spent" fill="#8B0000" name="Spent" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
