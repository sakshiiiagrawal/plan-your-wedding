import { NotFoundError } from '../shared/errors/HttpError';
import * as repo from '../repositories/website-content.repository';

export async function listContent(ownerId: string | null) {
  return repo.findAllByOwner(ownerId);
}

export async function getSection(section: string, ownerId: string | null) {
  const data = await repo.findSection(section, ownerId);
  if (!data) throw new NotFoundError('Section not found');
  return data;
}

export async function getSectionContent(section: string, ownerId: string | null) {
  return repo.findSectionContent(section, ownerId);
}

export async function upsertSection(
  section: string,
  ownerId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>,
) {
  return repo.upsertSection(section, ownerId, payload);
}

export async function getPublicContent(slug: string, section: string) {
  const ownerId = await repo.findOwnerBySlug(slug);
  if (!ownerId) throw new NotFoundError('Wedding not found');
  return repo.findSectionContent(section, ownerId);
}
