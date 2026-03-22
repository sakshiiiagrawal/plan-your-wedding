export const EXPENSE_QUERY_KEYS = {
  all: ['expense'] as const,
  summary: ['expense', 'summary'] as const,
  overview: ['expense', 'overview'] as const,
  byCategory: ['expense', 'by-category'] as const,
  bySide: ['expense', 'by-side'] as const,
  categories: ['expense', 'categories'] as const,
  categoryTree: ['expense', 'categories', 'tree'] as const,
  expenses: (filters: Record<string, string> = {}) => ['expense', 'expenses', filters] as const,
  expensesByCategoryTree: ['expense', 'expenses', 'by-category-tree'] as const,
  vendorSummary: ['expense', 'vendors', 'summary'] as const,
  vendorsBySide: ['expense', 'vendors', 'by-side'] as const,
  sideSummary: ['expense', 'side-summary'] as const,
} as const;

export {
  useExpenseSummary,
  useExpenseOverview,
  useExpenseByCategory,
  useExpenseBySide,
  useExpenseCategories,
  useCategoryTree,
  useExpenses,
  useExpensesByCategoryTree,
  useVendorExpenseSummary,
  useVendorsBySide,
  useSideSummary,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useCreateCustomCategory,
} from '../../../hooks/useApi';

export type { ExpenseSummary, SideSummary } from '../../../hooks/useApi';
