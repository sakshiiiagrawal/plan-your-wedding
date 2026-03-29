import { supabase } from '../config/database';

export async function findBySlug(slug: string): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data as { id: string; name: string } | null;
}
