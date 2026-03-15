import { NotFoundError } from '../shared/errors/HttpError';
import { VENDOR_CATEGORIES } from '@wedding-planner/shared';
import type { VendorInsert } from '@wedding-planner/shared';
import * as repo from '../repositories/vendors.repository';

export async function listVendors(ownerId: string, category?: string) {
  return repo.findAllByOwner(ownerId, category);
}

export function getCategories() {
  return VENDOR_CATEGORIES.map((cat) => ({
    value: cat,
    label: cat
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
  }));
}

export async function getVendor(id: string, ownerId: string) {
  const vendor = await repo.findByIdAndOwner(id, ownerId);
  if (!vendor) throw new NotFoundError('Vendor not found');
  return vendor;
}

export async function createVendor(payload: Omit<VendorInsert, 'user_id'>, ownerId: string) {
  return repo.insertVendor({ ...payload, user_id: ownerId });
}

export async function updateVendor(id: string, ownerId: string, payload: Partial<VendorInsert>) {
  await getVendor(id, ownerId);
  return repo.updateVendor(id, ownerId, payload);
}

export async function deleteVendor(id: string, ownerId: string) {
  await getVendor(id, ownerId);
  return repo.deleteVendor(id, ownerId);
}

export async function assignToEvent(
  vendorId: string,
  eventId: string,
  details: {
    service_description?: string;
    arrival_time?: string;
    setup_requirements?: string;
    special_instructions?: string;
  },
) {
  return repo.insertEventAssignment(vendorId, eventId, details);
}

export async function removeFromEvent(vendorId: string, eventId: string) {
  return repo.deleteEventAssignment(vendorId, eventId);
}

export async function getPayments(vendorId: string) {
  return repo.findPaymentsByVendor(vendorId);
}

export async function getVendorBudgetSummary(ownerId: string) {
  const vendors = await repo.findVendorBudgetSummary(ownerId);
  return vendors.map((v) => ({ ...v, totalCost: parseFloat(String(v.total_cost ?? 0)) }));
}

export async function getVendorsBySide(ownerId: string) {
  const vendors = await repo.findVendorBudgetSummary(ownerId);
  const result = {
    bride: { vendors: [] as typeof vendors, totalCost: 0 },
    groom: { vendors: [] as typeof vendors, totalCost: 0 },
    mutual: { vendors: [] as typeof vendors, totalCost: 0 },
  };

  vendors.forEach((v) => {
    const totalCost = parseFloat(String(v.total_cost ?? 0));
    const side = (v.side ?? 'mutual') as 'bride' | 'groom' | 'mutual';
    result[side].vendors.push(v);
    result[side].totalCost += totalCost;
  });

  return result;
}
