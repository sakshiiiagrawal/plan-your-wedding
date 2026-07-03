import * as XLSX from 'xlsx';
import * as guestsService from './guests.service';
import * as expenseService from './expense.service';
import * as vendorsService from './vendors.service';
import * as venuesService from './venues.service';

// ponytail: flat json_to_sheet dump — good enough for a printable/handoff list,
// no bespoke column mapping per module.
function toBuffer(rows: Record<string, unknown>[], sheetName: string): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export async function exportGuests(ownerId: string): Promise<Buffer> {
  const guests = await guestsService.listGuests(ownerId, {});
  return toBuffer(guests as unknown as Record<string, unknown>[], 'Guests');
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
  return toBuffer(matrix as unknown as Record<string, unknown>[], 'Accommodations');
}
