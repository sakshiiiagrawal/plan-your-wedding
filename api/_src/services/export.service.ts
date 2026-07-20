import * as XLSX from 'xlsx';
import * as guestsService from './guests.service';
import * as expenseService from './expense.service';
import * as vendorsService from './vendors.service';
import * as venuesService from './venues.service';
import { findCategoriesByOwner } from '../repositories/expense.repository';

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
  const guests = await guestsService.listGuests(ownerId, { include_vendor_team: true });
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
  const [expenses, categories] = await Promise.all([
    expenseService.listExpenses(ownerId, {}),
    findCategoriesByOwner(ownerId),
  ]);
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

  // One row per expense with the four figures as real columns — the nested
  // summary/items would otherwise land in the sheet as JSON blobs.
  const rows = expenses.map((expense) => {
    const sides = new Set(expense.items.map((item) => item.side ?? 'shared'));
    return {
      description: expense.description,
      date: expense.expense_date,
      status: expense.status,
      source: expense.source_type,
      categories:
        Array.from(
          new Set(
            expense.items.map((item) => categoryNameById.get(item.category_id) ?? 'Uncategorized'),
          ),
        ).join(', ') || 'Uncategorized',
      side: sides.size === 1 ? [...sides][0] : 'mixed',
      planned: expense.summary.planned_amount,
      allocated: expense.summary.committed_amount,
      paid: expense.summary.paid_amount,
      outstanding: expense.summary.outstanding_amount,
    };
  });
  return toBuffer(rows as unknown as Record<string, unknown>[], 'Budget');
}

export async function exportVendors(ownerId: string): Promise<Buffer> {
  const result = await vendorsService.listVendors(ownerId, {});
  const vendors = Array.isArray(result) ? result : result.items;
  // Same idea: lift the finance summary into columns, drop the nested objects.
  const rows = vendors.map(
    ({ finance, finance_summary, expense_categories, ...vendor }) =>
      ({
        ...vendor,
        category: (expense_categories as { name?: string } | null)?.name ?? '',
        planned: finance_summary?.planned_amount ?? 0,
        allocated: finance_summary?.committed_amount ?? 0,
        paid: finance_summary?.paid_amount ?? 0,
        outstanding: finance_summary?.outstanding_amount ?? 0,
      }) as Record<string, unknown>,
  );
  return toBuffer(rows, 'Vendors');
}

export async function exportAllocations(ownerId: string): Promise<Buffer> {
  const matrix = await venuesService.getAllocationMatrix(ownerId);
  // The matrix is venues → rooms → allocations → guests; one row per allocation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (matrix as any[]).flatMap((venue) =>
    (venue.rooms ?? []).flatMap((room: any) =>
      (room.room_allocations ?? []).map((alloc: any) => {
        const nights =
          alloc.check_in_date && alloc.check_out_date && alloc.check_out_date > alloc.check_in_date
            ? Math.round(
                (Date.parse(`${alloc.check_out_date}T00:00:00Z`) -
                  Date.parse(`${alloc.check_in_date}T00:00:00Z`)) /
                  86400000,
              )
            : 0;
        const rate = room.rate_per_night ?? null;
        return {
          venue: venue.name,
          room: room.room_number,
          room_type: room.room_type,
          guests: (alloc.guests ?? [])
            .map((g: any) => `${g.first_name} ${g.last_name ?? ''}`.trim())
            .join(', '),
          check_in: alloc.check_in_date,
          check_out: alloc.check_out_date,
          nights,
          est_cost: rate != null ? nights * rate : '',
        };
      }),
    ),
  );
  return toBuffer(rows, 'Accommodations');
}
