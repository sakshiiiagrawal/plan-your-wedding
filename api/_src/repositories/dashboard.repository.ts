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

export async function findRecentActivity(ownerId: string) {
  const [guests, vendors, tasksCompleted, payments] = await Promise.all([
    supabase
      .from('guests')
      .select(
        'id, first_name, last_name, side, created_at, created_by, users!guests_created_by_fkey(name)',
      )
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('vendors')
      .select('id, name, created_at, created_by, users!vendors_created_by_fkey(name)')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('tasks')
      .select('id, title, updated_at, updated_by, users!tasks_updated_by_fkey(name)')
      .eq('user_id', ownerId)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('payments')
      .select('id, amount, created_at, vendors!inner(name, user_id)')
      .eq('vendors.user_id', ownerId)
      .not('vendor_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  // Collect unique actor user IDs that don't have a name from the join (legacy rows or null created_by)
  const actorIds = new Set<string>();
  for (const g of guests.data ?? []) {
    if (g.created_by && !(g as Record<string, unknown>)['users']) actorIds.add(g.created_by);
  }
  for (const v of vendors.data ?? []) {
    if (v.created_by && !(v as Record<string, unknown>)['users']) actorIds.add(v.created_by);
  }
  for (const t of tasksCompleted.data ?? []) {
    if (t.updated_by && !(t as Record<string, unknown>)['users']) actorIds.add(t.updated_by);
  }

  let userMap: Record<string, string> = {};
  if (actorIds.size > 0) {
    const { data: userRows } = await supabase
      .from('users')
      .select('id, name')
      .in('id', Array.from(actorIds));
    for (const u of userRows ?? []) {
      userMap[u.id] = u.name;
    }
  }

  function resolveActorName(row: Record<string, unknown>, actorIdField: string): string | null {
    const joinedUser = row['users'] as { name?: string } | null;
    if (joinedUser?.name) return joinedUser.name;
    const actorId = row[actorIdField] as string | null;
    if (actorId && userMap[actorId]) return userMap[actorId];
    return null;
  }

  return {
    guests: (guests.data ?? []).map((g) => ({
      ...g,
      actor_name: resolveActorName(g as Record<string, unknown>, 'created_by'),
    })),
    vendors: (vendors.data ?? []).map((v) => ({
      ...v,
      actor_name: resolveActorName(v as Record<string, unknown>, 'created_by'),
    })),
    tasksCompleted: (tasksCompleted.data ?? []).map((t) => ({
      ...t,
      actor_name: resolveActorName(t as Record<string, unknown>, 'updated_by'),
    })),
    payments: payments.data ?? [],
  };
}
