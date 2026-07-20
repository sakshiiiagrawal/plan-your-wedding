import { supabase } from '../config/database';
import type { TaskInsert, TaskRow } from '../../../shared/src';
import { toValidPage, toValidPerPage } from '../shared/utils/pagination.utils';

export interface TaskFilters {
  status?: string | undefined;
  priority?: string | undefined;
  event_id?: string | undefined;
  assigned_to?: string | undefined;
  search?: string | undefined;
}

export interface TaskListOptions extends TaskFilters {
  page?: number | undefined;
  per_page?: number | undefined;
}

export async function findAllByOwner(ownerId: string, options: TaskListOptions) {
  let query = supabase
    .from('tasks')
    .select('*, events(name)', { count: 'exact' })
    .eq('user_id', ownerId);

  if (options.status && options.status !== 'all') query = query.eq('status', options.status);
  if (options.priority && options.priority !== 'all')
    query = query.eq('priority', options.priority);
  if (options.event_id) query = query.eq('event_id', options.event_id);
  if (options.assigned_to) query = query.eq('assigned_to', options.assigned_to);
  if (options.search?.trim()) query = query.ilike('title', `%${options.search.trim()}%`);

  query = query.order('due_date', { ascending: true });

  const requestedPage = toValidPage(options.page);
  const requestedPerPage = toValidPerPage(options.per_page);
  const shouldPaginate = requestedPage !== undefined || requestedPerPage !== undefined;
  if (shouldPaginate) {
    const perPage = requestedPerPage ?? 20;
    const page = requestedPage ?? 1;
    const from = (page - 1) * perPage;
    query = query.range(from, from + perPage - 1);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0, paginated: shouldPaginate };
}

export async function findOverdue(ownerId: string, today: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, events(name)')
    .eq('user_id', ownerId)
    .lt('due_date', today)
    .in('status', ['pending', 'in_progress'])
    .order('due_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function findUpcoming(ownerId: string, today: string, nextWeek: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, events(name)')
    .eq('user_id', ownerId)
    .gte('due_date', today)
    .lte('due_date', nextWeek)
    .in('status', ['pending', 'in_progress'])
    .order('due_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Feed candidates for the reminders bell/digest — every open task; the fire
// date arithmetic (COALESCE(reminder_date, due_date - offset)) happens in TS.
// ponytail: no date pre-filter — task tables are hundreds of rows, not millions.
export async function findOpenForReminders(ownerId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, due_date, reminder_offset_days, reminder_date, reminder_repeat')
    .eq('user_id', ownerId)
    .in('status', ['pending', 'in_progress']);
  if (error) throw error;
  return data ?? [];
}

export async function findByIdAndOwner(id: string, ownerId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, events(*)')
    .eq('id', id)
    .eq('user_id', ownerId)
    .single();
  if (error) throw error;
  return data;
}

export async function findRecentDuplicate(
  ownerId: string,
  title: string,
  dueDate: string | null | undefined,
  sinceIso: string,
): Promise<TaskRow | null> {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', ownerId)
    .eq('title', title)
    .gte('created_at', sinceIso);
  query = dueDate ? query.eq('due_date', dueDate) : query.is('due_date', null);

  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data?.[0] as TaskRow | undefined) ?? null;
}

export async function insertTask(payload: TaskInsert): Promise<TaskRow> {
  const { data, error } = await supabase.from('tasks').insert([payload]).select().single();
  if (error) throw error;
  return data as TaskRow;
}

export async function updateTask(
  id: string,
  ownerId: string,
  payload: Partial<TaskInsert>,
): Promise<TaskRow> {
  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', id)
    .eq('user_id', ownerId)
    .select()
    .single();
  if (error) throw error;
  return data as TaskRow;
}

export async function deleteTask(id: string, ownerId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', ownerId);
  if (error) throw error;
}

export async function findStatsByOwner(ownerId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('status, due_date')
    .eq('user_id', ownerId);
  if (error) throw error;
  return data ?? [];
}
