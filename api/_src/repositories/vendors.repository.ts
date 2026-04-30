import { supabase } from '../config/database';
import type { VendorRow } from '@wedding-planner/shared';

export async function findAllByOwner(ownerId: string) {
  const { data, error } = await supabase
    .from('vendors')
    .select('*, expense_categories(id, name), vendor_event_assignments(event_id, events(name))')
    .eq('user_id', ownerId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Array<VendorRow & Record<string, unknown>>;
}

export async function findByIdAndOwner(id: string, ownerId: string) {
  const { data, error } = await supabase
    .from('vendors')
    .select('*, expense_categories(id, name), vendor_event_assignments(*, events(*))')
    .eq('id', id)
    .eq('user_id', ownerId)
    .single();

  if (error) throw error;
  return data as (VendorRow & Record<string, unknown>) | null;
}

export async function insertEventAssignment(
  vendorId: string,
  eventId: string,
  details: {
    service_description?: string;
    arrival_time?: string;
    setup_requirements?: string;
    special_instructions?: string;
  },
) {
  const { data, error } = await supabase
    .from('vendor_event_assignments')
    .insert([{ vendor_id: vendorId, event_id: eventId, ...details }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEventAssignment(vendorId: string, eventId: string): Promise<void> {
  const { error } = await supabase
    .from('vendor_event_assignments')
    .delete()
    .eq('vendor_id', vendorId)
    .eq('event_id', eventId);
  if (error) throw error;
}

export async function findCategoryNameById(categoryId: string): Promise<string | null> {
  const { data } = await supabase
    .from('expense_categories')
    .select('name')
    .eq('id', categoryId)
    .single();
  return (data as { name: string } | null)?.name ?? null;
}
