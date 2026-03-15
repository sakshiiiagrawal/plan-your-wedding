import { supabase } from '../config/database';
import type { EventInsert, EventRow, EventWithVenue } from '@wedding-planner/shared';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function findAllByOwner(ownerId: string): Promise<EventWithVenue[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*, venues(*)')
    .eq('user_id', ownerId)
    .order('event_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as EventWithVenue[];
}

export async function findByIdAndOwner(
  id: string,
  ownerId: string,
): Promise<EventWithVenue | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*, venues(*)')
    .eq('id', id)
    .eq('user_id', ownerId)
    .single();

  if (error) throw error;
  return data as EventWithVenue | null;
}

export async function insertEvent(payload: EventInsert): Promise<EventRow> {
  const { data, error } = await supabase.from('events').insert([payload]).select().single();

  if (error) throw error;
  return data as EventRow;
}

export async function updateEvent(
  id: string,
  ownerId: string,
  payload: Partial<EventInsert>,
): Promise<EventRow> {
  const { data, error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', id)
    .eq('user_id', ownerId)
    .select()
    .single();

  if (error) throw error;
  return data as EventRow;
}

export async function deleteEvent(id: string, ownerId: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id).eq('user_id', ownerId);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Child tables
// ---------------------------------------------------------------------------

export async function findGuestsByEvent(eventId: string) {
  const { data, error } = await supabase
    .from('guest_event_rsvp')
    .select('*, guests(*)')
    .eq('event_id', eventId);

  if (error) throw error;
  return data ?? [];
}

export async function findVendorsByEvent(eventId: string) {
  const { data, error } = await supabase
    .from('vendor_event_assignments')
    .select('*, vendors(*)')
    .eq('event_id', eventId);

  if (error) throw error;
  return data ?? [];
}

export async function findRitualsByEvent(eventId: string) {
  const { data, error } = await supabase
    .from('rituals')
    .select('*')
    .eq('event_id', eventId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Public (slug-scoped)
// ---------------------------------------------------------------------------

export async function findOwnerBySlug(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('slug', slug)
    .eq('role', 'admin')
    .maybeSingle();

  return data?.id ?? null;
}

export async function findPublicEventsBySlug(ownerId: string): Promise<EventWithVenue[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*, venues(*)')
    .eq('user_id', ownerId)
    .order('event_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as EventWithVenue[];
}
