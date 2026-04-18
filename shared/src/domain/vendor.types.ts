import type { ExpenseBalanceSummary, ExpenseWithDetails } from './expense.types';

export interface VendorRow {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  is_confirmed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface VendorInsert {
  user_id: string;
  name: string;
  category_id?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  is_confirmed?: boolean;
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface VendorWithFinance extends VendorRow {
  expense_id: string | null;
  finance_summary: ExpenseBalanceSummary | null;
  finance: ExpenseWithDetails | null;
}
