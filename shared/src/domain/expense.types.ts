import type { TableRow, TableInsert } from '../supabase.generated';
import type { VendorRow } from './vendor.types';

// ---------------------------------------------------------------------------
// Raw DB rows
// ---------------------------------------------------------------------------

export type ExpenseCategoryRow = TableRow<'expense_categories'>;
export type ExpenseCategoryInsert = TableInsert<'expense_categories'>;

export type ExpenseRow = TableRow<'expenses'>;
export type ExpenseInsert = TableInsert<'expenses'>;

export type PaymentRow = TableRow<'payments'>;
export type PaymentInsert = TableInsert<'payments'>;

export type ExpenseSummaryRow = TableRow<'expense_summary'>;
export type ExpenseSummaryInsert = TableInsert<'expense_summary'>;

// ---------------------------------------------------------------------------
// Derived / joined types
// ---------------------------------------------------------------------------

/** An expense with its category and vendor eagerly loaded. */
export interface ExpenseWithDetails extends ExpenseRow {
  category: ExpenseCategoryRow | null;
  vendor: VendorRow | null;
}
