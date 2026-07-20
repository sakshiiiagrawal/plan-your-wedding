import { supabase } from '../../config/database';
import * as eventsRepo from '../../repositories/events.repository';
import { publicSiteUrl } from '../../utils/urls';

export type EventLite = Awaited<ReturnType<typeof eventsRepo.findAllByOwner>>[number] & {
  venues?: {
    name?: string;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'soon';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  const [h = '0', m = '00'] = t.split(':');
  const hour = Number(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${((hour + 11) % 12) + 1}:${m} ${ampm}`;
}

export async function getWedding(
  weddingId: string,
): Promise<{ title: string; slug: string | null }> {
  const { data } = await supabase
    .from('weddings')
    .select('title, slug')
    .eq('id', weddingId)
    .single();
  return { title: data?.title ?? 'our wedding', slug: data?.slug ?? null };
}

export function siteUrl(slug: string): string {
  return publicSiteUrl(slug);
}
