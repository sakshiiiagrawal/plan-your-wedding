import { NotFoundError } from '../shared/errors/HttpError';
import type { EventInsert, EventRow, EventWithVenue } from '@wedding-planner/shared';
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

export async function getPublicEvents(slug: string): Promise<EventWithVenue[]> {
  const ownerId = await repo.findOwnerBySlug(slug);
  if (!ownerId) throw new NotFoundError('Wedding not found');
  return repo.findPublicEventsBySlug(ownerId);
}
