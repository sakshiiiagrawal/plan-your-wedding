import { supabase } from '../config/database';
import type {
  ExpenseCategoryInsert,
  ExpenseCategoryRow,
  ExpenseSummaryInsert,
  ExpenseSummaryRow,
} from '../../../shared/src';

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

