/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface CategoryAnalysisItem {
  name: string;
  total: number;
  bride: number;
  groom: number;
  shared: number;
  count: number;
}

interface BudgetCategoriesTabProps {
  categoryAnalysis: CategoryAnalysisItem[];
  loading: boolean;
  formatCurrency: (amount: number) => string;
}

export default function BudgetCategoriesTab({ categoryAnalysis, loading, formatCurrency }: BudgetCategoriesTabProps) {
  const categoryBarData = categoryAnalysis.map((cat) => ({
    name: cat.name,
    bride: cat.bride,
    groom: cat.groom,
    shared: cat.shared,
  }));

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="section-title mb-4">Category Spending by Side</h3>
        {categoryAnalysis.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={categoryBarData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => `₹${(v / 100000).toFixed(1)}L`} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="bride" fill="#EC4899" name="Bride Side" stackId="a" />
              <Bar dataKey="groom" fill="#3B82F6" name="Groom Side" stackId="a" />
              <Bar dataKey="shared" fill="#D4AF37" name="Shared" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="p-8 text-center text-gray-500">No expense data available.</div>
        )}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="p-4 border-b border-gold-200">
          <h3 className="section-title">Category Breakdown</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading categories...</div>
        ) : categoryAnalysis.length > 0 ? (
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="text-left p-4">Category</th>
                <th className="text-right p-4">Bride Side</th>
                <th className="text-right p-4">Groom Side</th>
                <th className="text-right p-4">Shared</th>
                <th className="text-right p-4">Total</th>
                <th className="text-left p-4">Distribution</th>
              </tr>
            </thead>
            <tbody>
              {categoryAnalysis.map((cat, i) => {
                const brideWidth = cat.total > 0 ? (cat.bride / cat.total) * 100 : 0;
                const groomWidth = cat.total > 0 ? (cat.groom / cat.total) * 100 : 0;
                const sharedWidth = cat.total > 0 ? (cat.shared / cat.total) * 100 : 0;
                return (
                  <tr key={i} className="table-row">
                    <td className="p-4 font-medium text-maroon-800">{cat.name}</td>
                    <td className="p-4 text-right text-pink-700">{formatCurrency(cat.bride)}</td>
                    <td className="p-4 text-right text-blue-700">{formatCurrency(cat.groom)}</td>
                    <td className="p-4 text-right" style={{ color: '#B8962E' }}>{formatCurrency(cat.shared)}</td>
                    <td className="p-4 text-right font-semibold">{formatCurrency(cat.total)}</td>
                    <td className="p-4 w-40">
                      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                        <div style={{ width: `${brideWidth}%` }} className="bg-pink-500" title={`Bride: ${brideWidth.toFixed(0)}%`} />
                        <div style={{ width: `${groomWidth}%` }} className="bg-blue-500" title={`Groom: ${groomWidth.toFixed(0)}%`} />
                        <div style={{ width: `${sharedWidth}%` }} className="bg-yellow-400" title={`Shared: ${sharedWidth.toFixed(0)}%`} />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {cat.count} expense{cat.count !== 1 ? 's' : ''}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td className="p-4">Total</td>
                <td className="p-4 text-right text-pink-700">
                  {formatCurrency(categoryAnalysis.reduce((s, c) => s + c.bride, 0))}
                </td>
                <td className="p-4 text-right text-blue-700">
                  {formatCurrency(categoryAnalysis.reduce((s, c) => s + c.groom, 0))}
                </td>
                <td className="p-4 text-right" style={{ color: '#B8962E' }}>
                  {formatCurrency(categoryAnalysis.reduce((s, c) => s + c.shared, 0))}
                </td>
                <td className="p-4 text-right">
                  {formatCurrency(categoryAnalysis.reduce((s, c) => s + c.total, 0))}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-500">No expenses categorized yet.</div>
        )}
      </div>
    </div>
  );
}
