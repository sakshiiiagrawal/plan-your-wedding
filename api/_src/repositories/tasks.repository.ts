import { supabase } from '../config/database';
import type { TaskInsert, TaskRow } from '@wedding-planner/shared';

export interface TaskFilters {
  status?: string | undefined;
  priority?: string | undefined;
  event_id?: string | undefined;
  assigned_to?: string | undefined;
}

export async function findAllByOwner(ownerId: string, filters: TaskFilters) {
  let query = supabase.from('tasks').select('*, events(name)').eq('user_id', ownerId);

  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.priority && filters.priority !== 'all')
    query = query.eq('priority', filters.priority);
  if (filters.event_id) query = query.eq('event_id', filters.event_id);
  if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to);

  const { data, error } = await query.order('due_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
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
