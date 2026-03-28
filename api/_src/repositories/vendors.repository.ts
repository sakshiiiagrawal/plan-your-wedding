import { supabase } from '../config/database';
import type { VendorInsert, VendorRow } from '@wedding-planner/shared';

export async function findAllByOwner(ownerId: string, category?: string) {
  let query = supabase
    .from('vendors')
    .select('*, vendor_event_assignments(event_id, events(name))')
    .eq('user_id', ownerId);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query.order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function findByIdAndOwner(id: string, ownerId: string) {
  const { data, error } = await supabase
    .from('vendors')
    .select('*, vendor_event_assignments(*, events(*)), payments(*)')
    .eq('id', id)
    .eq('user_id', ownerId)
    .single();

  if (error) throw error;
  return data;
}

export async function insertVendor(payload: VendorInsert): Promise<VendorRow> {
  const { data, error } = await supabase.from('vendors').insert([payload]).select().single();
  if (error) throw error;
  return data as VendorRow;
}

export async function updateVendor(
  id: string,
  ownerId: string,
  payload: Partial<VendorInsert>,
): Promise<VendorRow> {
  const { data, error } = await supabase
    .from('vendors')
    .update(payload)
    .eq('id', id)
    .eq('user_id', ownerId)
    .select()
    .single();
  if (error) throw error;
  return data as VendorRow;
}

export async function deleteVendor(id: string, ownerId: string): Promise<void> {
  const { error } = await supabase.from('vendors').delete().eq('id', id).eq('user_id', ownerId);
  if (error) throw error;
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

export async function findPaymentsByVendor(vendorId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('payment_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function insertVendorPayment(payload: {
  vendor_id: string;
  user_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  side?: string | null;
  transaction_reference?: string | null;
  notes?: string | null;
}) {
  const { data, error } = await supabase.from('payments').insert([payload]).select().single();
  if (error) throw error;
  return data;
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw error;
}

export async function findVendorExpenseSummary(ownerId: string) {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, category, total_cost, side, is_shared, is_confirmed')
    .eq('user_id', ownerId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
