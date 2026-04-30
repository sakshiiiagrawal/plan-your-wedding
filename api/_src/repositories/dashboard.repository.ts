import { supabase } from '../config/database';

export async function findHeroContent(ownerId: string) {
  const { data } = await supabase
    .from('website_content')
    .select('content')
    .eq('section_name', 'hero')
    .eq('user_id', ownerId)
    .single();
  return data;
}

export async function findGuestSides(ownerId: string) {
  const { data } = await supabase.from('guests').select('id, side').eq('user_id', ownerId);
  return data ?? [];
}

export async function findRsvpStatuses(ownerId: string) {
  const { data } = await supabase
    .from('guest_event_rsvp')
    .select('rsvp_status, guests!inner(user_id)')
    .eq('guests.user_id', ownerId);
  return data ?? [];
}

export async function findTaskStatuses(ownerId: string) {
  const { data } = await supabase.from('tasks').select('status').eq('user_id', ownerId);
  return data ?? [];
}

export async function findExpenseSummary(ownerId: string) {
  const { data } = await supabase
    .from('expense_summary')
    .select('*')
    .eq('user_id', ownerId)
    .single();
  return data;
}

export async function findExpenseAmounts(ownerId: string) {
  const { data } = await supabase.from('expenses').select('amount').eq('user_id', ownerId);
  return data ?? [];
}

export async function findUpcomingEvents(ownerId: string) {
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', ownerId)
    .order('event_date', { ascending: true });
  return data ?? [];
}

export async function findUpcomingTasks(ownerId: string) {
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', ownerId)
    .in('status', ['pending', 'in_progress'])
    .order('due_date', { ascending: true })
    .limit(5);
  return data ?? [];
}

export async function findPendingPayments(ownerId: string) {
  const { data } = await supabase
    .from('payments')
    .select('*, vendors(name)')
    .eq('user_id', ownerId)
    .eq('status', 'pending')
    .limit(5);
  return data ?? [];
}
