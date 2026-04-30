import { supabase } from '../config/database';
import type {
  ExpenseCategoryInsert,
  ExpenseCategoryRow,
  ExpenseInsert,
  ExpenseRow,
  ExpenseSummaryInsert,
  ExpenseSummaryRow,
} from '@wedding-planner/shared';

// ---------------------------------------------------------------------------
// Expense summary
// ---------------------------------------------------------------------------

export async function findSummaryByOwner(ownerId: string): Promise<ExpenseSummaryRow | null> {
  const { data } = await supabase
    .from('expense_summary')
    .select('*')
    .eq('user_id', ownerId)
    .single();
  return data as ExpenseSummaryRow | null;
}

export async function upsertSummary(
  ownerId: string,
  payload: Omit<ExpenseSummaryInsert, 'user_id'>,
): Promise<ExpenseSummaryRow> {
  const { data, error } = await supabase
    .from('expense_summary')
    .upsert({ ...payload, user_id: ownerId }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data as ExpenseSummaryRow;
}

// ---------------------------------------------------------------------------
// Expense categories
// ---------------------------------------------------------------------------

export async function findCategoriesByOwner(ownerId: string): Promise<ExpenseCategoryRow[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('user_id', ownerId)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ExpenseCategoryRow[];
}

export async function findCategoryByIdAndOwner(
  id: string,
  ownerId: string,
): Promise<ExpenseCategoryRow | null> {
  const { data } = await supabase
    .from('expense_categories')
    .select('id')
    .eq('id', id)
    .eq('user_id', ownerId)
    .single();
  return data as ExpenseCategoryRow | null;
}

export async function findMaxDisplayOrder(
  ownerId: string,
  parentCategoryId: string | null,
): Promise<number> {
  const query = supabase
    .from('expense_categories')
    .select('display_order')
    .eq('user_id', ownerId)
    .order('display_order', { ascending: false })
    .limit(1);

  const { data } = parentCategoryId
    ? await query.eq('parent_category_id', parentCategoryId)
    : await query.is('parent_category_id', null);

  return (data?.[0]?.display_order ?? 0) + 1;
}

export async function insertCategory(payload: ExpenseCategoryInsert): Promise<ExpenseCategoryRow> {
  const { data, error } = await supabase
    .from('expense_categories')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data as ExpenseCategoryRow;
}

export async function updateCategory(
  id: string,
  ownerId: string,
  payload: Partial<ExpenseCategoryInsert>,
): Promise<ExpenseCategoryRow> {
  const { data, error } = await supabase
    .from('expense_categories')
    .update(payload)
    .eq('id', id)
    .eq('user_id', ownerId)
    .select()
    .single();
  if (error) throw error;
  return data as ExpenseCategoryRow;
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export interface ExpenseFilters {
  category_id?: string | undefined;
  vendor_id?: string | undefined;
  event_id?: string | undefined;
  side?: string | undefined;
}

export async function findExpensesByOwner(ownerId: string, filters: ExpenseFilters) {
  let query = supabase
    .from('expenses')
    .select('*, expense_categories(name), vendors(name), events(name)')
    .eq('user_id', ownerId);

  if (filters.category_id) query = query.eq('category_id', filters.category_id);
  if (filters.vendor_id) query = query.eq('vendor_id', filters.vendor_id);
  if (filters.event_id) query = query.eq('event_id', filters.event_id);
  if (filters.side) query = query.eq('side', filters.side);

  const { data, error } = await query.order('expense_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function findExpenseByIdAndOwner(id: string, ownerId: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, expense_categories(*), vendors(*), events(*)')
    .eq('id', id)
    .eq('user_id', ownerId)
    .single();
  if (error) throw error;
  return data;
}

export async function findExpensesAmountByOwner(ownerId: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('amount, side')
    .eq('user_id', ownerId);
  if (error) throw error;
  return data ?? [];
}

export async function findExpensesBySideDetail(ownerId: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, expense_categories(name)')
    .eq('user_id', ownerId)
    .order('expense_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function findExpensesForSideSummary(ownerId: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('amount, side, is_shared, share_percentage')
    .eq('user_id', ownerId);
  if (error) throw error;
  return data ?? [];
}

export async function findExpensesForCategoryGrouping(ownerId: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('category_id, amount, expense_categories(name)')
    .eq('user_id', ownerId);
  if (error) throw error;
  return data ?? [];
}

export async function findExpensesForVendorGrouping(ownerId: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('vendor_id, amount, vendors(name)')
    .eq('user_id', ownerId);
  if (error) throw error;
  return data ?? [];
}

export async function findExpensesWithCategoryTree(ownerId: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, expense_categories(id, name, parent_category_id)')
    .eq('user_id', ownerId)
    .order('expense_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertExpense(payload: ExpenseInsert): Promise<ExpenseRow> {
  const { data, error } = await supabase.from('expenses').insert([payload]).select().single();
  if (error) throw error;
  return data as ExpenseRow;
}

export async function updateExpense(
  id: string,
  ownerId: string,
  payload: Partial<ExpenseInsert>,
): Promise<ExpenseRow> {
  const { data, error } = await supabase
    .from('expenses')
    .update(payload)
    .eq('id', id)
    .eq('user_id', ownerId)
    .select()
    .single();
  if (error) throw error;
  return data as ExpenseRow;
}

export async function deleteExpense(id: string, ownerId: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id).eq('user_id', ownerId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Vendor expense helpers (re-used from vendors table)
// ---------------------------------------------------------------------------

export async function findVendorCostsForSideSummary(ownerId: string) {
  const { data, error } = await supabase
    .from('vendors')
    .select('total_cost, side, is_shared')
    .eq('user_id', ownerId);
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Payments (unified — vendor + venue)
// ---------------------------------------------------------------------------

export async function findPaymentsByOwner(ownerId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*, vendors(name, category), venues(name)')
    .eq('user_id', ownerId)
    .order('payment_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function findActualPaymentsTotalByOwner(ownerId: string): Promise<number> {
  const { data, error } = await supabase
    .from('payments')
    .select('amount')
    .eq('user_id', ownerId)
    .eq('is_planned', false);
  if (error) throw error;
  return (data ?? []).reduce((s, p) => s + parseFloat(String(p.amount ?? 0)), 0);
}

export async function findVendorPaymentSumsForOutstanding(ownerId: string) {
  // Returns per-vendor sum of actual (non-planned) payments
  const { data, error } = await supabase
    .from('payments')
    .select('vendor_id, amount')
    .eq('user_id', ownerId)
    .eq('is_planned', false)
    .not('vendor_id', 'is', null);
  if (error) throw error;
  const sums: Record<string, number> = {};
  (data ?? []).forEach((p) => {
    if (p.vendor_id)
      sums[p.vendor_id] = (sums[p.vendor_id] ?? 0) + parseFloat(String(p.amount ?? 0));
  });
  return sums;
}

export async function findVenuePaymentSumsForOutstanding(ownerId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('venue_id, amount')
    .eq('user_id', ownerId)
    .eq('is_planned', false)
    .not('venue_id', 'is', null);
  if (error) throw error;
  const sums: Record<string, number> = {};
  (data ?? []).forEach((p) => {
    if (p.venue_id) sums[p.venue_id] = (sums[p.venue_id] ?? 0) + parseFloat(String(p.amount ?? 0));
  });
  return sums;
}

export async function findVendorsForOutstanding(ownerId: string) {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, total_cost, side')
    .eq('user_id', ownerId);
  if (error) throw error;
  return data ?? [];
}

export async function findVenuesForOutstanding(ownerId: string) {
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, total_cost')
    .eq('user_id', ownerId);
  if (error) throw error;
  return data ?? [];
}

export async function findUpcomingPlannedPayments(ownerId: string, withinDays: number) {
  const today = new Date();
  const future = new Date(today);
  future.setDate(today.getDate() + withinDays);
  const { data, error } = await supabase
    .from('payments')
    .select('*, vendors(name), venues(name)')
    .eq('user_id', ownerId)
    .eq('is_planned', true)
    .gte('payment_date', today.toISOString().split('T')[0])
    .lte('payment_date', future.toISOString().split('T')[0]);
  if (error) throw error;
  return data ?? [];
}

export async function findOverduePlannedPayments(ownerId: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('payments')
    .select('*, vendors(name), venues(name)')
    .eq('user_id', ownerId)
    .eq('is_planned', true)
    .lt('payment_date', today);
  if (error) throw error;
  return data ?? [];
}

export async function findExpensesAmountWithSharedByOwner(ownerId: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('amount, side, is_shared, share_percentage')
    .eq('user_id', ownerId);
  if (error) throw error;
  return data ?? [];
}
