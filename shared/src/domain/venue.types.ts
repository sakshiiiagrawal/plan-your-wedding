import type { TableRow, TableInsert } from '../supabase.generated';
import type { ExpenseBalanceSummary, ExpenseWithDetails } from './expense.types';

export interface VenueRow {
  id: string;
  user_id: string;
  name: string;
  venue_type: string | null;
  address: string | null;
  city: string | null;
  google_maps_link: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  capacity: number | null;
  has_accommodation: boolean;
  default_check_in_date: string | null;
  default_check_out_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenueInsert {
  user_id: string;
  name: string;
  venue_type?: string | null;
  address?: string | null;
  city?: string | null;
  google_maps_link?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  capacity?: number | null;
  has_accommodation?: boolean;
  default_check_in_date?: string | null;
  default_check_out_date?: string | null;
  notes?: string | null;
}

export type RoomRow = TableRow<'rooms'>;
export type RoomInsert = TableInsert<'rooms'>;

export type RoomAllocationRow = TableRow<'room_allocations'>;
export type RoomAllocationInsert = TableInsert<'room_allocations'>;

export interface RoomWithAllocations extends RoomRow {
  allocations: RoomAllocationRow[];
}

export interface VenueWithFinance extends VenueRow {
  expense_id: string | null;
  finance_summary: ExpenseBalanceSummary | null;
  finance: ExpenseWithDetails | null;
}
