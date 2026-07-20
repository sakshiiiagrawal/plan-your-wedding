import type { Paginated } from '../../../../shared/src';

export interface PageRequest {
  page?: number | undefined;
  per_page?: number | undefined;
}

export function toValidPage(value: number | undefined): number | undefined {
  if (!Number.isFinite(value) || !value) return undefined;
  const page = Math.trunc(value);
  return page > 0 ? page : undefined;
}

export function toValidPerPage(value: number | undefined, max = 100): number | undefined {
  if (!Number.isFinite(value) || !value) return undefined;
  const perPage = Math.trunc(value);
  return Math.max(1, Math.min(perPage, max));
}

/** Null when neither `page` nor `per_page` was requested — caller should return the unpaginated list. */
export function resolvePagination(
  request: PageRequest,
  defaultPerPage = 20,
  maxPerPage = 100,
): { page: number; perPage: number } | null {
  const page = toValidPage(request.page);
  const perPage = toValidPerPage(request.per_page, maxPerPage);
  if (page === undefined && perPage === undefined) return null;
  return { page: page ?? 1, perPage: perPage ?? defaultPerPage };
}

/** Wraps an already-paged slice (e.g. from a SQL LIMIT/OFFSET query) plus its total count. */
export function toEnvelope<T>(
  items: T[],
  page: number,
  perPage: number,
  totalItems: number,
): Paginated<T> {
  return {
    items,
    page,
    per_page: perPage,
    total_items: totalItems,
    total_pages: Math.max(1, Math.ceil(totalItems / perPage)),
  };
}

/** Slices an already-filtered/sorted in-memory list into a page. */
export function paginate<T>(items: T[], page: number, perPage: number): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * perPage;
  return toEnvelope(items.slice(start, start + perPage), clampedPage, perPage, items.length);
}
