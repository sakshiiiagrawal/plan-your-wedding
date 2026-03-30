interface CategoryAnalysisItem {
  name: string;
  total: number;
  bride: number;
  groom: number;
  shared: number;
  count: number;
  allocated: number;
}

interface ExpenseCategoriesTabProps {
  categoryAnalysis: CategoryAnalysisItem[];
  loading: boolean;
  formatCurrency: (amount: number) => string;
}

const TOP_N = 6;

export default function ExpenseCategoriesTab({
  categoryAnalysis,
  loading,
  formatCurrency,
}: ExpenseCategoriesTabProps) {
  const grandTotal = categoryAnalysis.reduce((s, c) => s + c.total, 0);
  const top = categoryAnalysis.slice(0, TOP_N);
  const othersTotal = categoryAnalysis.slice(TOP_N).reduce((s, c) => s + c.total, 0);

  return (
    <div className="space-y-6">
      {/* Top categories spend breakdown */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="section-title">Top Spending Categories</h3>
          <span className="text-sm text-gray-500">
            Total: <span className="font-semibold text-maroon-800">{formatCurrency(grandTotal)}</span>
          </span>
        </div>

        {categoryAnalysis.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No expense data available.</div>
        ) : (
          <div className="space-y-4">
            {top.map((cat, i) => {
              const pct = grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0;
              const brideW = cat.total > 0 ? (cat.bride / cat.total) * 100 : 0;
              const groomW = cat.total > 0 ? (cat.groom / cat.total) * 100 : 0;
              const sharedW = cat.total > 0 ? (cat.shared / cat.total) * 100 : 0;
              const isOver = cat.allocated > 0 && cat.total > cat.allocated;
              const isNear = cat.allocated > 0 && !isOver && cat.total / cat.allocated >= 0.8;

              return (
                <div key={i} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-gray-400 w-4 shrink-0">#{i + 1}</span>
                      <span className="font-medium text-gray-800 truncate">{cat.name}</span>
                      {isOver && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded shrink-0">Over budget</span>
                      )}
                      {isNear && (
                        <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded shrink-0">
                          {Math.round((cat.total / cat.allocated) * 100)}% of budget
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>
                      <span className="font-semibold text-maroon-800 text-sm">{formatCurrency(cat.total)}</span>
                    </div>
                  </div>

                  {/* Stacked bar */}
                  <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                    {brideW > 0 && (
                      <div style={{ width: `${brideW}%` }} className="bg-pink-400" title={`Bride: ${formatCurrency(cat.bride)}`} />
                    )}
                    {groomW > 0 && (
                      <div style={{ width: `${groomW}%` }} className="bg-blue-400" title={`Groom: ${formatCurrency(cat.groom)}`} />
                    )}
                    {sharedW > 0 && (
                      <div style={{ width: `${sharedW}%` }} className="bg-yellow-400" title={`Shared: ${formatCurrency(cat.shared)}`} />
                    )}
                  </div>

                  {/* Side amounts — shown on hover via group */}
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    {cat.bride > 0 && <span className="text-pink-500">Bride {formatCurrency(cat.bride)}</span>}
                    {cat.groom > 0 && <span className="text-blue-500">Groom {formatCurrency(cat.groom)}</span>}
                    {cat.shared > 0 && <span style={{ color: '#B8962E' }}>Shared {formatCurrency(cat.shared)}</span>}
                    <span className="ml-auto">{cat.count} expense{cat.count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              );
            })}

            {othersTotal > 0 && (
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-400">
                <span>+{categoryAnalysis.length - TOP_N} more categories</span>
                <span className="font-medium text-gray-600">{formatCurrency(othersTotal)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full category table */}
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
                    <td className="p-4 font-medium text-maroon-800">
                      <div className="flex items-center gap-2">
                        {cat.name}
                        {cat.allocated > 0 && cat.total > cat.allocated && (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">Over budget</span>
                        )}
                        {cat.allocated > 0 && cat.total <= cat.allocated && cat.total / cat.allocated >= 0.8 && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">
                            {Math.round((cat.total / cat.allocated) * 100)}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right text-pink-700">{formatCurrency(cat.bride)}</td>
                    <td className="p-4 text-right text-blue-700">{formatCurrency(cat.groom)}</td>
                    <td className="p-4 text-right" style={{ color: '#B8962E' }}>
                      {formatCurrency(cat.shared)}
                    </td>
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
                <td />
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
