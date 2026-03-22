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
