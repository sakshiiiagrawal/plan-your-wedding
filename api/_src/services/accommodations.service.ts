import { NotFoundError } from '../shared/errors/HttpError';
import type {
  AccommodationInsert,
  RoomInsert,
  RoomAllocationInsert,
} from '@wedding-planner/shared';
import * as repo from '../repositories/accommodations.repository';
import {
  generateRoomAllocationTemplate,
  generateAllVenuesAllocationTemplate,
  parseRoomAllocationExcel,
  parseMultiVenueAllocationExcel,
  validateRoomAllocation,
  findSimilarGuests,
  type ParsedAllocation,
  type ParsedMultiVenueAllocation,
} from '../excel/accommodations.excel';

// ---------------------------------------------------------------------------
// Accommodations CRUD
// ---------------------------------------------------------------------------

export async function listAccommodations(ownerId: string) {
  return repo.findAllByOwner(ownerId);
}

export async function getAccommodation(id: string, ownerId: string) {
  const acc = await repo.findByIdAndOwner(id, ownerId);
  if (!acc) throw new NotFoundError('Accommodation not found');
  return acc;
}

export async function createAccommodation(
  payload: Omit<AccommodationInsert, 'user_id'>,
  ownerId: string,
) {
  return repo.insertAccommodation({ ...payload, user_id: ownerId });
}

export async function updateAccommodation(
  id: string,
  ownerId: string,
  payload: Partial<AccommodationInsert>,
) {
  await getAccommodation(id, ownerId);
  return repo.updateAccommodation(id, ownerId, payload);
}

export async function deleteAccommodation(id: string, ownerId: string) {
  await getAccommodation(id, ownerId);
  return repo.deleteAccommodation(id, ownerId);
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export async function getRooms(accommodationId: string) {
  return repo.findRoomsByAccommodation(accommodationId);
}

export async function addRoom(
  accommodationId: string,
  payload: Omit<RoomInsert, 'accommodation_id'>,
) {
  return repo.insertRoom({ ...payload, accommodation_id: accommodationId });
}

// ---------------------------------------------------------------------------
// Allocations
// ---------------------------------------------------------------------------

export async function getAllocations() {
  return repo.findAllAllocations();
}

export async function getAllocationMatrix(ownerId: string) {
  return repo.findAllocationMatrix(ownerId);
}

export async function createAllocation(payload: RoomAllocationInsert) {
  return repo.insertAllocation(payload);
}

export async function updateAllocation(id: string, payload: Partial<RoomAllocationInsert>) {
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
  hotelId?: string,
  hotelName?: string,
): Promise<{ buffer: Buffer; filename: string } | { error: string }> {
  let name = hotelName;

  if (hotelId && !hotelName) {
    const hotel = await repo.findByIdOrNameAndOwner(ownerId, hotelId);
    if (!hotel) return { error: 'Hotel not found' };
    name = hotel.name;
  }

  const guests = await repo.findGuestsForTemplate(ownerId);
  const buffer = generateRoomAllocationTemplate(name ?? 'Hotel Name', guests);
  const filename = name
    ? `${name.replace(/\s+/g, '_')}_room_allocation.xlsx`
    : 'room_allocation_template.xlsx';

  return { buffer, filename };
}

// ---------------------------------------------------------------------------
// Excel template download — all venues
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

async function processAllocations(
  allocations: ParsedAllocation[],
  ownerId: string,
  getAccommodationId: (allocation: ParsedAllocation) => string | null,
) {
  const allGuests = await repo.findGuestsByOwner(ownerId);
  const processedAllocations: RoomAllocationInsert[] = [];
  const allocationsToUpdate: { id: string; check_in_date: string; check_out_date: string }[] = [];
  const errors: ImportError[] = [];
  const createdRooms: { room_number: string }[] = [];
  const roomCache: Record<string, { id: string; capacity: number; room_number: string }> = {};

  for (let i = 0; i < allocations.length; i++) {
    const allocation = allocations[i]!;
    const rowNum = i + 1;

    try {
      const accommodationId = getAccommodationId(allocation);
      if (!accommodationId) {
        errors.push({
          row: rowNum,
          guest: allocation.guest_full_name,
          error: `Venue "${allocation.hotel_name}" not found. Please create it first.`,
        });
        continue;
      }

      const roomKey = `${accommodationId}_${allocation.room_number}`;
      let room = roomCache[roomKey];

      if (!room) {
        const existing = await repo.findRoomByNumberAndAccommodation(
          accommodationId,
          allocation.room_number,
        );
        if (existing) {
          room = existing;
        } else {
          const guestsInRoom = allocations.filter(
            (a) =>
              a.room_number === allocation.room_number && getAccommodationId(a) === accommodationId,
          ).length;
          const newRoom = await repo.insertRoom({
            accommodation_id: accommodationId,
            room_number: allocation.room_number,
            room_type: 'double',
            capacity: Math.max(guestsInRoom, 2),
            rate_per_night: 0,
          });
          room = {
            id: newRoom.id,
            capacity: newRoom.capacity ?? 2,
            room_number: newRoom.room_number,
          };
          createdRooms.push({ room_number: room.room_number });
        }
        roomCache[roomKey] = room;
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

      const existingAllocations = await repo.findExistingAllocationsForRoom(room.id);
      const existing = existingAllocations.find((a) => a.guest_id === guest.id);

      if (existing) {
        allocationsToUpdate.push({
          id: existing.id,
          check_in_date: allocation.check_in_date,
          check_out_date: allocation.check_out_date,
        });
        continue;
      }

      if (existingAllocations.length >= room.capacity) {
        errors.push({
          row: rowNum,
          guest: allocation.guest_full_name,
          error: `Room "${allocation.room_number}" is at full capacity (${room.capacity} guests)`,
        });
        continue;
      }

      processedAllocations.push({
        room_id: room.id,
        guest_id: guest.id,
        check_in_date: allocation.check_in_date,
        check_out_date: allocation.check_out_date,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ row: rowNum, guest: allocation.guest_full_name, error: message });
    }
  }

  return { processedAllocations, allocationsToUpdate, errors, createdRooms };
}

async function commitAndFormat(
  processedAllocations: RoomAllocationInsert[],
  allocationsToUpdate: { id: string; check_in_date: string; check_out_date: string }[],
): Promise<FormattedAllocation[]> {
  const formatted: FormattedAllocation[] = [];

  if (processedAllocations.length > 0) {
    const inserted = await repo.insertAllocationsBulk(processedAllocations);
    inserted.forEach((a) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = a as any;
      formatted.push({
        guest: `${row.guests.first_name} ${row.guests.last_name ?? ''}`.trim(),
        room: row.rooms.room_number,
        venue: row.rooms.accommodations.name,
        checkIn: row.check_in_date,
        checkOut: row.check_out_date,
        action: 'created',
      });
    });
  }

  for (const upd of allocationsToUpdate) {
    const updated = await repo.updateAllocationWithDetails(upd.id, {
      check_in_date: upd.check_in_date,
      check_out_date: upd.check_out_date,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = updated as any;
    formatted.push({
      guest: `${row.guests.first_name} ${row.guests.last_name ?? ''}`.trim(),
      room: row.rooms.room_number,
      venue: row.rooms.accommodations.name,
      checkIn: row.check_in_date,
      checkOut: row.check_out_date,
      action: 'updated',
    });
  }

  return formatted;
}

export async function importAllocations(
  buffer: Buffer,
  ownerId: string,
  hotelId?: string,
  hotelName?: string,
) {
  const hotel = await repo.findByIdOrNameAndOwner(ownerId, hotelId, hotelName);
  if (!hotel) return { error: `Hotel not found. Please create the hotel first.` } as const;

  const allocations = parseRoomAllocationExcel(buffer, hotel.name);

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

  const { processedAllocations, allocationsToUpdate, errors, createdRooms } =
    await processAllocations(allocations, ownerId, () => hotel.id);

  if (errors.length > 0 && processedAllocations.length === 0 && allocationsToUpdate.length === 0) {
    return { error: 'All allocations failed to process', errors } as const;
  }

  const allFormatted = await commitAndFormat(processedAllocations, allocationsToUpdate);

  return {
    message: 'Room allocations imported successfully',
    count: allFormatted.length,
    created: processedAllocations.length,
    updated: allocationsToUpdate.length,
    hotel: hotel.name,
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
      error: 'No venues found. Please create venues/hotels first before importing allocations.',
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

  const getAccommodationId = (allocation: ParsedAllocation): string | null => {
    const key = allocation.hotel_name.toLowerCase();
    const venue =
      venuesMap[key] ??
      Object.values(venuesMap).find(
        (v) => v.name.toLowerCase().includes(key) || key.includes(v.name.toLowerCase()),
      );
    return venue?.id ?? null;
  };

  const { processedAllocations, allocationsToUpdate, errors, createdRooms } =
    await processAllocations(allocations, ownerId, getAccommodationId);

  if (errors.length > 0 && processedAllocations.length === 0 && allocationsToUpdate.length === 0) {
    return { error: 'All allocations failed to process', errors } as const;
  }

  const allFormatted = await commitAndFormat(processedAllocations, allocationsToUpdate);

  return {
    message: 'Room allocations imported successfully',
    count: allFormatted.length,
    created: processedAllocations.length,
    updated: allocationsToUpdate.length,
    allocations: allFormatted,
    ...(createdRooms.length > 0 && { roomsCreated: createdRooms.length, newRooms: createdRooms }),
    ...(errors.length > 0 && { partialSuccess: true, failedCount: errors.length, errors }),
  };
}
