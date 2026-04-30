interface CategoryAnalysisItem {
  name: string;
  committed: number;
  paid: number;
  outstanding: number;
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
  const grandTotal = categoryAnalysis.reduce((sum, category) => sum + category.committed, 0);
  const top = categoryAnalysis.slice(0, TOP_N);
  const othersTotal = categoryAnalysis
    .slice(TOP_N)
    .reduce((sum, category) => sum + category.committed, 0);

  if (loading) {
    return <div className="card p-8 text-center text-gray-500">Loading category analysis...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="section-title">Top Categories</h3>
          <span className="text-sm text-gray-500">
            Committed:{' '}
            <span className="font-semibold text-maroon-800">{formatCurrency(grandTotal)}</span>
          </span>
        </div>

        {categoryAnalysis.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            No category finance data available.
          </div>
        ) : (
          <div className="space-y-4">
            {top.map((category, index) => {
              const percentage = grandTotal > 0 ? (category.committed / grandTotal) * 100 : 0;
              const isOverBudget =
                category.allocated > 0 && category.committed > category.allocated;
              const isNearBudget =
                category.allocated > 0 &&
                !isOverBudget &&
                category.committed / category.allocated >= 0.8;

              return (
                <div key={`${category.name}-${index}`} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-gray-400 w-4 shrink-0">
                        #{index + 1}
                      </span>
                      <span className="font-medium text-gray-800 truncate">{category.name}</span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="font-semibold text-maroon-800">
                        {formatCurrency(category.committed)}
                      </div>
                      <div className="text-xs text-gray-400">{percentage.toFixed(1)}%</div>
                    </div>
                  </div>

                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isOverBudget
                          ? 'bg-red-500'
                          : isNearBudget
                            ? 'bg-amber-500'
                            : 'bg-maroon-700'
                      }`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>

                  <div className="mt-2 grid sm:grid-cols-4 gap-2 text-xs text-gray-500">
                    <span>Paid: {formatCurrency(category.paid)}</span>
                    <span>Outstanding: {formatCurrency(category.outstanding)}</span>
                    <span>Items: {category.count}</span>
                    <span>
                      Budget:{' '}
                      {category.allocated > 0 ? formatCurrency(category.allocated) : 'Not set'}
                    </span>
                  </div>
                </div>
              );
            })}

            {categoryAnalysis.length > TOP_N && (
              <div className="pt-3 border-t border-gray-100 text-sm text-gray-500 flex justify-between">
                <span>Other categories</span>
                <span className="font-medium text-gray-700">{formatCurrency(othersTotal)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
