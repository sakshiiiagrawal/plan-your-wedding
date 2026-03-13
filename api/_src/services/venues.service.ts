import { NotFoundError } from '../shared/errors/HttpError';
import type { VenueInsert, VenueRow } from '@wedding-planner/shared';
import * as repo from '../repositories/venues.repository';
import type { VenueWithEventSummary } from '../repositories/venues.repository';

export async function listVenues(ownerId: string): Promise<VenueWithEventSummary[]> {
  return repo.findAllByOwner(ownerId);
}

export async function getVenue(id: string, ownerId: string): Promise<VenueWithEventSummary> {
  const venue = await repo.findByIdAndOwner(id, ownerId);
  if (!venue) throw new NotFoundError('Venue not found');
  return venue;
}

export async function createVenue(
  payload: Omit<VenueInsert, 'user_id'>,
  ownerId: string,
): Promise<VenueRow> {
  return repo.insertVenue({ ...payload, user_id: ownerId });
}

export async function updateVenue(
  id: string,
  ownerId: string,
  payload: Partial<VenueInsert>,
): Promise<VenueRow> {
  await getVenue(id, ownerId);
  return repo.updateVenue(id, ownerId, payload);
}

export async function deleteVenue(id: string, ownerId: string): Promise<void> {
  await getVenue(id, ownerId);
  return repo.deleteVenue(id, ownerId);
}
