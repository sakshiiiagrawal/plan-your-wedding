import { NotFoundError, BadRequestError } from '../shared/errors/HttpError';
import type { GuestInsert, GuestGroupInsert } from '@wedding-planner/shared';
import * as repo from '../repositories/guests.repository';
import type { GuestFilters } from '../repositories/guests.repository';
import * as eventsRepo from '../repositories/events.repository';
import { parseGuestExcel, validateGuest, generateGuestTemplate } from '../excel/guests.excel';

/**
 * Collapse per-event RSVPs into one guest-level status:
 * confirmed if the guest confirmed any event, declined if they declined
 * every event they're linked to, tentative if any event is tentative,
 * pending otherwise (including no events).
 */
function aggregateRsvpStatus(rsvps: { rsvp_status: string }[]): string {
  if (rsvps.length === 0) return 'pending';
  if (rsvps.some((r) => r.rsvp_status === 'confirmed')) return 'confirmed';
  if (rsvps.every((r) => r.rsvp_status === 'declined')) return 'declined';
  if (rsvps.some((r) => r.rsvp_status === 'tentative')) return 'tentative';
  return 'pending';
}

export async function listGuests(ownerId: string, filters: GuestFilters) {
  const guests = await repo.findAllByOwner(ownerId, filters);
  return guests.map((g) => ({
    ...g,
    rsvp_status: aggregateRsvpStatus(g.guest_event_rsvp ?? []),
  }));
}

export async function getGuestSummary(ownerId: string) {
  const { guests, rsvps } = await repo.findSummaryByOwner(ownerId);

  const rsvpsByGuest = new Map<string, { rsvp_status: string; plus_ones: number | null }[]>();
  for (const r of rsvps) {
    const list = rsvpsByGuest.get(r.guest_id) ?? [];
    list.push(r);
    rsvpsByGuest.set(r.guest_id, list);
  }

  let confirmed = 0;
  let declined = 0;
  let plusOnes = 0;
  for (const g of guests) {
    const guestRsvps = rsvpsByGuest.get(g.id) ?? [];
    const status = aggregateRsvpStatus(guestRsvps);
    if (status === 'confirmed') {
      confirmed++;
      // Only confirmed guests add companions to the headcount; a guest brings the
      // same companions to each event, so take their max across events, not the sum.
      plusOnes += guestRsvps.reduce((max, r) => Math.max(max, r.plus_ones ?? 0), 0);
    } else if (status === 'declined') declined++;
  }

  return {
    total: guests.length,
    bride: guests.filter((g) => g.side === 'bride').length,
    groom: guests.filter((g) => g.side === 'groom').length,
    confirmed,
    pending: guests.length - confirmed - declined,
    declined,
    plusOnes,
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
  const guest = await repo.insertGuest({
    ...guestData,
    user_id: ownerId,
    created_by: userId ?? ownerId,
  });

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

/** Reject event ids that don't belong to this wedding (client-supplied). */
async function assertEventsBelongToOwner(ownerId: string, eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  const ownerEventIds = new Set((await eventsRepo.findAllByOwner(ownerId)).map((e) => e.id));
  if (eventIds.some((id) => !ownerEventIds.has(id))) {
    throw new BadRequestError('One or more events do not belong to this wedding');
  }
}

export async function bulkCreateGuests(
  guests: ({ events?: string[] } & Omit<GuestInsert, 'user_id'>)[],
  ownerId: string,
  userId?: string,
) {
  // `events` is not a column on guests — strip it before insert, link after
  const eventsPerGuest = guests.map((g) => g.events ?? []);
  await assertEventsBelongToOwner(ownerId, eventsPerGuest.flat());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const payloads = guests.map(({ events, ...g }) => ({
    ...g,
    user_id: ownerId,
    created_by: userId ?? ownerId,
  }));
  // insertGuestsBulk expects ParsedGuest & { user_id }, but Omit<GuestInsert, 'user_id'> is compatible
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const created = await repo.insertGuestsBulk(payloads as any);

  // Insert preserves row order, so created[i] pairs with eventsPerGuest[i]
  const rsvpEntries = created.flatMap((guest, i) =>
    (eventsPerGuest[i] ?? []).map((eventId) => ({
      guest_id: guest.id,
      event_id: eventId,
      rsvp_status: 'pending' as const,
    })),
  );
  if (rsvpEntries.length > 0) await repo.insertRsvpEntries(rsvpEntries);

  return { created: created.length, guests: created };
}

export async function updateGuest(
  id: string,
  ownerId: string,
  payload: { events?: string[] } & Partial<GuestInsert>,
  userId?: string,
) {
  await getGuest(id, ownerId);
  const { events, ...guestData } = payload;

  // Sync event links when the form sends them: drop removed events, add new ones
  if (events !== undefined) {
    const existing = await repo.findRsvpsByGuest(id);
    const existingIds = new Set(existing.map((r) => r.event_id));
    const changed = events.length !== existingIds.size || events.some((e) => !existingIds.has(e));
    if (changed) {
      await assertEventsBelongToOwner(ownerId, events);
      await repo.deleteRsvpsForGuestExcept(id, events);
      const toAdd = events.filter((eventId) => !existingIds.has(eventId));
      if (toAdd.length > 0) {
        await repo.insertRsvpEntries(
          toAdd.map((eventId) => ({
            guest_id: id,
            event_id: eventId,
            rsvp_status: 'pending' as const,
          })),
        );
      }
    }
  }

  return repo.updateGuest(id, ownerId, { ...guestData, updated_by: userId ?? ownerId });
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
    // Dashboard-entered: authoritative over later public-form submissions
    responded_via_public: false,
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

/**
 * Set a guest's RSVP across the whole wedding. Applies to every event the
 * guest is linked to; a guest not linked to any event yet gets linked to all
 * of the wedding's events so the response is actually recorded.
 */
export async function setOverallRsvp(
  guestId: string,
  ownerId: string,
  payload: {
    rsvp_status: 'pending' | 'confirmed' | 'declined' | 'tentative';
    plus_ones?: number;
    notes?: string;
  },
) {
  await getGuest(guestId, ownerId);

  const existing = await repo.findRsvpsByGuest(guestId);
  const update: Record<string, unknown> = {
    rsvp_status: payload.rsvp_status,
    responded_at: new Date().toISOString(),
    // Couple-entered responses are authoritative; a later public-form
    // submission by the guest may not overwrite them.
    responded_via_public: false,
  };
  if (payload.plus_ones !== undefined) update.plus_ones = payload.plus_ones;
  if (payload.notes !== undefined) update.notes = payload.notes;

  if (existing.length > 0) {
    return repo.updateAllRsvpsForGuest(guestId, update);
  }

  const events = await eventsRepo.findAllByOwner(ownerId);
  if (events.length === 0) {
    throw new BadRequestError('Create at least one event before recording RSVPs.');
  }
  return repo.insertRsvpEntries(
    events.map((e) => ({
      guest_id: guestId,
      event_id: e.id,
      ...update,
    })) as Parameters<typeof repo.insertRsvpEntries>[0],
  );
}

/**
 * Public RSVP from the wedding website: matches an existing guest by name
 * (guests are pre-registered by the couple) and records their response.
 *
 * Rows the couple set explicitly in the dashboard are never overwritten, but
 * rows the guest previously submitted through this form are — so a guest can
 * correct their own mistake. `event_ids` (events the guest will attend) allows
 * a per-event breakdown; omitted, the response applies to every event.
 */
export async function submitPublicRsvp(
  slug: string,
  payload: {
    first_name: string;
    last_name?: string | null;
    attending: boolean;
    event_ids?: string[];
    plus_ones?: number;
    notes?: string | null;
  },
) {
  const ownerId = await eventsRepo.findOwnerBySlug(slug);
  if (!ownerId) throw new NotFoundError('Wedding not found');

  const guest = await repo.findGuestByNameAndOwner(ownerId, payload.first_name, payload.last_name);
  if (!guest) {
    throw new NotFoundError(
      "We couldn't find you on the guest list. Please check the spelling of your name, or contact the couple directly.",
    );
  }

  const events = await eventsRepo.findAllByOwner(ownerId);
  if (events.length === 0) {
    throw new BadRequestError(
      "The couple hasn't finished setting up their events yet. Please try again later or contact them directly.",
    );
  }

  // Events the guest is attending; declining, or picking none valid (e.g. a
  // stale form after an event was deleted), falls back to all-or-nothing.
  const validIds = new Set(events.map((e) => e.id));
  let attendingIds = new Set<string>();
  if (payload.attending) {
    const picked = (payload.event_ids ?? []).filter((id) => validIds.has(id));
    attendingIds = picked.length > 0 ? new Set(picked) : validIds;
  }

  const existing = await repo.findRsvpsByGuest(guest.id);
  const rowByEvent = new Map(existing.map((r) => [r.event_id, r]));
  const base: Record<string, unknown> = {
    responded_at: new Date().toISOString(),
    responded_via_public: true,
  };
  if (payload.plus_ones !== undefined) base.plus_ones = payload.plus_ones;
  if (payload.notes != null && payload.notes.trim() !== '') base.notes = payload.notes;

  let recorded = 0;
  for (const event of events) {
    const row = rowByEvent.get(event.id);
    // Couple-entered responses stay authoritative on the public path
    if (row && row.rsvp_status !== 'pending' && !row.responded_via_public) continue;
    // Don't spam declined rows onto events the couple never linked this guest
    // to — but do record a self-declared "attending" so the couple sees it.
    if (!row && existing.length > 0 && !attendingIds.has(event.id)) continue;
    await repo.upsertRsvp({
      guest_id: guest.id,
      event_id: event.id,
      rsvp_status: attendingIds.has(event.id) ? 'confirmed' : 'declined',
      ...base,
    } as Parameters<typeof repo.upsertRsvp>[0]);
    recorded += 1;
  }

  // Every row was couple-entered — nothing changed, so don't claim it did
  if (recorded === 0) {
    return {
      message:
        'The couple has already recorded your RSVP. If anything changed, please contact them directly.',
    };
  }

  return { message: 'RSVP recorded. Thank you!' };
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
