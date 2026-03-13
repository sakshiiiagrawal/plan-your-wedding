import { supabase } from '../config/database';
import type {
  GuestInsert,
  GuestRow,
  GuestGroupInsert,
  GuestGroupRow,
  GuestEventRsvpInsert,
} from '@wedding-planner/shared';
import type { ParsedGuest } from '../excel/guests.excel';

// ---------------------------------------------------------------------------
// Joined types
// ---------------------------------------------------------------------------

export interface GuestListItem extends GuestRow {
  guest_groups: { name: string } | null;
  room_allocations: unknown[];
}

export interface GuestDetail extends GuestRow {
  guest_groups: GuestGroupRow | null;
  guest_event_rsvp: unknown[];
  room_allocations: unknown[];
}

export interface GuestGroupWithCount extends GuestGroupRow {
  guests: { count: number }[];
}

// ---------------------------------------------------------------------------
// Guest queries
// ---------------------------------------------------------------------------

export interface GuestFilters {
  side?: string | undefined;
  needs_accommodation?: string | undefined;
  search?: string | undefined;
}

export async function findAllByOwner(
  ownerId: string,
  filters: GuestFilters,
): Promise<GuestListItem[]> {
  let query = supabase
    .from('guests')
    .select('*, guest_groups!group_id(name), room_allocations(*, rooms(*, accommodations(name)))')
    .eq('user_id', ownerId);

  if (filters.side && filters.side !== 'all') {
    query = query.eq('side', filters.side);
  }

  if (filters.needs_accommodation === 'true') {
    query = query.eq('needs_accommodation', true);
  }

  if (filters.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`,
    );
  }

  const { data, error } = await query.order('first_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as GuestListItem[];
}

export async function findSummaryByOwner(ownerId: string) {
  const [{ data: guests, error: guestError }, { data: rsvps }] = await Promise.all([
    supabase.from('guests').select('id, side').eq('user_id', ownerId),
    supabase.from('guest_event_rsvp').select('guest_id, event_id, rsvp_status, plus_ones'),
  ]);

  if (guestError) throw guestError;

  return { guests: guests ?? [], rsvps: rsvps ?? [] };
}

export async function findByIdAndOwner(
  id: string,
  ownerId: string,
): Promise<GuestDetail | null> {
  const { data, error } = await supabase
    .from('guests')
    .select(
      '*, guest_groups!group_id(*), guest_event_rsvp(*), room_allocations(*, rooms(*, accommodations(*)))',
    )
    .eq('id', id)
    .eq('user_id', ownerId)
    .single();

  if (error) throw error;
  return data as GuestDetail | null;
}

export async function insertGuest(payload: GuestInsert): Promise<GuestRow> {
  const { data, error } = await supabase.from('guests').insert([payload]).select().single();
  if (error) throw error;
  return data as GuestRow;
}

export async function insertGuestsBulk(
  payloads: (ParsedGuest & { user_id: string })[],
): Promise<GuestRow[]> {
  const { data, error } = await supabase.from('guests').insert(payloads).select();
  if (error) throw error;
  return (data ?? []) as GuestRow[];
}

export async function updateGuest(
  id: string,
  ownerId: string,
  payload: Partial<GuestInsert>,
): Promise<GuestRow> {
  const { data, error } = await supabase
    .from('guests')
    .update(payload)
    .eq('id', id)
    .eq('user_id', ownerId)
    .select()
    .single();

  if (error) throw error;
  return data as GuestRow;
}

export async function deleteGuest(id: string, ownerId: string): Promise<void> {
  const { error } = await supabase.from('guests').delete().eq('id', id).eq('user_id', ownerId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// RSVP
// ---------------------------------------------------------------------------

export async function insertRsvpEntries(
  entries: GuestEventRsvpInsert[],
): Promise<void> {
  const { error } = await supabase.from('guest_event_rsvp').insert(entries);
  if (error) throw error;
}

export async function upsertRsvp(payload: GuestEventRsvpInsert) {
  const { data, error } = await supabase
    .from('guest_event_rsvp')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export async function findGroupsByOwner(ownerId: string): Promise<GuestGroupWithCount[]> {
  const { data, error } = await supabase
    .from('guest_groups')
    .select('*, guests(count)')
    .eq('user_id', ownerId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as GuestGroupWithCount[];
}

export async function insertGroup(payload: GuestGroupInsert): Promise<GuestGroupRow> {
  const { data, error } = await supabase
    .from('guest_groups')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as GuestGroupRow;
}
