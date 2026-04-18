import { NotFoundError } from '../shared/errors/HttpError';
import type { GuestInsert, GuestGroupInsert } from '@wedding-planner/shared';
import * as repo from '../repositories/guests.repository';
import type { GuestFilters } from '../repositories/guests.repository';
import { parseGuestExcel, validateGuest, generateGuestTemplate } from '../excel/guests.excel';

export async function listGuests(ownerId: string, filters: GuestFilters) {
  return repo.findAllByOwner(ownerId, filters);
}

export async function getGuestSummary(ownerId: string) {
  const { guests, rsvps } = await repo.findSummaryByOwner(ownerId);

  return {
    total: guests.length,
    bride: guests.filter((g) => g.side === 'bride').length,
    groom: guests.filter((g) => g.side === 'groom').length,
    confirmed: rsvps.filter((r) => r.rsvp_status === 'confirmed').length,
    pending: rsvps.filter((r) => r.rsvp_status === 'pending').length,
    declined: rsvps.filter((r) => r.rsvp_status === 'declined').length,
    plusOnes: rsvps.reduce((sum, r) => sum + (r.plus_ones ?? 0), 0),
  };
}

export async function getGuest(id: string, ownerId: string) {
  const guest = await repo.findByIdAndOwner(id, ownerId);
  if (!guest) throw new NotFoundError('Guest not found');
  return guest;
}

export async function createGuest(
  body: { events?: string[] } & Omit<GuestInsert, 'user_id'>,
  ownerId: string,
  userId?: string,
) {
  const { events, ...guestData } = body;
  const guest = await repo.insertGuest({ ...guestData, user_id: ownerId, created_by: userId ?? ownerId });

  if (events && events.length > 0) {
    const rsvpEntries = events.map((eventId) => ({
      guest_id: guest.id,
      event_id: eventId,
      rsvp_status: 'pending' as const,
    }));
    await repo.insertRsvpEntries(rsvpEntries);
  }

  return guest;
}

export async function bulkCreateGuests(guests: Omit<GuestInsert, 'user_id'>[], ownerId: string, userId?: string) {
  const payloads = guests.map((g) => ({ ...g, user_id: ownerId, created_by: userId ?? ownerId }));
  // insertGuestsBulk expects ParsedGuest & { user_id }, but Omit<GuestInsert, 'user_id'> is compatible
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const created = await repo.insertGuestsBulk(payloads as any);
  return { created: created.length, guests: created };
}

export async function updateGuest(id: string, ownerId: string, payload: Partial<GuestInsert>, userId?: string) {
  await getGuest(id, ownerId);
  return repo.updateGuest(id, ownerId, { ...payload, updated_by: userId ?? ownerId });
}

export async function deleteGuest(id: string, ownerId: string) {
  await getGuest(id, ownerId);
  return repo.deleteGuest(id, ownerId);
}

export async function deleteGuestsBulk(ids: string[], ownerId: string) {
  return repo.deleteGuestsBulk(ids, ownerId);
}

export async function updateRsvp(
  guestId: string,
  eventId: string,
  payload: {
    rsvp_status?: string;
    plus_ones?: number;
    plus_one_names?: string[];
    notes?: string;
  },
) {
  const upsertPayload: Parameters<typeof repo.upsertRsvp>[0] = {
    guest_id: guestId,
    event_id: eventId,
    responded_at: new Date().toISOString(),
  };
  if (payload.rsvp_status !== undefined) {
    upsertPayload.rsvp_status = payload.rsvp_status as
      | 'pending'
      | 'confirmed'
      | 'declined'
      | 'tentative';
  }
  if (payload.plus_ones !== undefined) upsertPayload.plus_ones = payload.plus_ones;
  if (payload.plus_one_names !== undefined) upsertPayload.plus_one_names = payload.plus_one_names;
  if (payload.notes !== undefined) upsertPayload.notes = payload.notes;

  return repo.upsertRsvp(upsertPayload);
}

export async function listGroups(ownerId: string) {
  return repo.findGroupsByOwner(ownerId);
}

export async function createGroup(payload: Omit<GuestGroupInsert, 'user_id'>, ownerId: string) {
  return repo.insertGroup({ ...payload, user_id: ownerId });
}

export async function getImportTemplate(): Promise<Buffer> {
  return generateGuestTemplate();
}

export async function importGuests(buffer: Buffer, ownerId: string) {
  const parsed = parseGuestExcel(buffer);

  if (parsed.length === 0) {
    return {
      error: 'No valid guest data found in the Excel file',
      details: 'The file does not contain any guest data rows.',
      hint: 'Make sure you have at least one row with First Name* and Side* filled in.',
    } as const;
  }

  const validationResults = parsed.map((guest, index) => ({
    index: index + 1,
    guest,
    validation: validateGuest(guest),
  }));

  const invalid = validationResults.filter((r) => !r.validation.isValid);
  if (invalid.length > 0) {
    return {
      error: 'Validation failed',
      invalidGuests: invalid.map((r) => ({ row: r.index, errors: r.validation.errors })),
    } as const;
  }

  const created = await repo.insertGuestsBulk(parsed.map((g) => ({ ...g, user_id: ownerId })));

  return {
    message: 'Guests imported successfully',
    count: created.length,
    guests: created,
  } as const;
}
