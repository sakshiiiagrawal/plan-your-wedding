import { NotFoundError } from '../shared/errors/HttpError';
import type {
  EventInsert,
  EventRow,
  EventWithVenue,
  PublicEventPayload,
} from '../../../shared/src';
import * as repo from '../repositories/events.repository';

export async function listEvents(ownerId: string): Promise<EventWithVenue[]> {
  return repo.findAllByOwner(ownerId);
}

export async function getEvent(id: string, ownerId: string): Promise<EventWithVenue> {
  const event = await repo.findByIdAndOwner(id, ownerId);
  if (!event) throw new NotFoundError('Event not found');
  return event;
}

export async function createEvent(
  payload: Omit<EventInsert, 'user_id'>,
  ownerId: string,
): Promise<EventRow> {
  return repo.insertEvent({ ...payload, user_id: ownerId });
}

export async function updateEvent(
  id: string,
  ownerId: string,
  payload: Partial<EventInsert>,
): Promise<EventRow> {
  // Verify ownership first
  await getEvent(id, ownerId);
  return repo.updateEvent(id, ownerId, payload);
}

export async function deleteEvent(id: string, ownerId: string): Promise<void> {
  await getEvent(id, ownerId);
  return repo.deleteEvent(id, ownerId);
}

export async function getEventGuests(eventId: string) {
  return repo.findGuestsByEvent(eventId);
}

export async function getEventVendors(eventId: string) {
  return repo.findVendorsByEvent(eventId);
}

export async function getEventRituals(eventId: string) {
  return repo.findRitualsByEvent(eventId);
}

/** Rows arrive with the raw `venues` join key and a color_palette that may be a JSON string. */
function toPublicEvent(row: EventWithVenue): PublicEventPayload {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = row as any;
  const venue = raw.venues ?? raw.venue ?? null;
  let color: string | null = null;
  try {
    const palette =
      typeof raw.color_palette === 'string' ? JSON.parse(raw.color_palette) : raw.color_palette;
    color = palette?.primary ?? null;
  } catch {
    color = null;
  }
  return {
    id: row.id,
    name: row.name,
    event_type: row.event_type,
    description: row.description,
    date: row.event_date,
    start_time: row.start_time,
    end_time: row.end_time,
    dress_code: row.dress_code,
    color,
    venue: venue
      ? {
          name: venue.name,
          address: venue.address,
          city: venue.city,
          latitude: venue.latitude,
          longitude: venue.longitude,
        }
      : null,
  };
}

export async function getPublicEvents(slug: string): Promise<PublicEventPayload[]> {
  const ownerId = await repo.findOwnerBySlug(slug);
  if (!ownerId) throw new NotFoundError('Wedding not found');
  const rows = await repo.findPublicEventsBySlug(ownerId);
  return rows.map(toPublicEvent);
}
