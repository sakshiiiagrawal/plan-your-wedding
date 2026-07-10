import { BadRequestError, NotFoundError } from '../shared/errors/HttpError';
import type { PublicPagePayload, PublicPageRow } from '../../../shared/src';
import * as repo from '../repositories/pages.repository';
import * as contentRepo from '../repositories/website-content.repository';

const HOME_SLUG = '';

function toPublicPayload(page: PublicPageRow): PublicPagePayload {
  return {
    page_slug: page.page_slug,
    kind: page.kind,
    title: page.title,
    template: page.template,
    palette: page.palette,
    config: page.config ?? {},
  };
}

/**
 * Every wedding must always have a home page. Migration 027 backfills one,
 * but accounts created between deploy and migration (or restored data) are
 * healed lazily here, seeding design settings from the legacy hero blob.
 */
async function ensureHomePage(ownerId: string): Promise<PublicPageRow[]> {
  const pages = await repo.findAllByOwner(ownerId);
  if (pages.some((p) => p.page_slug === HOME_SLUG)) return pages;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hero = ((await contentRepo.findSectionContent('hero', ownerId)) ?? {}) as Record<string, any>;
  const legacyTheme = ['royal', 'desert', 'mandala'].includes(hero.theme) ? hero.theme : 'royal';
  const config: Record<string, unknown> = {};
  if (hero.sections_order) config.sections_order = hero.sections_order;
  else if (hero.sections) config.sections = hero.sections;

  try {
    const home = await repo.insertPage({
      user_id: ownerId,
      page_slug: HOME_SLUG,
      kind: 'website',
      title: 'Main website',
      template: hero.template ?? 'classic',
      palette: hero.palette ?? legacyTheme,
      config,
    });
    return [home, ...pages];
  } catch (err) {
    // Unique-violation: a concurrent request already created the home page
    // between our read and insert. Re-read instead of surfacing a 500.
    if ((err as { code?: string }).code === '23505') {
      return repo.findAllByOwner(ownerId);
    }
    throw err;
  }
}

export async function listPages(ownerId: string): Promise<PublicPageRow[]> {
  return ensureHomePage(ownerId);
}

export async function createPage(
  ownerId: string,
  payload: Pick<PublicPageRow, 'page_slug' | 'kind' | 'title' | 'template' | 'palette'> &
    Partial<Pick<PublicPageRow, 'config' | 'is_published' | 'display_order'>>,
): Promise<PublicPageRow> {
  const existing = await repo.findBySlugAndOwner(payload.page_slug, ownerId);
  if (existing) throw new BadRequestError(`A page at /${payload.page_slug} already exists`);
  return repo.insertPage({ ...payload, user_id: ownerId });
}

export async function updatePage(
  id: string,
  ownerId: string,
  payload: Partial<
    Pick<
      PublicPageRow,
      'page_slug' | 'title' | 'template' | 'palette' | 'config' | 'is_published' | 'display_order'
    >
  >,
): Promise<PublicPageRow> {
  const page = await repo.findByIdAndOwner(id, ownerId);
  if (!page) throw new NotFoundError('Page not found');

  if (
    payload.page_slug !== undefined &&
    payload.page_slug !== page.page_slug &&
    page.page_slug === HOME_SLUG
  ) {
    throw new BadRequestError('The home page URL cannot be changed');
  }
  if (page.page_slug === HOME_SLUG && payload.is_published === false) {
    throw new BadRequestError('The home page cannot be unpublished');
  }
  if (payload.page_slug !== undefined && payload.page_slug !== page.page_slug) {
    const clash = await repo.findBySlugAndOwner(payload.page_slug, ownerId);
    if (clash) throw new BadRequestError(`A page at /${payload.page_slug} already exists`);
  }
  return repo.updatePage(id, ownerId, payload);
}

export async function deletePage(id: string, ownerId: string): Promise<void> {
  const page = await repo.findByIdAndOwner(id, ownerId);
  if (!page) throw new NotFoundError('Page not found');
  if (page.page_slug === HOME_SLUG) throw new BadRequestError('The home page cannot be deleted');
  return repo.deletePage(id, ownerId);
}

export async function getPublicPages(slug: string): Promise<PublicPagePayload[]> {
  const ownerId = await repo.findOwnerBySlug(slug);
  if (!ownerId) throw new NotFoundError('Wedding not found');
  const pages = await repo.findPublishedByOwner(ownerId);
  return pages.map(toPublicPayload);
}
