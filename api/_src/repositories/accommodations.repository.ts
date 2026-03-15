import { supabase } from '../config/database';
import type {
  AccommodationInsert,
  AccommodationRow,
  RoomInsert,
  RoomRow,
  RoomAllocationInsert,
  RoomAllocationRow,
} from '@wedding-planner/shared';

// ---------------------------------------------------------------------------
// Accommodations
// ---------------------------------------------------------------------------

export interface AccommodationWithRoomCount extends AccommodationRow {
  rooms: { count: number }[];
}

export async function findAllByOwner(ownerId: string): Promise<AccommodationWithRoomCount[]> {
  const { data, error } = await supabase
    .from('accommodations')
    .select('*, rooms(count)')
    .eq('user_id', ownerId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AccommodationWithRoomCount[];
}

export async function findByIdAndOwner(id: string, ownerId: string) {
  const { data, error } = await supabase
    .from('accommodations')
    .select('*, rooms(*)')
    .eq('id', id)
    .eq('user_id', ownerId)
    .single();

  if (error) throw error;
  return data;
}

export async function findByIdOrNameAndOwner(
  ownerId: string,
  hotelId?: string,
  hotelName?: string,
) {
  let query = supabase.from('accommodations').select('id, name').eq('user_id', ownerId);
  if (hotelId) {
    query = query.eq('id', hotelId);
  } else if (hotelName) {
    query = query.ilike('name', hotelName);
  }
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data ?? [])[0] ?? null;
}

export async function findAllIdNameByOwner(ownerId: string) {
  const { data, error } = await supabase
    .from('accommodations')
    .select('id, name')
    .eq('user_id', ownerId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function insertAccommodation(payload: AccommodationInsert): Promise<AccommodationRow> {
  const { data, error } = await supabase.from('accommodations').insert([payload]).select().single();
  if (error) throw error;
  return data as AccommodationRow;
}

export async function updateAccommodation(
  id: string,
  ownerId: string,
  payload: Partial<AccommodationInsert>,
): Promise<AccommodationRow> {
  const { data, error } = await supabase
    .from('accommodations')
    .update(payload)
    .eq('id', id)
    .eq('user_id', ownerId)
    .select()
    .single();
  if (error) throw error;
  return data as AccommodationRow;
}

export async function deleteAccommodation(id: string, ownerId: string): Promise<void> {
  const { error } = await supabase
    .from('accommodations')
    .delete()
    .eq('id', id)
    .eq('user_id', ownerId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export async function findRoomsByAccommodation(accommodationId: string) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*, room_allocations(*, guests(first_name, last_name, side))')
    .eq('accommodation_id', accommodationId)
    .order('room_number', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function findRoomByNumberAndAccommodation(
  accommodationId: string,
  roomNumber: string,
): Promise<{ id: string; capacity: number; room_number: string } | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, capacity, room_number')
    .eq('accommodation_id', accommodationId)
    .eq('room_number', roomNumber)
    .limit(1);
  if (error) throw error;
  return (data ?? [])[0] ?? null;
}

export async function insertRoom(payload: RoomInsert): Promise<RoomRow> {
  const { data, error } = await supabase.from('rooms').insert([payload]).select().single();
  if (error) throw error;
  return data as RoomRow;
}

// ---------------------------------------------------------------------------
// Allocations
// ---------------------------------------------------------------------------

export async function findAllAllocations() {
  const { data, error } = await supabase
    .from('room_allocations')
    .select('*, rooms(*, accommodations(name)), guests(first_name, last_name, side)')
    .order('check_in_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function findAllocationMatrix(ownerId: string) {
  const { data, error } = await supabase
    .from('accommodations')
    .select(`*, rooms(*, room_allocations(*, guests(id, first_name, last_name, side)))`)
    .eq('user_id', ownerId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function findExistingAllocationsForRoom(roomId: string) {
  const { data, error } = await supabase
    .from('room_allocations')
    .select('id, guest_id')
    .eq('room_id', roomId);
  if (error) throw error;
  return data ?? [];
}

export async function insertAllocation(payload: RoomAllocationInsert): Promise<RoomAllocationRow> {
  const { data, error } = await supabase
    .from('room_allocations')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data as RoomAllocationRow;
}

export async function insertAllocationsBulk(payloads: RoomAllocationInsert[]) {
  const { data, error } = await supabase
    .from('room_allocations')
    .insert(payloads)
    .select('*, guests(first_name, last_name), rooms(room_number, accommodations(name))');
  if (error) throw error;
  return data ?? [];
}

export async function updateAllocation(id: string, payload: Partial<RoomAllocationInsert>) {
  const { data, error } = await supabase
    .from('room_allocations')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAllocationWithDetails(
  id: string,
  payload: Partial<RoomAllocationInsert>,
) {
  const { data, error } = await supabase
    .from('room_allocations')
    .update(payload)
    .eq('id', id)
    .select('*, guests(first_name, last_name), rooms(room_number, accommodations(name))')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAllocation(id: string): Promise<void> {
  const { error } = await supabase.from('room_allocations').delete().eq('id', id);
  if (error) throw error;
}

export async function findUnassignedGuests(ownerId: string) {
  const [{ data: allGuests, error: guestError }, { data: allocations }] = await Promise.all([
    supabase.from('guests').select('*').eq('user_id', ownerId).eq('needs_accommodation', true),
    supabase.from('room_allocations').select('guest_id'),
  ]);
  if (guestError) throw guestError;
  const allocatedIds = new Set((allocations ?? []).map((a) => a.guest_id));
  return (allGuests ?? []).filter((g) => !allocatedIds.has(g.id));
}

// ---------------------------------------------------------------------------
// Guests lookup (for import matching)
// ---------------------------------------------------------------------------

export async function findGuestsByOwner(ownerId: string) {
  const { data, error } = await supabase
    .from('guests')
    .select('id, first_name, last_name, side')
    .eq('user_id', ownerId);
  if (error) throw error;
  return (data ?? []) as {
    id: string;
    first_name: string;
    last_name: string | null;
    side: string;
  }[];
}

export async function findGuestsForTemplate(ownerId: string) {
  const { data, error } = await supabase
    .from('guests')
    .select('first_name, last_name, side, needs_accommodation')
    .eq('user_id', ownerId)
    .order('side', { ascending: true })
    .order('first_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as {
    first_name: string;
    last_name: string | null;
    side: string;
    needs_accommodation: boolean;
  }[];
}

export async function findGuestByName(
  ownerId: string,
  firstName: string,
  lastName?: string,
): Promise<{ id: string; first_name: string; last_name: string | null } | null> {
  let query = supabase
    .from('guests')
    .select('id, first_name, last_name')
    .eq('user_id', ownerId)
    .ilike('first_name', firstName);

  if (lastName) {
    query = query.ilike('last_name', lastName);
  }

  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data ?? [])[0] ?? null;
}
