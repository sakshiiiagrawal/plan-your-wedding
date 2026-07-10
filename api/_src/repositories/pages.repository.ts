import { supabase } from '../config/database';
import type { PublicPageRow } from '../../../shared/src';

export async function findAllByOwner(ownerId: string): Promise<PublicPageRow[]> {
  const { data, error } = await supabase
    .from('public_pages')
    .select('*')
    .eq('user_id', ownerId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as PublicPageRow[];
}

export async function findByIdAndOwner(id: string, ownerId: string): Promise<PublicPageRow | null> {
  const { data, error } = await supabase
    .from('public_pages')
    .select('*')
    .eq('id', id)
    .eq('user_id', ownerId)
    .maybeSingle();

  if (error) throw error;
  return data as PublicPageRow | null;
}

export async function findBySlugAndOwner(
  pageSlug: string,
  ownerId: string,
): Promise<PublicPageRow | null> {
  const { data, error } = await supabase
    .from('public_pages')
    .select('*')
    .eq('page_slug', pageSlug)
    .eq('user_id', ownerId)
    .maybeSingle();

  if (error) throw error;
  return data as PublicPageRow | null;
}

export async function findPublishedByOwner(ownerId: string): Promise<PublicPageRow[]> {
  const { data, error } = await supabase
    .from('public_pages')
    .select('*')
    .eq('user_id', ownerId)
    .eq('is_published', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as PublicPageRow[];
}

export async function insertPage(
  payload: Partial<PublicPageRow> & { user_id: string },
): Promise<PublicPageRow> {
  const { data, error } = await supabase
    .from('public_pages')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as PublicPageRow;
}

export async function updatePage(
  id: string,
  ownerId: string,
  payload: Partial<PublicPageRow>,
): Promise<PublicPageRow> {
  const { data, error } = await supabase
    .from('public_pages')
    .update(payload)
    .eq('id', id)
    .eq('user_id', ownerId)
    .select()
    .single();

  if (error) throw error;
  return data as PublicPageRow;
}

export async function deletePage(id: string, ownerId: string): Promise<void> {
  const { error } = await supabase
    .from('public_pages')
    .delete()
    .eq('id', id)
    .eq('user_id', ownerId);

  if (error) throw error;
}

export async function findOwnerBySlug(slug: string): Promise<string | null> {
  const { data } = await supabase.from('users').select('id').eq('slug', slug).maybeSingle();
  return data?.id ?? null;
}
