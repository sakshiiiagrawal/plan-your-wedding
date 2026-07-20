import { NotFoundError, BadRequestError, ConflictError } from '../shared/errors/HttpError';
import type {
  VenueInsert,
  VenueRow,
  RoomInsert,
  RoomAllocationInsert,
  VenueWithFinance,
  FinanceTier,
} from '../../../shared/src';
import type { RoomInput } from '../validators/venues.validator';
import * as repo from '../repositories/venues.repository';
import type { VenueWithEventSummary } from '../repositories/venues.repository';
import {
  buildVenueSourceItems,
  createExpensePayment,
  deleteExpensePayment,
  getExpenseDetailsTx,
  getSourceExpense,
  listExpenses,
  type PaymentMutationInput,
  upsertSourceExpenseTx,
} from './finance.service';
import { listGuests } from './guests.service';
import { withPgTransaction } from '../config/postgres';
import {
  generateRoomAllocationTemplate,
  generateAllVenuesAllocationTemplate,
  parseRoomAllocationExcel,
  parseMultiVenueAllocationExcel,
  validateRoomAllocation,
  findSimilarGuests,
  type ParsedAllocation,
  type ParsedMultiVenueAllocation,
} from '../excel/venues.excel';

// ---------------------------------------------------------------------------
// Venues CRUD
// ---------------------------------------------------------------------------

function normalizeDate(value: string | null | undefined): string {
  return value && value.trim() !== '' ? value : new Date().toISOString().slice(0, 10);
}

function assertDateOrder(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
  label: string,
): void {
  if (checkIn && checkOut && checkOut <= checkIn) {
    throw new BadRequestError(`${label}: check-out date must be after check-in date`);
  }
}

async function extractVenueFinanceInput(
  ownerId: string,
  payload: {
    name: string;
    venue_type?: string | null | undefined;
    total_cost?: number | null | undefined;
    expense_date?: string | null | undefined;
    side?: 'bride' | 'groom' | 'shared' | 'mutual' | null | undefined;
    bride_share_percentage?: number | null | undefined;
    notes?: string | null | undefined;
    finance?: {
      expense_date: string;
      notes?: string | null;
      items: Awaited<ReturnType<typeof buildVenueSourceItems>>;
      payments?: PaymentMutationInput[];
    } | null;
    // When updating, the existing single venue expense_item's id so syncExpenseItems
    // updates it in place instead of DELETE+INSERT (which breaks the FK from payment_allocations).
    existingItemId?: string | null;
  },
) {
  if (payload.finance) {
    return {
      description: payload.name,
      expense_date: payload.finance.expense_date,
      notes: payload.finance.notes ?? payload.notes ?? null,
      items: payload.finance.items,
      payments: payload.finance.payments ?? [],
    };
  }

  // Leave side/bride_share_percentage undefined (not defaulted) when the
  // caller didn't provide them — a money-tier body has them stripped, and
  // syncExpenseItems needs to see `undefined` to preserve the existing
  // item's side rather than clobber it with 'shared'.
  const items = await buildVenueSourceItems(
    ownerId,
    payload.venue_type ?? null,
    payload.name,
    payload.total_cost ?? null,
    payload.side,
    payload.bride_share_percentage,
  );

  const itemsWithId =
    payload.existingItemId && items.length > 0
      ? [{ ...items[0]!, id: payload.existingItemId }, ...items.slice(1)]
      : items;

  return {
    description: payload.name,
    expense_date: normalizeDate(payload.expense_date),
    notes: payload.notes ?? null,
    items: itemsWithId,
    payments: [] as PaymentMutationInput[],
  };
}

function mergeVenueWithFinance(
  venue: VenueWithEventSummary,
  finance: Awaited<ReturnType<typeof getSourceExpense>>,
) {
  return {
    ...venue,
    expense_id: finance?.id ?? null,
    finance_summary: finance?.summary ?? null,
    finance: finance ?? null,
  } as VenueWithFinance & VenueWithEventSummary;
}

export async function listVenues(
  ownerId: string,
): Promise<Array<VenueWithEventSummary & { expense_id: string | null }>> {
  const [venues, financeRows] = await Promise.all([
    repo.findAllByOwner(ownerId),
    listExpenses(ownerId, { source_type: 'venue' }),
  ]);
  const financeBySource = new Map(
    financeRows
      .filter((expense) => expense.source_id)
      .map((expense) => [expense.source_id!, expense]),
  );
  return venues.map((venue) => mergeVenueWithFinance(venue, financeBySource.get(venue.id) ?? null));
}

export async function reorderVenues(ownerId: string, orderedIds: string[]): Promise<void> {
  await repo.reorderVenues(ownerId, orderedIds);
}

export async function getVenue(
  id: string,
  ownerId: string,
): Promise<VenueWithEventSummary & { expense_id: string | null }> {
  const venue = await repo.findByIdAndOwner(id, ownerId);
  if (!venue) throw new NotFoundError('Venue not found');
  const finance = await getSourceExpense(ownerId, 'venue', id);
  return mergeVenueWithFinance(venue, finance);
}

export async function createVenue(
  payload: Omit<VenueInsert, 'user_id'> & {
    rooms?: RoomInput[];
    total_cost?: number | null;
    expense_date?: string | null;
    side?: 'bride' | 'groom' | 'shared' | 'mutual' | null;
    bride_share_percentage?: number | null;
    finance?: {
      expense_date: string;
      notes?: string | null;
      items: Awaited<ReturnType<typeof buildVenueSourceItems>>;
      payments?: PaymentMutationInput[];
    } | null;
  },
  ownerId: string,
  actorId: string,
): Promise<VenueRow> {
  assertDateOrder(payload.default_check_in_date, payload.default_check_out_date, 'Default dates');
  return withPgTransaction(async (client) => {
    const {
      rooms = [],
      total_cost,
      expense_date,
      side,
      bride_share_percentage,
      finance,
      ...venuePayload
    } = payload as typeof payload;
    const { rows } = await client.query<Record<string, unknown>>(
      `
        INSERT INTO venues (
          user_id,
          name,
          venue_type,
          address,
          city,
          place_id,
          latitude,
          longitude,
          photo_url,
          contact_person,
          contact_phone,
          capacity,
          has_accommodation,
          default_check_in_date,
          default_check_out_date,
          notes,
          display_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          COALESCE((SELECT MAX(display_order) FROM venues WHERE user_id = $1), 0) + 1)
        RETURNING *
      `,
      [
        ownerId,
        venuePayload.name,
        venuePayload.venue_type ?? null,
        venuePayload.address ?? null,
        venuePayload.city ?? null,
        venuePayload.place_id ?? null,
        venuePayload.latitude ?? null,
        venuePayload.longitude ?? null,
        venuePayload.photo_url ?? null,
        venuePayload.contact_person ?? null,
        venuePayload.contact_phone ?? null,
        venuePayload.capacity ?? null,
        venuePayload.has_accommodation ?? false,
        venuePayload.default_check_in_date ?? null,
        venuePayload.default_check_out_date ?? null,
        venuePayload.notes ?? null,
      ],
    );
    const venue = rows[0] as VenueRow | undefined;
    if (!venue) throw new NotFoundError('Venue could not be created');

    for (const room of rooms) {
      await client.query(
        `
          INSERT INTO rooms (
            venue_id,
            room_number,
            room_type,
            capacity,
            rate_per_night,
            includes_breakfast,
            check_in_date,
            check_out_date,
            notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          venue.id,
          room.room_number,
          room.room_type,
          room.capacity ?? null,
          room.rate_per_night ?? null,
          room.includes_breakfast ?? false,
          room.check_in_date ?? null,
          room.check_out_date ?? null,
          room.notes ?? null,
        ],
      );
    }

    const financeInput = await extractVenueFinanceInput(ownerId, {
      name: venue.name,
      venue_type: venue.venue_type,
      total_cost,
      expense_date,
      side,
      bride_share_percentage,
      notes: venue.notes,
      finance: finance ?? null,
    });
    await upsertSourceExpenseTx(client, ownerId, actorId, 'venue', venue.id, financeInput);
    return venue;
  });
}

export async function updateVenue(
  id: string,
  ownerId: string,
  actorId: string,
  payload: Partial<VenueInsert> & {
    rooms?: RoomInput[];
    total_cost?: number | null;
    expense_date?: string | null;
    side?: 'bride' | 'groom' | 'shared' | 'mutual' | null;
    bride_share_percentage?: number | null;
    finance?: {
      expense_date: string;
      notes?: string | null;
      items: Awaited<ReturnType<typeof buildVenueSourceItems>>;
      payments?: PaymentMutationInput[];
    } | null;
  },
  tier: FinanceTier = 'full',
): Promise<VenueRow> {
  return withPgTransaction(async (client) => {
    const { rows: existingRows } = await client.query<Record<string, unknown>>(
      `SELECT * FROM venues WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [id, ownerId],
    );
    const existing = existingRows[0] as VenueRow | undefined;
    if (!existing) throw new NotFoundError('Venue not found');

    const {
      rooms = [],
      total_cost,
      expense_date,
      side,
      bride_share_percentage,
      finance,
      ...venuePayload
    } = payload as typeof payload;

    const nextValues = {
      name: venuePayload.name ?? existing.name,
      venue_type: venuePayload.venue_type ?? existing.venue_type,
      address: venuePayload.address ?? existing.address,
      city: venuePayload.city ?? existing.city,
      place_id: venuePayload.place_id ?? existing.place_id,
      latitude: venuePayload.latitude ?? existing.latitude,
      longitude: venuePayload.longitude ?? existing.longitude,
      photo_url: venuePayload.photo_url ?? existing.photo_url,
      contact_person: venuePayload.contact_person ?? existing.contact_person,
      contact_phone: venuePayload.contact_phone ?? existing.contact_phone,
      capacity: venuePayload.capacity ?? existing.capacity,
      has_accommodation: venuePayload.has_accommodation ?? existing.has_accommodation,
      default_check_in_date: venuePayload.default_check_in_date ?? existing.default_check_in_date,
      default_check_out_date:
        venuePayload.default_check_out_date ?? existing.default_check_out_date,
      notes: venuePayload.notes ?? existing.notes,
    };

    if (
      venuePayload.default_check_in_date !== undefined ||
      venuePayload.default_check_out_date !== undefined
    ) {
      assertDateOrder(
        nextValues.default_check_in_date,
        nextValues.default_check_out_date,
        'Default dates',
      );
    }

    const { rows } = await client.query<Record<string, unknown>>(
      `
        UPDATE venues
        SET
          name = $3,
          venue_type = $4,
          address = $5,
          city = $6,
          place_id = $7,
          latitude = $8,
          longitude = $9,
          contact_person = $10,
          contact_phone = $11,
          capacity = $12,
          has_accommodation = $13,
          default_check_in_date = $14,
          default_check_out_date = $15,
          notes = $16,
          photo_url = $17
        WHERE id = $1
          AND user_id = $2
        RETURNING *
      `,
      [
        id,
        ownerId,
        nextValues.name,
        nextValues.venue_type,
        nextValues.address,
        nextValues.city,
        nextValues.place_id,
        nextValues.latitude,
        nextValues.longitude,
        nextValues.contact_person,
        nextValues.contact_phone,
        nextValues.capacity,
        nextValues.has_accommodation,
        nextValues.default_check_in_date,
        nextValues.default_check_out_date,
        nextValues.notes,
        nextValues.photo_url,
      ],
    );
    const venue = rows[0] as VenueRow | undefined;
    if (!venue) throw new NotFoundError('Venue not found');

    for (const room of rooms) {
      await client.query(
        `
          INSERT INTO rooms (
            venue_id,
            room_number,
            room_type,
            capacity,
            rate_per_night,
            includes_breakfast,
            check_in_date,
            check_out_date,
            notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          venue.id,
          room.room_number,
          room.room_type,
          room.capacity ?? null,
          room.rate_per_night ?? null,
          room.includes_breakfast ?? false,
          room.check_in_date ?? null,
          room.check_out_date ?? null,
          room.notes ?? null,
        ],
      );
    }

    const { rows: expenseRows } = await client.query<Record<string, unknown>>(
      `
        SELECT id
        FROM expenses
        WHERE user_id = $1
          AND source_type = 'venue'
          AND source_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [ownerId, id],
    );
    const linkedExpenseId = expenseRows[0]?.id ? String(expenseRows[0].id) : null;
    const linkedExpense = linkedExpenseId
      ? await getExpenseDetailsTx(client, ownerId, linkedExpenseId)
      : null;

    // A tier-'none' editor can't see finance at all — never touch it, even
    // to "preserve" it, so a stripped body can never resync into an empty
    // items array and wipe an existing costed venue's finance rows.
    const shouldTouchFinance =
      tier !== 'none' &&
      (finance !== undefined ||
        total_cost !== undefined ||
        expense_date !== undefined ||
        side !== undefined ||
        bride_share_percentage !== undefined ||
        payload.name !== undefined);

    if (shouldTouchFinance) {
      const financeInput =
        finance != null || total_cost !== undefined
          ? await extractVenueFinanceInput(ownerId, {
              name: venue.name,
              venue_type: venue.venue_type,
              total_cost: total_cost ?? linkedExpense?.summary.committed_amount ?? null,
              expense_date: expense_date ?? linkedExpense?.expense_date ?? null,
              // Leave undefined (not defaulted to 'shared') when the caller
              // didn't send it — preserves the existing item's side via
              // existingItemId below instead of clobbering it.
              side,
              bride_share_percentage,
              notes: venue.notes,
              finance: finance ?? null,
              existingItemId: linkedExpense?.items?.[0]?.id ?? null,
            })
          : linkedExpense
            ? {
                description: venue.name,
                expense_date: linkedExpense.expense_date,
                notes: linkedExpense.notes,
                items: linkedExpense.items,
                payments: [],
              }
            : {
                description: venue.name,
                expense_date: normalizeDate(expense_date),
                notes: venue.notes,
                items: [],
                payments: [],
              };
      await upsertSourceExpenseTx(client, ownerId, actorId, 'venue', id, financeInput);
    }

    return venue;
  });
}

export async function deleteVenue(id: string, ownerId: string): Promise<void> {
  return withPgTransaction(async (client) => {
    const { rows } = await client.query<Record<string, unknown>>(
      `SELECT * FROM venues WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [id, ownerId],
    );
    const venue = rows[0] as VenueRow | undefined;
    if (!venue) throw new NotFoundError('Venue not found');

    const { rows: expenseRows } = await client.query<Record<string, unknown>>(
      `
        SELECT id
        FROM expenses
        WHERE user_id = $1
          AND source_type = 'venue'
          AND source_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [ownerId, id],
    );
    const expenseId = expenseRows[0]?.id ? String(expenseRows[0].id) : null;

    if (expenseId) {
      const finance = await getExpenseDetailsTx(client, ownerId, expenseId);
      if (finance.payments.length > 0) {
        throw new ConflictError('Cannot delete venue with linked payment history.');
      }
      await client.query(`DELETE FROM expenses WHERE id = $1 AND user_id = $2`, [
        expenseId,
        ownerId,
      ]);
    }

    await client.query(`DELETE FROM venues WHERE id = $1 AND user_id = $2`, [id, ownerId]);
  });
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

async function assertRoomOwnership(roomId: string, ownerId: string): Promise<void> {
  const owner = await repo.findRoomOwner(roomId);
  if (owner !== ownerId) throw new NotFoundError('Room not found');
}

async function assertAllocationOwnership(allocationId: string, ownerId: string): Promise<void> {
  const owner = await repo.findAllocationOwner(allocationId);
  if (owner !== ownerId) throw new NotFoundError('Allocation not found');
}

export async function getRooms(ownerId: string, venueId: string) {
  const venue = await repo.findByIdOrNameAndOwner(ownerId, venueId);
  if (!venue) throw new NotFoundError('Venue not found');
  return repo.findRoomsByVenue(venueId);
}

// One round-trip for the Venues page: the venue list plus every venue's rooms
// grouped by venue id, so the page renders room sections without an N+1 of
// per-venue /rooms calls.
export async function getPageData(ownerId: string) {
  const venues = await listVenues(ownerId);
  const rooms = await repo.findRoomsByOwner(venues.map((v) => v.id));
  const roomsByVenue: Record<string, typeof rooms> = {};
  for (const room of rooms) {
    const venueId = String((room as { venue_id: string }).venue_id);
    (roomsByVenue[venueId] ??= []).push(room);
  }
  return { venues, roomsByVenue };
}

export async function addRoom(
  ownerId: string,
  venueId: string,
  payload: Omit<RoomInsert, 'venue_id'>,
) {
  const venue = await repo.findByIdOrNameAndOwner(ownerId, venueId);
  if (!venue) throw new NotFoundError('Venue not found');
  assertDateOrder(payload.check_in_date, payload.check_out_date, 'Room booked window');
  return repo.insertRoom({ ...payload, venue_id: venueId });
}

export async function deleteRoom(ownerId: string, id: string) {
  await assertRoomOwnership(id, ownerId);
  const allocs = await repo.findAllocationsByRoom(id);
  const hasGuests = allocs.some((a) => ((a.guest_ids as string[]) ?? []).length > 0);
  if (hasGuests) {
    throw new BadRequestError(
      'Cannot delete a room that has guests assigned. Remove guest assignments first.',
    );
  }
  await repo.deleteRoom(id);
}

export async function updateRoom(
  ownerId: string,
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
) {
  await assertRoomOwnership(id, ownerId);
  const existing = await repo.findRoomById(id);
  const allocs =
    payload.capacity !== undefined ||
    payload.check_in_date !== undefined ||
    payload.check_out_date !== undefined
      ? await repo.findAllocationsByRoom(id)
      : [];

  // If lowering capacity, make sure it doesn't go below current occupancy
  if (payload.capacity !== undefined && existing) {
    const occupancy = allocs.reduce((sum, a) => sum + ((a.guest_ids as string[])?.length ?? 0), 0);
    if (payload.capacity < occupancy) {
      throw new BadRequestError(
        `Cannot set occupancy to ${payload.capacity} — room currently has ${occupancy} guest${occupancy !== 1 ? 's' : ''} assigned.`,
      );
    }
  }

  // If narrowing the booked window, every existing stay must still fit inside it.
  if ((payload.check_in_date !== undefined || payload.check_out_date !== undefined) && existing) {
    const roomIn = payload.check_in_date ?? existing.check_in_date ?? null;
    const roomOut = payload.check_out_date ?? existing.check_out_date ?? null;
    assertDateOrder(roomIn, roomOut, 'Room booked window');
    const offending = allocs
      .filter((a) => ((a.guest_ids as string[]) ?? []).length > 0)
      .filter(
        (a) => (roomIn && a.check_in_date < roomIn) || (roomOut && a.check_out_date > roomOut),
      )
      .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date))[0];
    if (offending) {
      throw new BadRequestError(
        `A stay (${offending.check_in_date} → ${offending.check_out_date}) falls outside the new booked window ${roomIn ?? '…'} → ${roomOut ?? '…'}. Adjust that stay first.`,
      );
    }
  }
  return repo.updateRoom(id, payload);
}

// ---------------------------------------------------------------------------
// Allocations
// ---------------------------------------------------------------------------

export async function getAllocationMatrix(ownerId: string) {
  return repo.findAllocationMatrix(ownerId);
}

interface AllocationGuardInput {
  roomId: string;
  guestIds: string[];
  checkIn: string;
  checkOut: string;
  excludeAllocationId?: string;
}

// Runs every business rule inside the caller's transaction. Locks the room row
// (FOR UPDATE) so concurrent allocation writes against the same room serialize.
// ponytail: a cross-room guest conflict between two simultaneous requests to
// different rooms is not serialized by the room lock (two-collaborators-in-the-
// same-millisecond edge); the guest-overlap SELECT catches all sequential cases.
async function assertAllocationAllowed(
  client: import('pg').PoolClient,
  ownerId: string,
  input: AllocationGuardInput,
): Promise<void> {
  const { roomId, guestIds, checkIn, checkOut, excludeAllocationId } = input;

  if (checkOut <= checkIn) {
    throw new BadRequestError('Check-out date must be after check-in date');
  }

  const { rows: roomRows } = await client.query<{
    id: string;
    capacity: number;
    room_number: string;
    user_id: string;
    room_check_in: string | null;
    room_check_out: string | null;
  }>(
    `SELECT r.id, r.capacity, r.room_number, v.user_id,
            r.check_in_date AS room_check_in, r.check_out_date AS room_check_out
       FROM rooms r
       JOIN venues v ON v.id = r.venue_id
      WHERE r.id = $1
      FOR UPDATE OF r`,
    [roomId],
  );
  const room = roomRows[0];
  if (!room || room.user_id !== ownerId) throw new NotFoundError('Room not found');

  const { rows: ownedRows } = await client.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM guests WHERE user_id = $1 AND id = ANY($2::uuid[])`,
    [ownerId, guestIds],
  );
  if (Number(ownedRows[0]?.n ?? 0) !== new Set(guestIds).size) {
    throw new BadRequestError('One or more guests do not belong to this wedding');
  }

  const { rows: occRows } = await client.query<{ occupancy: number }>(
    `SELECT COALESCE(SUM(cardinality(guest_ids)), 0)::int AS occupancy
       FROM room_allocations
      WHERE room_id = $1
        AND check_in_date < $3
        AND check_out_date > $2
        AND ($4::uuid IS NULL OR id <> $4::uuid)`,
    [roomId, checkIn, checkOut, excludeAllocationId ?? null],
  );
  const existingOccupancy = Number(occRows[0]?.occupancy ?? 0);
  if (existingOccupancy + guestIds.length > room.capacity) {
    throw new BadRequestError(
      `Room ${room.room_number} sleeps ${room.capacity}. ${existingOccupancy} guest${existingOccupancy !== 1 ? 's are' : ' is'} already assigned for an overlapping stay, and this would add ${guestIds.length} more.`,
    );
  }

  if (
    (room.room_check_in && checkIn < room.room_check_in) ||
    (room.room_check_out && checkOut > room.room_check_out)
  ) {
    throw new BadRequestError(
      `Room ${room.room_number} is only booked ${room.room_check_in ?? '…'} → ${room.room_check_out ?? '…'}. Adjust the stay dates or extend the room's booking window.`,
    );
  }

  const { rows: conflictRows } = await client.query<{
    guest_ids: string[];
    room_number: string;
    check_in_date: string;
    check_out_date: string;
  }>(
    `SELECT ra.guest_ids, r.room_number, ra.check_in_date, ra.check_out_date
       FROM room_allocations ra
       JOIN rooms r ON r.id = ra.room_id
      WHERE ra.guest_ids && $1::uuid[]
        AND ra.check_in_date < $3
        AND ra.check_out_date > $2
        AND ($4::uuid IS NULL OR ra.id <> $4::uuid)`,
    [guestIds, checkIn, checkOut, excludeAllocationId ?? null],
  );
  if (conflictRows.length > 0) {
    const conflictedIds = Array.from(
      new Set(conflictRows.flatMap((c) => c.guest_ids.filter((id) => guestIds.includes(id)))),
    );
    const names = await repo.findGuestNamesByIds(conflictedIds);
    const nameList = names
      .map((g) => [g.first_name, g.last_name].filter(Boolean).join(' '))
      .join(', ');
    const first = conflictRows[0]!;
    throw new BadRequestError(
      `${nameList || 'A selected guest'} already has a stay in Room ${first.room_number} (${first.check_in_date} → ${first.check_out_date}) that overlaps these dates. A guest can't be in two rooms on the same night.`,
    );
  }
}

export async function createAllocation(ownerId: string, payload: RoomAllocationInsert) {
  return withPgTransaction(async (client) => {
    await assertAllocationAllowed(client, ownerId, {
      roomId: payload.room_id,
      guestIds: payload.guest_ids ?? [],
      checkIn: payload.check_in_date,
      checkOut: payload.check_out_date,
    });
    const { rows } = await client.query(
      `INSERT INTO room_allocations (room_id, guest_ids, check_in_date, check_out_date, notes)
       VALUES ($1, $2::uuid[], $3, $4, $5)
       RETURNING *`,
      [
        payload.room_id,
        payload.guest_ids ?? [],
        payload.check_in_date,
        payload.check_out_date,
        payload.notes ?? null,
      ],
    );
    return rows[0];
  });
}

export async function updateAllocation(
  ownerId: string,
  id: string,
  payload: Partial<RoomAllocationInsert>,
) {
  return withPgTransaction(async (client) => {
    const { rows: existingRows } = await client.query<{
      id: string;
      room_id: string;
      guest_ids: string[];
      check_in_date: string;
      check_out_date: string;
      notes: string | null;
      user_id: string;
    }>(
      `SELECT ra.*, v.user_id
         FROM room_allocations ra
         JOIN rooms r ON r.id = ra.room_id
         JOIN venues v ON v.id = r.venue_id
        WHERE ra.id = $1
        FOR UPDATE OF ra`,
      [id],
    );
    const existing = existingRows[0];
    if (!existing || existing.user_id !== ownerId) {
      throw new NotFoundError('Allocation not found');
    }

    const merged = {
      room_id: payload.room_id ?? existing.room_id,
      guest_ids: payload.guest_ids ?? existing.guest_ids ?? [],
      check_in_date: payload.check_in_date ?? existing.check_in_date,
      check_out_date: payload.check_out_date ?? existing.check_out_date,
      notes: payload.notes !== undefined ? payload.notes : existing.notes,
    };

    await assertAllocationAllowed(client, ownerId, {
      roomId: merged.room_id,
      guestIds: merged.guest_ids,
      checkIn: merged.check_in_date,
      checkOut: merged.check_out_date,
      excludeAllocationId: id,
    });

    const { rows } = await client.query(
      `UPDATE room_allocations
          SET room_id = $2, guest_ids = $3::uuid[], check_in_date = $4,
              check_out_date = $5, notes = $6, updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [
        id,
        merged.room_id,
        merged.guest_ids,
        merged.check_in_date,
        merged.check_out_date,
        merged.notes,
      ],
    );
    return rows[0];
  });
}

export async function deleteAllocation(ownerId: string, id: string) {
  await assertAllocationOwnership(id, ownerId);
  return repo.deleteAllocation(id);
}

export async function setGuestStayStatus(
  ownerId: string,
  allocationId: string,
  input: { guest_id: string; status: 'expected' | 'checked_in' | 'checked_out' },
) {
  await assertAllocationOwnership(allocationId, ownerId);
  const alloc = await repo.findAllocationById(allocationId);
  if (!alloc) throw new NotFoundError('Allocation not found');
  const guestIds = (alloc.guest_ids as string[]) ?? [];
  if (!guestIds.includes(input.guest_id)) {
    throw new BadRequestError('Guest is not part of this stay');
  }
  const checkedIn = new Set(
    ((alloc as Record<string, unknown>).checked_in_guest_ids as string[]) ?? [],
  );
  const checkedOut = new Set(
    ((alloc as Record<string, unknown>).checked_out_guest_ids as string[]) ?? [],
  );
  if (input.status === 'expected') {
    checkedIn.delete(input.guest_id);
    checkedOut.delete(input.guest_id);
  } else if (input.status === 'checked_in') {
    checkedIn.add(input.guest_id);
    checkedOut.delete(input.guest_id);
  } else {
    checkedIn.add(input.guest_id);
    checkedOut.add(input.guest_id);
  }
  return repo.updateAllocation(allocationId, {
    checked_in_guest_ids: Array.from(checkedIn),
    checked_out_guest_ids: Array.from(checkedOut),
  } as Partial<RoomAllocationInsert>);
}

export async function getUnassignedGuests(ownerId: string) {
  return repo.findUnassignedGuests(ownerId);
}

// One round-trip for the Accommodations page (was matrix + unassigned + guests).
export async function getAllocationPageData(ownerId: string) {
  const [matrix, unassignedGuests, guests] = await Promise.all([
    getAllocationMatrix(ownerId),
    getUnassignedGuests(ownerId),
    listGuests(ownerId, { include_vendor_team: true }),
  ]);
  return { matrix, unassignedGuests, guests };
}

// ---------------------------------------------------------------------------
// Excel template download — single hotel
// ---------------------------------------------------------------------------

export async function getDownloadTemplate(
  ownerId: string,
  venueId?: string,
  venueName?: string,
): Promise<{ buffer: Buffer; filename: string } | { error: string }> {
  let name = venueName;

  if (venueId && !venueName) {
    const venue = await repo.findByIdOrNameAndOwner(ownerId, venueId);
    if (!venue) return { error: 'Venue not found' };
    name = venue.name;
  }

  const guests = await repo.findGuestsForTemplate(ownerId);
  const buffer = generateRoomAllocationTemplate(name ?? 'Hotel Name', guests);
  const filename = name
    ? `${name.replace(/\s+/g, '_')}_room_allocation.xlsx`
    : 'room_allocation_template.xlsx';

  return { buffer, filename };
}

// ---------------------------------------------------------------------------
// Excel template download — all accommodation venues
// ---------------------------------------------------------------------------

export async function getAllVenuesTemplate(ownerId: string): Promise<Buffer> {
  const [venues, guests] = await Promise.all([
    repo.findAllIdNameByOwner(ownerId),
    repo.findGuestsForTemplate(ownerId),
  ]);
  return generateAllVenuesAllocationTemplate(venues, guests);
}

// ---------------------------------------------------------------------------
// Excel import — single hotel
// ---------------------------------------------------------------------------

interface ImportError {
  row: number;
  guest: string;
  error: string;
  suggestions?: { name: string; similarity: string; side: string }[];
}

interface FormattedAllocation {
  guest: string;
  room: string;
  venue: string;
  checkIn: string;
  checkOut: string;
  action: 'created' | 'updated';
}

interface RoomGroup {
  venueId: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  guestIds: string[];
  guestNames: string[];
  firstRow: number;
  roomType?: string;
  capacity?: number;
}

async function processAllocations(
  allocations: ParsedAllocation[],
  ownerId: string,
  getVenueId: (allocation: ParsedAllocation) => string | null,
) {
  const allGuests = await repo.findGuestsByOwner(ownerId);
  const errors: ImportError[] = [];

  // Group by (venueId, roomNumber, checkIn, checkOut)
  const roomGroups = new Map<string, RoomGroup>();

  for (let i = 0; i < allocations.length; i++) {
    const allocation = allocations[i]!;
    const rowNum = i + 1;

    const venueId = getVenueId(allocation);
    if (!venueId) {
      errors.push({
        row: rowNum,
        guest: allocation.guest_full_name,
        error: `Venue "${allocation.hotel_name}" not found. Please create it first.`,
      });
      continue;
    }

    const guest = await repo.findGuestByName(
      ownerId,
      allocation.guest_first_name,
      allocation.guest_last_name || undefined,
    );

    if (!guest) {
      const similar = findSimilarGuests(allocation.guest_full_name, allGuests);
      if (similar.length > 0) {
        errors.push({
          row: rowNum,
          guest: allocation.guest_full_name,
          error: `Guest "${allocation.guest_full_name}" not found. Did you mean one of these?`,
          suggestions: similar.map((s) => ({
            name: s.fullName,
            similarity: `${Math.round(s.similarity * 100)}% match`,
            side: s.guest.side,
          })),
        });
      } else {
        errors.push({
          row: rowNum,
          guest: allocation.guest_full_name,
          error: `Guest "${allocation.guest_full_name}" not found. Please check spelling or import the guest first.`,
        });
      }
      continue;
    }

    const groupKey = `${venueId}_${allocation.room_number}_${allocation.check_in_date}_${allocation.check_out_date}`;
    if (!roomGroups.has(groupKey)) {
      roomGroups.set(groupKey, {
        venueId,
        roomNumber: allocation.room_number,
        checkInDate: allocation.check_in_date,
        checkOutDate: allocation.check_out_date,
        guestIds: [],
        guestNames: [],
        firstRow: rowNum,
        ...(allocation.room_type && { roomType: allocation.room_type }),
        ...(allocation.capacity && { capacity: allocation.capacity }),
      });
    }
    const roomGroup = roomGroups.get(groupKey)!;
    roomGroup.guestIds.push(guest.id);
    roomGroup.guestNames.push(allocation.guest_full_name);
  }

  // Resolve rooms and build allocation payloads
  const allocationsToInsert: RoomAllocationInsert[] = [];
  const allocationsToUpdate: {
    id: string;
    guest_ids: string[];
    check_in_date: string;
    check_out_date: string;
  }[] = [];
  const createdRooms: { room_number: string }[] = [];
  const roomCache = new Map<
    string,
    {
      id: string;
      capacity: number;
      room_number: string;
      check_in_date: string | null;
      check_out_date: string | null;
    }
  >();

  // windows already claimed by THIS import, per room and per guest
  const pendingRoomWindows = new Map<
    string,
    { checkIn: string; checkOut: string; count: number }[]
  >();
  const pendingGuestWindows: {
    guestId: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
  }[] = [];
  const overlaps = (aIn: string, aOut: string, bIn: string, bOut: string) =>
    aIn < bOut && aOut > bIn;

  for (const [, group] of roomGroups) {
    const roomKey = `${group.venueId}_${group.roomNumber}`;
    let room = roomCache.get(roomKey);

    if (!room) {
      const existing = await repo.findRoomByNumberAndVenue(group.venueId, group.roomNumber);
      if (existing) {
        room = existing;
      } else {
        const newRoom = await repo.insertRoom({
          venue_id: group.venueId,
          room_number: group.roomNumber,
          room_type: group.roomType || 'Standard Room',
          capacity: Math.max(group.guestIds.length, group.capacity ?? 2),
          rate_per_night: 0,
        });
        room = {
          id: newRoom.id,
          capacity: newRoom.capacity ?? 2,
          room_number: newRoom.room_number,
          check_in_date: newRoom.check_in_date ?? null,
          check_out_date: newRoom.check_out_date ?? null,
        };
        createdRooms.push({ room_number: room.room_number });
      }
      roomCache.set(roomKey, room);
    }

    // --- capacity: consider ALL allocations overlapping this window, not exact matches
    const overlapping = await repo.findOverlappingAllocations(
      room.id,
      group.checkInDate,
      group.checkOutDate,
    );
    const exact = overlapping.find(
      (a) => a.check_in_date === group.checkInDate && a.check_out_date === group.checkOutDate,
    );
    const mergedIds = exact
      ? Array.from(new Set([...((exact.guest_ids as string[]) ?? []), ...group.guestIds]))
      : group.guestIds;
    const othersOccupancy = overlapping
      .filter((a) => a.id !== exact?.id)
      .reduce((sum, a) => sum + ((a.guest_ids as string[]) ?? []).length, 0);
    const pendingOccupancy = (pendingRoomWindows.get(room.id) ?? [])
      .filter((w) => overlaps(w.checkIn, w.checkOut, group.checkInDate, group.checkOutDate))
      .reduce((sum, w) => sum + w.count, 0);
    const capacity = room.capacity ?? 2;
    const finalCount = othersOccupancy + pendingOccupancy + mergedIds.length;

    if (finalCount > capacity) {
      errors.push({
        row: group.firstRow,
        guest: group.guestNames.join(', '),
        error: `Room ${group.roomNumber} sleeps ${capacity}, but ${group.checkInDate} → ${group.checkOutDate} would have ${finalCount} guest${finalCount !== 1 ? 's' : ''} across overlapping stays.`,
      });
      continue;
    }

    // --- booked window: the stay must fall inside the room's booked window
    if (
      (room.check_in_date && group.checkInDate < room.check_in_date) ||
      (room.check_out_date && group.checkOutDate > room.check_out_date)
    ) {
      errors.push({
        row: group.firstRow,
        guest: group.guestNames.join(', '),
        error: `Room ${group.roomNumber} is only booked ${room.check_in_date ?? '…'} → ${room.check_out_date ?? '…'}. Adjust the stay dates.`,
      });
      continue;
    }

    // --- guest double-booking: DB + earlier rows of this same import
    const dbConflicts = await repo.findGuestOverlappingAllocations(
      group.guestIds,
      group.checkInDate,
      group.checkOutDate,
      exact?.id,
    );
    const conflictedIds = new Set(
      dbConflicts.flatMap((c) => (c.guest_ids ?? []).filter((id) => group.guestIds.includes(id))),
    );
    pendingGuestWindows
      .filter(
        (w) =>
          group.guestIds.includes(w.guestId) &&
          overlaps(w.checkIn, w.checkOut, group.checkInDate, group.checkOutDate),
      )
      .forEach((w) => conflictedIds.add(w.guestId));

    if (conflictedIds.size > 0) {
      const names = group.guestNames.filter((_, i) => conflictedIds.has(group.guestIds[i]!));
      errors.push({
        row: group.firstRow,
        guest: names.join(', '),
        error: `Guest${names.length !== 1 ? 's' : ''} ${names.join(', ')} already ${names.length !== 1 ? 'have' : 'has'} a stay overlapping ${group.checkInDate} → ${group.checkOutDate}. Remove the old stay first or change the dates.`,
      });
      continue;
    }

    // --- record what this import will occupy
    const addedCount = exact
      ? mergedIds.length - ((exact.guest_ids as string[]) ?? []).length
      : mergedIds.length;
    const roomWindows = pendingRoomWindows.get(room.id) ?? [];
    roomWindows.push({
      checkIn: group.checkInDate,
      checkOut: group.checkOutDate,
      count: addedCount,
    });
    pendingRoomWindows.set(room.id, roomWindows);
    group.guestIds.forEach((gid, i) =>
      pendingGuestWindows.push({
        guestId: gid,
        guestName: group.guestNames[i] ?? '',
        checkIn: group.checkInDate,
        checkOut: group.checkOutDate,
      }),
    );

    if (exact) {
      allocationsToUpdate.push({
        id: exact.id,
        guest_ids: mergedIds,
        check_in_date: group.checkInDate,
        check_out_date: group.checkOutDate,
      });
    } else {
      allocationsToInsert.push({
        room_id: room.id,
        guest_ids: group.guestIds,
        check_in_date: group.checkInDate,
        check_out_date: group.checkOutDate,
      });
    }
  }

  return { allocationsToInsert, allocationsToUpdate, errors, createdRooms };
}

async function commitAndFormat(
  allocationsToInsert: RoomAllocationInsert[],
  allocationsToUpdate: {
    id: string;
    guest_ids: string[];
    check_in_date: string;
    check_out_date: string;
  }[],
): Promise<FormattedAllocation[]> {
  const formatted: FormattedAllocation[] = [];

  if (allocationsToInsert.length > 0) {
    const inserted = await repo.insertAllocationsBulk(allocationsToInsert);
    inserted.forEach((a) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = a as any;
      formatted.push({
        guest: `${row.guest_ids?.length ?? 0} guest(s)`,
        room: row.rooms?.room_number ?? '',
        venue: row.rooms?.venues?.name ?? '',
        checkIn: row.check_in_date,
        checkOut: row.check_out_date,
        action: 'created',
      });
    });
  }

  for (const upd of allocationsToUpdate) {
    const updated = await repo.updateAllocationWithDetails(upd.id, {
      guest_ids: upd.guest_ids,
      check_in_date: upd.check_in_date,
      check_out_date: upd.check_out_date,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = updated as any;
    formatted.push({
      guest: `${upd.guest_ids.length} guest(s)`,
      room: row.rooms?.room_number ?? '',
      venue: row.rooms?.venues?.name ?? '',
      checkIn: upd.check_in_date,
      checkOut: upd.check_out_date,
      action: 'updated',
    });
  }

  return formatted;
}

export async function importAllocations(
  buffer: Buffer,
  ownerId: string,
  venueId?: string,
  venueName?: string,
) {
  const venue = await repo.findByIdOrNameAndOwner(ownerId, venueId, venueName);
  if (!venue) return { error: `Venue not found. Please create the venue first.` } as const;

  const allocations = parseRoomAllocationExcel(buffer, venue.name);

  if (allocations.length === 0) {
    return {
      error: 'No valid room allocation data found in the Excel file',
      details: 'The file does not contain any room allocation data.',
      hint: 'Make sure you have at least one row with Room Number*, Guest 1, and dates filled in.',
    } as const;
  }

  const invalidAllocations = allocations
    .map((a, i) => ({ index: i + 1, allocation: a, validation: validateRoomAllocation(a) }))
    .filter((r) => !r.validation.isValid);

  if (invalidAllocations.length > 0) {
    return {
      error: 'Validation failed',
      invalidAllocations: invalidAllocations.map((r) => ({
        row: r.index,
        guest: r.allocation.guest_full_name,
        errors: r.validation.errors,
      })),
    } as const;
  }

  const { allocationsToInsert, allocationsToUpdate, errors, createdRooms } =
    await processAllocations(allocations, ownerId, () => venue.id);

  if (errors.length > 0 && allocationsToInsert.length === 0 && allocationsToUpdate.length === 0) {
    return { error: 'All allocations failed to process', errors } as const;
  }

  const allFormatted = await commitAndFormat(allocationsToInsert, allocationsToUpdate);

  return {
    message: 'Room allocations imported successfully',
    count: allFormatted.length,
    created: allocationsToInsert.length,
    updated: allocationsToUpdate.length,
    hotel: venue.name,
    allocations: allFormatted,
    ...(createdRooms.length > 0 && {
      roomsCreated: createdRooms.length,
      newRooms: createdRooms.map((r) => r.room_number),
    }),
    ...(errors.length > 0 && { partialSuccess: true, failedCount: errors.length, errors }),
  };
}

export async function importAllVenuesAllocations(buffer: Buffer, ownerId: string) {
  const venues = await repo.findAllIdNameByOwner(ownerId);

  if (venues.length === 0) {
    return {
      error:
        'No accommodation venues found. Please create venues with "Has Accommodation" enabled first.',
    } as const;
  }

  const venuesMap: Record<string, { id: string; name: string }> = {};
  venues.forEach((v) => {
    venuesMap[v.name.toLowerCase()] = v;
  });

  const allocations = parseMultiVenueAllocationExcel(buffer, venuesMap);

  if (allocations.length === 0) {
    return {
      error: 'No valid room allocation data found in the Excel file',
      details: 'The file does not contain any room allocation data.',
      hint: 'Make sure you have at least one row with Room Number*, Guest 1, and dates filled in on any venue sheet.',
    } as const;
  }

  const invalidAllocations = allocations
    .map((a, i) => ({ index: i + 1, allocation: a, validation: validateRoomAllocation(a) }))
    .filter((r) => !r.validation.isValid);

  if (invalidAllocations.length > 0) {
    return {
      error: 'Validation failed',
      invalidAllocations: invalidAllocations.map((r) => {
        const a = r.allocation as ParsedMultiVenueAllocation;
        return {
          row: r.index,
          sheet: a.sheet_name,
          guest: a.guest_full_name,
          errors: r.validation.errors,
        };
      }),
    } as const;
  }

  const getVenueId = (allocation: ParsedAllocation): string | null => {
    const key = allocation.hotel_name.toLowerCase();
    const venue =
      venuesMap[key] ??
      Object.values(venuesMap).find(
        (v) => v.name.toLowerCase().includes(key) || key.includes(v.name.toLowerCase()),
      );
    return venue?.id ?? null;
  };

  const { allocationsToInsert, allocationsToUpdate, errors, createdRooms } =
    await processAllocations(allocations, ownerId, getVenueId);

  if (errors.length > 0 && allocationsToInsert.length === 0 && allocationsToUpdate.length === 0) {
    return { error: 'All allocations failed to process', errors } as const;
  }

  const allFormatted = await commitAndFormat(allocationsToInsert, allocationsToUpdate);

  return {
    message: 'Room allocations imported successfully',
    count: allFormatted.length,
    created: allocationsToInsert.length,
    updated: allocationsToUpdate.length,
    allocations: allFormatted,
    ...(createdRooms.length > 0 && { roomsCreated: createdRooms.length, newRooms: createdRooms }),
    ...(errors.length > 0 && { partialSuccess: true, failedCount: errors.length, errors }),
  };
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function getVenuePayments(venueId: string, ownerId: string) {
  const finance = await getSourceExpense(ownerId, 'venue', venueId);
  return finance?.payments ?? [];
}

export async function addVenuePayment(
  venueId: string,
  ownerId: string,
  actorId: string,
  payload: PaymentMutationInput,
) {
  const finance = await getSourceExpense(ownerId, 'venue', venueId);
  if (!finance) {
    throw new NotFoundError('Create a venue obligation before recording payments.');
  }
  return createExpensePayment(ownerId, actorId, finance.id, payload);
}

export async function deleteVenuePayment(paymentId: string, ownerId: string, actorId: string) {
  return deleteExpensePayment(ownerId, actorId, paymentId);
}
