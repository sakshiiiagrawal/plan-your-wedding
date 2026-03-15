import { supabase } from '../config/database';
import type { WebsiteContentRow } from '@wedding-planner/shared';

export async function findOwnerBySlug(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('slug', slug)
    .eq('role', 'admin')
    .maybeSingle();
  return data?.id ?? null;
}

export async function findAllByOwner(ownerId: string | null): Promise<WebsiteContentRow[]> {
  let query = supabase
    .from('website_content')
    .select('*')
    .order('display_order', { ascending: true });

  if (ownerId) query = query.eq('user_id', ownerId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as WebsiteContentRow[];
}

export async function findSection(
  section: string,
  ownerId: string | null,
): Promise<WebsiteContentRow | null> {
  let query = supabase.from('website_content').select('*').eq('section_name', section);

  if (ownerId) query = query.eq('user_id', ownerId);

  const { data, error } = await query.single();
  if (error) throw error;
  return data as WebsiteContentRow | null;
}

export async function findSectionContent(
  section: string,
  ownerId: string | null,
): Promise<unknown> {
  let query = supabase.from('website_content').select('content').eq('section_name', section);

  if (ownerId) query = query.eq('user_id', ownerId);

  const { data, error } = await query.single();
  if (error) throw error;
  return data?.content ?? {};
}

export async function upsertSection(
  section: string,
  ownerId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>,
): Promise<WebsiteContentRow> {
  const { data, error } = await supabase
    .from('website_content')
    .upsert(
      { ...payload, section_name: section, user_id: ownerId },
      { onConflict: 'section_name,user_id' },
    )
    .select()
    .single();

  if (error) throw error;
  return data as WebsiteContentRow;
}
