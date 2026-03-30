import { NotFoundError } from '../shared/errors/HttpError';
import type { VendorInsert } from '@wedding-planner/shared';
import * as repo from '../repositories/vendors.repository';
import { getCategoryTree } from './expense.service';

export async function listVendors(ownerId: string, category?: string) {
  return repo.findAllByOwner(ownerId, category);
}

export async function getCategories(ownerId: string) {
  // Delegate to the shared category tree so vendors and expenses use the same categories
  return getCategoryTree(ownerId);
}

export async function getVendor(id: string, ownerId: string) {
  const vendor = await repo.findByIdAndOwner(id, ownerId);
  if (!vendor) throw new NotFoundError('Vendor not found');
  return vendor;
}

// When only category_id is provided (no legacy category text), look up the name
// so the NOT NULL category column is always populated.
async function withCategoryName<T extends { category?: string | null; category_id?: string | null }>(
  payload: T,
): Promise<T> {
  if (payload.category_id && !payload.category) {
    const name = await repo.findCategoryNameById(payload.category_id);
    if (name) return { ...payload, category: name };
  }
  return payload;
}

export async function createVendor(payload: Omit<VendorInsert, 'user_id'>, ownerId: string) {
  const resolved = await withCategoryName(payload);
  return repo.insertVendor({ ...resolved, user_id: ownerId });
}

export async function updateVendor(id: string, ownerId: string, payload: Partial<VendorInsert>) {
  await getVendor(id, ownerId);
  const resolved = await withCategoryName(payload);
  return repo.updateVendor(id, ownerId, resolved);
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

export async function addPayment(
  vendorId: string,
  ownerId: string,
  payload: {
    amount: number;
    payment_date: string;
    payment_method: string;
    side?: string | null;
    transaction_reference?: string | null;
    notes?: string | null;
    is_planned?: boolean;
  },
) {
  return repo.insertVendorPayment({ ...payload, vendor_id: vendorId, user_id: ownerId });
}

export async function deletePayment(paymentId: string) {
  return repo.deletePayment(paymentId);
}

export async function getVendorExpenseSummary(ownerId: string) {
  const vendors = await repo.findVendorExpenseSummary(ownerId);
  return vendors.map((v) => ({ ...v, totalCost: parseFloat(String(v.total_cost ?? 0)) }));
}

export async function getVendorsBySide(ownerId: string) {
  const vendors = await repo.findVendorExpenseSummary(ownerId);
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
