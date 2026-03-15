import type { TableRow, TableInsert } from '../supabase.generated';
import type { VendorRow } from './vendor.types';

// ---------------------------------------------------------------------------
// Raw DB rows
// ---------------------------------------------------------------------------

export type BudgetCategoryRow = TableRow<'budget_categories'>;
export type BudgetCategoryInsert = TableInsert<'budget_categories'>;

export type ExpenseRow = TableRow<'expenses'>;
export type ExpenseInsert = TableInsert<'expenses'>;

export type PaymentRow = TableRow<'payments'>;
export type PaymentInsert = TableInsert<'payments'>;

export type BudgetSummaryRow = TableRow<'budget_summary'>;
export type BudgetSummaryInsert = TableInsert<'budget_summary'>;

// ---------------------------------------------------------------------------
// Derived / joined types
// ---------------------------------------------------------------------------

/** An expense with its category and vendor eagerly loaded. */
export interface ExpenseWithDetails extends ExpenseRow {
  category: BudgetCategoryRow | null;
  vendor: VendorRow | null;
}
