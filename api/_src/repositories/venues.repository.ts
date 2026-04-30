import { supabase } from '../config/database';
import type {
  VenueInsert,
  VenueRow,
  RoomInsert,
  RoomRow,
  RoomAllocationInsert,
  RoomAllocationRow,
} from '@wedding-planner/shared';

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------

export interface VenueWithEventSummary extends VenueRow {
  events: { id: string; name: string; event_date: string }[];
}

export async function findAllByOwner(ownerId: string): Promise<VenueWithEventSummary[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('*, events(id, name, event_date)')
    .eq('user_id', ownerId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as VenueWithEventSummary[];
}

export async function findAccommodationsByOwner(ownerId: string) {
  const { data, error } = await supabase
    .from('venues')
    .select('*, rooms(count)')
    .eq('user_id', ownerId)
    .eq('has_accommodation', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function findAllIdNameByOwner(ownerId: string) {
  const { data, error } = await supabase
    .from('venues')
    .select('id, name')
    .eq('user_id', ownerId)
    .eq('has_accommodation', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function findByIdAndOwner(
  id: string,
  ownerId: string,
): Promise<VenueWithEventSummary | null> {
  const { data, error } = await supabase
    .from('venues')
    .select('*, events(*)')
    .eq('id', id)
    .eq('user_id', ownerId)
    .single();

  if (error) throw error;
  return data as VenueWithEventSummary | null;
}

export async function findByIdOrNameAndOwner(
  ownerId: string,
  venueId?: string,
  venueName?: string,
) {
  let query = supabase.from('venues').select('id, name').eq('user_id', ownerId);
  if (venueId) {
    query = query.eq('id', venueId);
  } else if (venueName) {
    query = query.ilike('name', venueName);
  }
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data ?? [])[0] ?? null;
}

export async function insertVenue(payload: VenueInsert): Promise<VenueRow> {
  const { data, error } = await supabase.from('venues').insert([payload]).select().single();

  if (error) throw error;
  return data as VenueRow;
}

export async function updateVenue(
  id: string,
  ownerId: string,
  payload: Partial<VenueInsert>,
): Promise<VenueRow> {
  const { data, error } = await supabase
    .from('venues')
    .update(payload)
    .eq('id', id)
    .eq('user_id', ownerId)
    .select()
    .single();

  if (error) throw error;
  return data as VenueRow;
}

export async function deleteVenue(id: string, ownerId: string): Promise<void> {
  const { error } = await supabase.from('venues').delete().eq('id', id).eq('user_id', ownerId);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export async function findRoomsByVenue(venueId: string) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*, room_allocations(*)')
    .eq('venue_id', venueId)
    .order('room_number', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function findRoomByNumberAndVenue(
  venueId: string,
  roomNumber: string,
): Promise<{ id: string; capacity: number; room_number: string } | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, capacity, room_number')
    .eq('venue_id', venueId)
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

export async function updateRoom(
  id: string,
  payload: Partial<
    Pick<
      RoomInsert,
      | 'room_number'
      | 'capacity'
      | 'room_type'
      | 'rate_per_night'
      | 'includes_breakfast'
      | 'check_in_date'
      | 'check_out_date'
      | 'notes'
    >
  >,
): Promise<RoomRow> {
  const { data, error } = await supabase
    .from('rooms')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as RoomRow;
}

export async function insertRoomsBulk(payloads: RoomInsert[]): Promise<RoomRow[]> {
  const { data, error } = await supabase.from('rooms').insert(payloads).select();
  if (error) throw error;
  return (data ?? []) as RoomRow[];
}

export async function deleteRoom(id: string): Promise<void> {
  const { error } = await supabase.from('rooms').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Room Allocations
// ---------------------------------------------------------------------------

export async function findAllocationMatrix(ownerId: string) {
  const { data: venues, error } = await supabase
    .from('venues')
    .select(`*, rooms(*, room_allocations(*))`)
    .eq('user_id', ownerId)
    .eq('has_accommodation', true)
    .order('name', { ascending: true });

  if (error) throw error;
  if (!venues || venues.length === 0) return [];

  // Collect all guest IDs from all allocations
  const allGuestIds = new Set<string>();
  venues.forEach((venue) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (venue as any).rooms?.forEach((room: any) => {
      room.room_allocations?.forEach((alloc: { guest_ids?: string[] }) => {
        (alloc.guest_ids ?? []).forEach((id) => allGuestIds.add(id));
      });
    });
  });

  if (allGuestIds.size === 0) return venues;

  // Fetch guest details for all IDs in one query
  const { data: guests } = await supabase
    .from('guests')
    .select('id, first_name, last_name, side, needs_accommodation')
    .in('id', Array.from(allGuestIds));

  const guestMap = new Map((guests ?? []).map((g) => [g.id, g]));

  // Enrich allocations with guest details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return venues.map((venue: any) => ({
    ...venue,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rooms: venue.rooms?.map((room: any) => ({
      ...room,
      room_allocations: room.room_allocations?.map(
        (alloc: { guest_ids?: string[] } & Record<string, unknown>) => ({
          ...alloc,
          guests: (alloc.guest_ids ?? []).map((id) => guestMap.get(id)).filter(Boolean),
        }),
      ),
    })),
  }));
}

export async function findAllocationForRoom(
  roomId: string,
  checkInDate: string,
): Promise<RoomAllocationRow | null> {
  const { data, error } = await supabase
    .from('room_allocations')
    .select('*')
    .eq('room_id', roomId)
    .eq('check_in_date', checkInDate)
    .limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as RoomAllocationRow) ?? null;
}

export async function findAllocationsByRoom(roomId: string): Promise<RoomAllocationRow[]> {
  const { data, error } = await supabase.from('room_allocations').select('*').eq('room_id', roomId);
  if (error) throw error;
  return (data ?? []) as RoomAllocationRow[];
}

export async function findAllocationById(id: string): Promise<RoomAllocationRow | null> {
  const { data, error } = await supabase.from('room_allocations').select('*').eq('id', id).limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as RoomAllocationRow) ?? null;
}

export async function findRoomById(
  roomId: string,
): Promise<{ id: string; capacity: number | null; room_number: string } | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, capacity, room_number')
    .eq('id', roomId)
    .limit(1);
  if (error) throw error;
  return (data ?? [])[0] ?? null;
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
    .select('*, rooms(room_number, venues(name))');
  if (error) throw error;
  return data ?? [];
}

export async function updateAllocation(
  id: string,
  payload: Partial<RoomAllocationInsert>,
): Promise<RoomAllocationRow> {
  const { data, error } = await supabase
    .from('room_allocations')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as RoomAllocationRow;
}

export async function updateAllocationWithDetails(
  id: string,
  payload: Partial<RoomAllocationInsert>,
) {
  const { data, error } = await supabase
    .from('room_allocations')
    .update(payload)
    .eq('id', id)
    .select('*, rooms(room_number, venues(name))')
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
    supabase.from('guests').select('*').eq('user_id', ownerId),
    supabase.from('room_allocations').select('guest_ids'),
  ]);
  if (guestError) throw guestError;
  // Flatten all guest_ids arrays
  const allocatedIds = new Set((allocations ?? []).flatMap((a) => (a.guest_ids as string[]) ?? []));
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

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function findPaymentsByVenue(venueId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('venue_id', venueId)
    .order('payment_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function insertVenuePayment(payload: {
  venue_id: string;
  user_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  side?: string | null;
  transaction_reference?: string | null;
  notes?: string | null;
}) {
  const { data, error } = await supabase.from('payments').insert([payload]).select().single();
  if (error) throw error;
  return data;
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw error;
}
