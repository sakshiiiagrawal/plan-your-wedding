export const BUDGET_QUERY_KEYS = {
  all: ['budget'] as const,
  summary: ['budget', 'summary'] as const,
  overview: ['budget', 'overview'] as const,
  byCategory: ['budget', 'by-category'] as const,
  bySide: ['budget', 'by-side'] as const,
  categories: ['budget', 'categories'] as const,
  categoryTree: ['budget', 'categories', 'tree'] as const,
  expenses: (filters: Record<string, string> = {}) => ['budget', 'expenses', filters] as const,
  expensesByCategoryTree: ['budget', 'expenses', 'by-category-tree'] as const,
  vendorSummary: ['budget', 'vendors', 'summary'] as const,
  vendorsBySide: ['budget', 'vendors', 'by-side'] as const,
  sideSummary: ['budget', 'side-summary'] as const,
} as const;

export {
  useBudgetSummary,
  useBudgetOverview,
  useBudgetByCategory,
  useBudgetBySide,
  useBudgetCategories,
  useCategoryTree,
  useExpenses,
  useExpensesByCategoryTree,
  useVendorBudgetSummary,
  useVendorsBySide,
  useSideSummary,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useCreateCustomCategory,
} from '../../../hooks/useApi';

export type { BudgetSummary, SideSummary } from '../../../hooks/useApi';
