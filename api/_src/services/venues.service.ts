import { NotFoundError, BadRequestError, ConflictError } from '../shared/errors/HttpError';
import type {
  VenueInsert,
  VenueRow,
  RoomInsert,
  RoomAllocationInsert,
  VenueWithFinance,
} from '@wedding-planner/shared';
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

  const items = await buildVenueSourceItems(
    ownerId,
    payload.venue_type ?? null,
    payload.name,
    payload.total_cost ?? null,
    payload.side ?? 'shared',
    payload.bride_share_percentage ?? null,
  );

  return {
    description: payload.name,
    expense_date: normalizeDate(payload.expense_date),
    notes: payload.notes ?? null,
    items,
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

export async function listVenues(ownerId: string): Promise<Array<VenueWithEventSummary & { expense_id: string | null }>> {
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

export async function getVenue(id: string, ownerId: string): Promise<VenueWithEventSummary & { expense_id: string | null }> {
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
): Promise<VenueRow> {
  return withPgTransaction(async (client) => {
    const { rooms = [], total_cost, expense_date, side, bride_share_percentage, finance, ...venuePayload } = payload as typeof payload;
    const { rows } = await client.query<Record<string, unknown>>(
      `
        INSERT INTO venues (
          user_id,
          name,
          venue_type,
          address,
          city,
          google_maps_link,
          contact_person,
          contact_phone,
          capacity,
          has_accommodation,
          default_check_in_date,
          default_check_out_date,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `,
      [
        ownerId,
        venuePayload.name,
        venuePayload.venue_type ?? null,
        venuePayload.address ?? null,
        venuePayload.city ?? null,
        venuePayload.google_maps_link ?? null,
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
            notes
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          venue.id,
          room.room_number,
          room.room_type,
          room.capacity ?? null,
          room.rate_per_night ?? null,
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
    await upsertSourceExpenseTx(client, ownerId, 'venue', venue.id, financeInput);
    return venue;
  });
}

export async function updateVenue(
  id: string,
  ownerId: string,
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
      google_maps_link: venuePayload.google_maps_link ?? existing.google_maps_link,
      contact_person: venuePayload.contact_person ?? existing.contact_person,
      contact_phone: venuePayload.contact_phone ?? existing.contact_phone,
      capacity: venuePayload.capacity ?? existing.capacity,
      has_accommodation: venuePayload.has_accommodation ?? existing.has_accommodation,
      default_check_in_date:
        venuePayload.default_check_in_date ?? existing.default_check_in_date,
      default_check_out_date:
        venuePayload.default_check_out_date ?? existing.default_check_out_date,
      notes: venuePayload.notes ?? existing.notes,
    };

    const { rows } = await client.query<Record<string, unknown>>(
      `
        UPDATE venues
        SET
          name = $3,
          venue_type = $4,
          address = $5,
          city = $6,
          google_maps_link = $7,
          contact_person = $8,
          contact_phone = $9,
          capacity = $10,
          has_accommodation = $11,
          default_check_in_date = $12,
          default_check_out_date = $13,
          notes = $14
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
        nextValues.google_maps_link,
        nextValues.contact_person,
        nextValues.contact_phone,
        nextValues.capacity,
        nextValues.has_accommodation,
        nextValues.default_check_in_date,
        nextValues.default_check_out_date,
        nextValues.notes,
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
            notes
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          venue.id,
          room.room_number,
          room.room_type,
          room.capacity ?? null,
          room.rate_per_night ?? null,
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

    const shouldTouchFinance =
      finance !== undefined ||
      total_cost !== undefined ||
      expense_date !== undefined ||
      side !== undefined ||
      bride_share_percentage !== undefined ||
      payload.name !== undefined;

    if (shouldTouchFinance) {
      const financeInput =
        finance != null || total_cost !== undefined
          ? await extractVenueFinanceInput(ownerId, {
              name: venue.name,
              venue_type: venue.venue_type,
              total_cost: total_cost ?? linkedExpense?.summary.committed_amount ?? null,
              expense_date: expense_date ?? linkedExpense?.expense_date ?? null,
              side: side ?? 'shared',
              bride_share_percentage: bride_share_percentage ?? null,
              notes: venue.notes,
              finance: finance ?? null,
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
      await upsertSourceExpenseTx(client, ownerId, 'venue', id, financeInput);
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
      await client.query(`DELETE FROM expenses WHERE id = $1 AND user_id = $2`, [expenseId, ownerId]);
    }

    await client.query(`DELETE FROM venues WHERE id = $1 AND user_id = $2`, [id, ownerId]);
  });
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export async function getRooms(venueId: string) {
  return repo.findRoomsByVenue(venueId);
}

export async function addRoom(venueId: string, payload: Omit<RoomInsert, 'venue_id'>) {
  return repo.insertRoom({ ...payload, venue_id: venueId });
}

export async function updateRoom(
  id: string,
  payload: Partial<Pick<RoomInsert, 'room_number' | 'capacity' | 'room_type' | 'rate_per_night' | 'notes'>>,
) {
  // If lowering capacity, make sure it doesn't go below current occupancy
  if (payload.capacity !== undefined) {
    const existing = await repo.findRoomById(id);
    if (existing) {
      const allocs = await repo.findAllocationsByRoom(id);
      const occupancy = allocs.reduce((sum, a) => sum + ((a.guest_ids as string[])?.length ?? 0), 0);
      if (payload.capacity < occupancy) {
        throw new BadRequestError(
          `Cannot set capacity to ${payload.capacity} — room currently has ${occupancy} guest${occupancy !== 1 ? 's' : ''} assigned.`,
        );
      }
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

async function checkRoomCapacity(roomId: string, guestCount: number) {
  const room = await repo.findRoomById(roomId);
  if (!room) throw new NotFoundError('Room not found');
  const capacity = room.capacity ?? 0;
  if (guestCount > capacity) {
    throw new BadRequestError(
      `Room ${room.room_number} has a capacity of ${capacity}. You tried to assign ${guestCount} guest${guestCount !== 1 ? 's' : ''}.`,
    );
  }
}

export async function createAllocation(payload: RoomAllocationInsert) {
  await checkRoomCapacity(payload.room_id, (payload.guest_ids ?? []).length);
  return repo.insertAllocation(payload);
}

export async function updateAllocation(id: string, payload: Partial<RoomAllocationInsert>) {
  if (payload.room_id && payload.guest_ids) {
    await checkRoomCapacity(payload.room_id, payload.guest_ids.length);
  } else if (payload.guest_ids) {
    // room_id not changing — fetch it from the existing allocation
    const existing = await repo.findAllocationById(id);
    if (existing) await checkRoomCapacity(existing.room_id, payload.guest_ids.length);
  }
  return repo.updateAllocation(id, payload);
}

export async function deleteAllocation(id: string) {
  return repo.deleteAllocation(id);
}

export async function getUnassignedGuests(ownerId: string) {
  return repo.findUnassignedGuests(ownerId);
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
      });
    }
    roomGroups.get(groupKey)!.guestIds.push(guest.id);
  }

  // Resolve rooms and build allocation payloads
  const allocationsToInsert: RoomAllocationInsert[] = [];
  const allocationsToUpdate: { id: string; guest_ids: string[]; check_in_date: string; check_out_date: string }[] = [];
  const createdRooms: { room_number: string }[] = [];
  const roomCache = new Map<string, { id: string; capacity: number; room_number: string }>();

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
          room_type: 'Standard Room',
          capacity: Math.max(group.guestIds.length, 2),
          rate_per_night: 0,
        });
        room = {
          id: newRoom.id,
          capacity: newRoom.capacity ?? 2,
          room_number: newRoom.room_number,
        };
        createdRooms.push({ room_number: room.room_number });
      }
      roomCache.set(roomKey, room);
    }

    const existing = await repo.findAllocationForRoom(room.id, group.checkInDate);

    if (existing) {
      // Merge guest IDs (avoid duplicates)
      const mergedIds = Array.from(
        new Set([...(existing.guest_ids ?? []), ...group.guestIds]),
      );
      allocationsToUpdate.push({
        id: existing.id,
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
  allocationsToUpdate: { id: string; guest_ids: string[]; check_in_date: string; check_out_date: string }[],
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
      error: 'No accommodation venues found. Please create venues with "Has Accommodation" enabled first.',
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
  payload: PaymentMutationInput,
) {
  const finance = await getSourceExpense(ownerId, 'venue', venueId);
  if (!finance) {
    throw new NotFoundError('Create a venue obligation before recording payments.');
  }
  return createExpensePayment(ownerId, finance.id, payload);
}

export async function deleteVenuePayment(paymentId: string, ownerId: string) {
  return deleteExpensePayment(ownerId, paymentId);
}
