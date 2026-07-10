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

export interface GuestRsvpSlice {
  event_id: string;
  rsvp_status: string;
  plus_ones: number | null;
}

export interface GuestListItem extends GuestRow {
  guest_groups: { name: string } | null;
  guest_event_rsvp: GuestRsvpSlice[];
}

export interface GuestDetail extends GuestRow {
  guest_groups: GuestGroupRow | null;
  guest_event_rsvp: unknown[];
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
    .select('*, guest_groups!group_id(name), guest_event_rsvp(event_id, rsvp_status, plus_ones)')
    .eq('user_id', ownerId);

  if (filters.side && filters.side !== 'all') {
    query = query.eq('side', filters.side);
  }

  if (filters.needs_accommodation === 'true') {
    query = query.eq('needs_accommodation', true);
  }

  if (filters.search) {
    query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.order('first_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as GuestListItem[];
}

export async function findSummaryByOwner(ownerId: string) {
  const { data: guests, error: guestError } = await supabase
    .from('guests')
    .select('id, side')
    .eq('user_id', ownerId);

  if (guestError) throw guestError;

  const guestIds = (guests ?? []).map((g) => g.id);

  const { data: rsvps, error: rsvpError } =
    guestIds.length > 0
      ? await supabase
          .from('guest_event_rsvp')
          .select('guest_id, event_id, rsvp_status, plus_ones')
          .in('guest_id', guestIds)
      : { data: [], error: null };

  if (rsvpError) throw rsvpError;

  return { guests: guests ?? [], rsvps: rsvps ?? [] };
}

export async function findByIdAndOwner(id: string, ownerId: string): Promise<GuestDetail | null> {
  const { data, error } = await supabase
    .from('guests')
    .select('*, guest_groups!group_id(*), guest_event_rsvp(*)')
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

export async function deleteGuestsBulk(ids: string[], ownerId: string): Promise<void> {
  const { error } = await supabase.from('guests').delete().in('id', ids).eq('user_id', ownerId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// RSVP
// ---------------------------------------------------------------------------

export async function insertRsvpEntries(entries: GuestEventRsvpInsert[]) {
  const { data, error } = await supabase.from('guest_event_rsvp').insert(entries).select();
  if (error) throw error;
  return data ?? [];
}

export async function upsertRsvp(payload: GuestEventRsvpInsert) {
  const { data, error } = await supabase
    .from('guest_event_rsvp')
    .upsert(payload, { onConflict: 'guest_id,event_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function findRsvpsByGuest(guestId: string) {
  const { data, error } = await supabase
    .from('guest_event_rsvp')
    .select('event_id, rsvp_status, plus_ones, responded_via_public')
    .eq('guest_id', guestId);

  if (error) throw error;
  return data ?? [];
}

export async function deleteRsvpsForGuestExcept(guestId: string, keepEventIds: string[]) {
  let query = supabase.from('guest_event_rsvp').delete().eq('guest_id', guestId);
  if (keepEventIds.length > 0) {
    query = query.not('event_id', 'in', `(${keepEventIds.join(',')})`);
  }
  const { error } = await query;
  if (error) throw error;
}

export async function updateAllRsvpsForGuest(guestId: string, payload: Partial<GuestEventRsvpInsert>) {
  const { data, error } = await supabase
    .from('guest_event_rsvp')
    .update(payload)
    .eq('guest_id', guestId)
    .select();

  if (error) throw error;
  return data ?? [];
}

// ilike treats % and _ as wildcards — escape them in caller-supplied input
// (this backs the unauthenticated public RSVP endpoint)
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

export async function findGuestByNameAndOwner(
  ownerId: string,
  firstName: string,
  lastName?: string | null,
): Promise<GuestRow | null> {
  let query = supabase
    .from('guests')
    .select('*')
    .eq('user_id', ownerId)
    .ilike('first_name', escapeLikePattern(firstName.trim()));

  if (lastName && lastName.trim()) {
    query = query.ilike('last_name', escapeLikePattern(lastName.trim()));
  }

  const { data, error } = await query.limit(2);
  if (error) throw error;
  // Only accept an unambiguous match
  return data && data.length === 1 ? (data[0] as GuestRow) : null;
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
  const { data, error } = await supabase.from('guest_groups').insert([payload]).select().single();

  if (error) throw error;
  return data as GuestGroupRow;
}
