import { supabase } from '../config/database';

export async function findBySlug(slug: string): Promise<{ id: string; title: string } | null> {
  const { data, error } = await supabase
    .from('weddings')
    .select('id, title')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data as { id: string; title: string } | null;
}
