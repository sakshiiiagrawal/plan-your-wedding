import * as XLSX from 'xlsx';
import * as guestsService from './guests.service';
import * as expenseService from './expense.service';
import * as vendorsService from './vendors.service';
import * as venuesService from './venues.service';

// ponytail: flat json_to_sheet dump — good enough for a printable/handoff list,
// no bespoke column mapping per module.
function toBuffer(rows: Record<string, unknown>[], sheetName: string): Buffer {
  // json_to_sheet renders nested objects/arrays as blank or "[object Object]" —
  // stringify anything non-scalar so no column silently loses its data
  const flat = rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        k,
        v !== null && typeof v === 'object' ? JSON.stringify(v) : v,
      ]),
    ),
  );
  const ws = XLSX.utils.json_to_sheet(flat);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export async function exportGuests(ownerId: string): Promise<Buffer> {
  const guests = await guestsService.listGuests(ownerId, {});
  // Flatten the joins: group name as a column, per-event rows collapsed into
  // the aggregated rsvp_status that listGuests already computes
  const rows = guests.map(({ guest_groups, guest_event_rsvp, ...g }) => ({
    ...g,
    group: guest_groups?.name ?? '',
    plus_ones: (guest_event_rsvp ?? []).reduce((max, r) => Math.max(max, r.plus_ones ?? 0), 0),
  }));
  return toBuffer(rows as unknown as Record<string, unknown>[], 'Guests');
}

export async function exportBudget(ownerId: string): Promise<Buffer> {
  const expenses = await expenseService.listExpenses(ownerId, {});
  return toBuffer(expenses as unknown as Record<string, unknown>[], 'Budget');
}

export async function exportVendors(ownerId: string): Promise<Buffer> {
  const result = await vendorsService.listVendors(ownerId, {});
  const rows = Array.isArray(result) ? result : result.items;
  return toBuffer(rows as unknown as Record<string, unknown>[], 'Vendors');
}

export async function exportAllocations(ownerId: string): Promise<Buffer> {
  const matrix = await venuesService.getAllocationMatrix(ownerId);
  // The matrix is venues → rooms → allocations → guests; one row per allocation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (matrix as any[]).flatMap((venue) =>
    (venue.rooms ?? []).flatMap((room: any) =>
      (room.room_allocations ?? []).map((alloc: any) => ({
        venue: venue.name,
        room: room.room_number,
        room_type: room.room_type,
        guests: (alloc.guests ?? [])
          .map((g: any) => `${g.first_name} ${g.last_name ?? ''}`.trim())
          .join(', '),
        check_in: alloc.check_in_date,
        check_out: alloc.check_out_date,
      })),
    ),
  );
  return toBuffer(rows, 'Accommodations');
}
