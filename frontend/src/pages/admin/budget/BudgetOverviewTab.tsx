/* eslint-disable @typescript-eslint/no-explicit-any */
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const COLORS = ['#8B0000', '#D4AF37', '#228B22', '#1A237E', '#E91E63', '#FF6F00', '#607D8B'];

interface BudgetOverviewTabProps {
  budgetOverview: any[] | undefined;
  formatCurrency: (amount: number) => string;
}

export default function BudgetOverviewTab({ budgetOverview, formatCurrency }: BudgetOverviewTabProps) {
  const categoryData = budgetOverview?.map(cat => ({
    name: cat.name,
    allocated: parseFloat(cat.allocated_amount || 0),
    spent: parseFloat(cat.spent || 0),
  })) || [];

  const pieData = categoryData.map((cat, i) => ({
    name: cat.name,
    value: cat.spent,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="section-title mb-4">Spending by Category</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any) => formatCurrency(value)} />
          </PieChart>
        </ResponsiveContainer>
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
