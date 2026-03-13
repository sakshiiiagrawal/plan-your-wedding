import { supabase } from '../config/database';
import type { VenueInsert, VenueRow } from '@wedding-planner/shared';

export interface VenueWithEventSummary extends VenueRow {
  events: { id: string; name: string; event_date: string }[];
}

export async function findAllByOwner(ownerId: string): Promise<VenueWithEventSummary[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('*, events(id, name, event_date)')
    .eq('user_id', ownerId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as VenueWithEventSummary[];
}

export async function findByIdAndOwner(
  id: string,
  ownerId: string,
): Promise<VenueWithEventSummary | null> {
  const { data, error } = await supabase
    .from('venues')
    .select('*, events(*)')
    .eq('id', id)
    .eq('user_id', ownerId)
    .single();

  if (error) throw error;
  return data as VenueWithEventSummary | null;
}

export async function insertVenue(payload: VenueInsert): Promise<VenueRow> {
  const { data, error } = await supabase.from('venues').insert([payload]).select().single();

  if (error) throw error;
  return data as VenueRow;
}

export async function updateVenue(
  id: string,
  ownerId: string,
  payload: Partial<VenueInsert>,
): Promise<VenueRow> {
  const { data, error } = await supabase
    .from('venues')
    .update(payload)
    .eq('id', id)
    .eq('user_id', ownerId)
    .select()
    .single();

  if (error) throw error;
  return data as VenueRow;
}

export async function deleteVenue(id: string, ownerId: string): Promise<void> {
  const { error } = await supabase
    .from('venues')
    .delete()
    .eq('id', id)
    .eq('user_id', ownerId);

  if (error) throw error;
}
