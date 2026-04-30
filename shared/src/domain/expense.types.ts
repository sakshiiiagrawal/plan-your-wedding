import type { TableRow, TableInsert } from '../supabase.generated';
import type { PaymentMethod } from '../enums/expense.enums';

export type ExpenseCategoryRow = TableRow<'expense_categories'>;
export type ExpenseCategoryInsert = TableInsert<'expense_categories'>;
export type ExpenseSummaryRow = TableRow<'expense_summary'>;
export type ExpenseSummaryInsert = TableInsert<'expense_summary'>;

export type FinanceSourceType = 'manual' | 'vendor' | 'venue';
export type FinanceHeaderStatus = 'active' | 'closed' | 'terminated';
export type FinanceItemSide = 'bride' | 'groom' | 'shared';
export type FinancePaymentDirection = 'outflow' | 'inflow';
export type FinancePaymentStatus =
  | 'scheduled'
  | 'posted'
  | 'cancelled'
  | 'entered_in_error';
export type FinancePaidBySide = 'bride' | 'groom' | 'shared';
export type FinanceActivityEntityType =
  | 'expense'
  | 'expense_item'
  | 'payment'
  | 'payment_allocation';
export type FinanceActivityActionType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'cancelled'
  | 'status_changed'
  | 'reallocated'
  | 'entered_in_error';

export interface ExpenseRow {
  id: string;
  user_id: string;
  source_type: FinanceSourceType;
  source_id: string | null;
  description: string;
  expense_date: string;
  notes: string | null;
  status: FinanceHeaderStatus;
  created_at: string;
  updated_at: string;
}

export interface ExpenseInsert {
  user_id: string;
  source_type?: FinanceSourceType;
  source_id?: string | null;
  description: string;
  expense_date: string;
  notes?: string | null;
  status?: FinanceHeaderStatus;
}

export interface ExpenseItemRow {
  id: string;
  expense_id: string;
  category_id: string;
  event_id: string | null;
  description: string;
  amount: number;
  side: FinanceItemSide;
  bride_share_percentage: number | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseItemInput {
  id?: string;
  category_id: string;
  event_id?: string | null;
  description: string;
  amount: number;
  side: FinanceItemSide;
  bride_share_percentage?: number | null;
  display_order?: number;
}

export interface PaymentRow {
  id: string;
  expense_id: string;
  amount: number;
  direction: FinancePaymentDirection;
  status: FinancePaymentStatus;
  due_date: string | null;
  paid_date: string | null;
  payment_method: PaymentMethod | null;
  paid_by_side: FinancePaidBySide | null;
  paid_bride_share_percentage: number | null;
  transaction_reference: string | null;
  notes: string | null;
  reverses_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentInsert {
  expense_id: string;
  amount: number;
  direction?: FinancePaymentDirection;
  status: FinancePaymentStatus;
  due_date?: string | null;
  paid_date?: string | null;
  payment_method?: PaymentMethod | null;
  paid_by_side?: FinancePaidBySide | null;
  paid_bride_share_percentage?: number | null;
  transaction_reference?: string | null;
  notes?: string | null;
  reverses_payment_id?: string | null;
}

export interface PaymentAllocationRow {
  id: string;
  payment_id: string;
  expense_item_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocationInput {
  expense_item_id: string;
  amount: number;
}

export interface FinanceActivityRow {
  id: string;
  expense_id: string;
  entity_type: FinanceActivityEntityType;
  entity_id: string;
  action_type: FinanceActivityActionType;
  before_state: unknown;
  after_state: unknown;
  actor_user_id: string;
  created_at: string;
}

export interface ExpenseBalanceSummary {
  committed_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  planned_amount?: number;
}

export interface ExpenseWithDetails extends ExpenseRow {
  items: ExpenseItemRow[];
  payments: PaymentRow[];
  allocations: PaymentAllocationRow[];
  summary: ExpenseBalanceSummary;
  source_name?: string | null;
}
