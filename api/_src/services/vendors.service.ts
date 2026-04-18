import { ConflictError, NotFoundError } from '../shared/errors/HttpError';
import type { VendorInsert, VendorRow, VendorWithFinance } from '@wedding-planner/shared';
import * as repo from '../repositories/vendors.repository';
import { getCategoryTree } from './expense.service';
import {
  buildVendorSourceItems,
  createExpensePayment,
  deleteExpensePayment,
  getExpenseDetailsTx,
  getSourceExpense,
  getSourceExpenseId,
  listExpenses,
  type PaymentMutationInput,
  upsertSourceExpenseTx,
} from './finance.service';
import { withPgTransaction } from '../config/postgres';

function normalizeDate(value: string | null | undefined): string {
  return value && value.trim() !== '' ? value : new Date().toISOString().slice(0, 10);
}

function extractVendorFinanceInput(
  ownerId: string,
  payload: {
    name: string;
    category_id?: string | null;
    total_cost?: number | null;
    expense_date?: string | null;
    side?: 'bride' | 'groom' | 'shared' | 'mutual' | null;
    bride_share_percentage?: number | null;
    notes?: string | null;
    finance?: {
      expense_date: string;
      notes?: string | null;
      items: Awaited<ReturnType<typeof buildVendorSourceItems>>;
      payments?: PaymentMutationInput[];
    } | null;
  },
) {
  if (payload.finance) {
    return {
      description: payload.name,
      expense_date: payload.finance.expense_date,
      notes: payload.finance.notes ?? payload.notes ?? null,
      items: payload.finance.items,
      payments: payload.finance.payments ?? [],
    };
  }

  return buildVendorSourceItems(
    ownerId,
    payload.category_id ?? null,
    payload.name,
    payload.total_cost ?? null,
    payload.side ?? 'shared',
    payload.bride_share_percentage ?? null,
  ).then((items) => ({
    description: payload.name,
    expense_date: normalizeDate(payload.expense_date),
    notes: payload.notes ?? null,
    items,
    payments: [] as PaymentMutationInput[],
  }));
}

function mergeVendorWithFinance(
  vendor: VendorRow & Record<string, unknown>,
  finance: Awaited<ReturnType<typeof getSourceExpense>>,
): VendorWithFinance & Record<string, unknown> {
  return {
    ...vendor,
    expense_id: finance?.id ?? null,
    finance_summary: finance?.summary ?? null,
    finance: finance ?? null,
  };
}

export async function listVendors(ownerId: string, category?: string) {
  void category;
  const [vendors, vendorExpenses] = await Promise.all([
    repo.findAllByOwner(ownerId),
    listExpenses(ownerId, { source_type: 'vendor' }),
  ]);
  const financeBySourceId = new Map(
    vendorExpenses
      .filter((expense) => expense.source_id)
      .map((expense) => [expense.source_id!, expense]),
  );
  return vendors.map((vendor) =>
    mergeVendorWithFinance(vendor, financeBySourceId.get(vendor.id) ?? null),
  );
}

export async function getCategories(ownerId: string) {
  return getCategoryTree(ownerId);
}

export async function getVendor(id: string, ownerId: string) {
  const vendor = await repo.findByIdAndOwner(id, ownerId);
  if (!vendor) throw new NotFoundError('Vendor not found');
  const finance = await getSourceExpense(ownerId, 'vendor', id);
  return mergeVendorWithFinance(vendor, finance);
}

export async function createVendor(
  payload: Omit<VendorInsert, 'user_id'> & {
    total_cost?: number | null;
    expense_date?: string | null;
    side?: 'bride' | 'groom' | 'shared' | 'mutual' | null;
    bride_share_percentage?: number | null;
    finance?: {
      expense_date: string;
      notes?: string | null;
      items: Awaited<ReturnType<typeof buildVendorSourceItems>>;
      payments?: PaymentMutationInput[];
    } | null;
  },
  ownerId: string,
  userId?: string,
) {
  return withPgTransaction(async (client) => {
    const { rows } = await client.query<Record<string, unknown>>(
      `
        INSERT INTO vendors (
          user_id,
          name,
          category_id,
          contact_person,
          phone,
          email,
          is_confirmed,
          notes,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
      [
        ownerId,
        payload.name,
        payload.category_id ?? null,
        payload.contact_person ?? null,
        payload.phone ?? null,
        payload.email ?? null,
        payload.is_confirmed ?? false,
        payload.notes ?? null,
        userId ?? ownerId,
      ],
    );
    const vendor = rows[0] as VendorRow & Record<string, unknown> | undefined;
    if (!vendor) throw new NotFoundError('Vendor could not be created');

    const financeInput = await extractVendorFinanceInput(ownerId, payload);
    const linkedExpense = await upsertSourceExpenseTx(client, ownerId, 'vendor', vendor.id, financeInput);
    return mergeVendorWithFinance(vendor, linkedExpense);
  });
}

export async function updateVendor(
  id: string,
  ownerId: string,
  payload: Partial<VendorInsert> & {
    total_cost?: number | null;
    expense_date?: string | null;
    side?: 'bride' | 'groom' | 'shared' | 'mutual' | null;
    bride_share_percentage?: number | null;
    finance?: {
      expense_date: string;
      notes?: string | null;
      items: Awaited<ReturnType<typeof buildVendorSourceItems>>;
      payments?: PaymentMutationInput[];
    } | null;
  },
  userId?: string,
) {
  return withPgTransaction(async (client) => {
    const { rows: existingRows } = await client.query<Record<string, unknown>>(
      `SELECT * FROM vendors WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [id, ownerId],
    );
    const existing = existingRows[0] as VendorRow & Record<string, unknown> | undefined;
    if (!existing) throw new NotFoundError('Vendor not found');

    const nextValues = {
      name: payload.name ?? existing.name,
      category_id:
        payload.category_id !== undefined ? payload.category_id : (existing.category_id ?? null),
      contact_person:
        payload.contact_person !== undefined
          ? payload.contact_person
          : (existing.contact_person ?? null),
      phone: payload.phone !== undefined ? payload.phone : (existing.phone ?? null),
      email: payload.email !== undefined ? payload.email : (existing.email ?? null),
      is_confirmed:
        payload.is_confirmed !== undefined
          ? payload.is_confirmed
          : Boolean(existing.is_confirmed),
      notes: payload.notes !== undefined ? payload.notes : (existing.notes ?? null),
    };

    const { rows } = await client.query<Record<string, unknown>>(
      `
        UPDATE vendors
        SET
          name = $3,
          category_id = $4,
          contact_person = $5,
          phone = $6,
          email = $7,
          is_confirmed = $8,
          notes = $9,
          updated_by = $10
        WHERE id = $1
          AND user_id = $2
        RETURNING *
      `,
      [
        id,
        ownerId,
        nextValues.name,
        nextValues.category_id,
        nextValues.contact_person,
        nextValues.phone,
        nextValues.email,
        nextValues.is_confirmed,
        nextValues.notes,
        userId ?? ownerId,
      ],
    );

    const vendor = rows[0] as VendorRow & Record<string, unknown> | undefined;
    if (!vendor) throw new NotFoundError('Vendor not found');

    const shouldTouchFinance =
      payload.finance !== undefined ||
      payload.total_cost !== undefined ||
      payload.expense_date !== undefined ||
      payload.side !== undefined ||
      payload.bride_share_percentage !== undefined ||
      payload.name !== undefined;

    let linkedExpense = null as Awaited<ReturnType<typeof getSourceExpense>>;
    const { rows: linkedRows } = await client.query<Record<string, unknown>>(
      `
        SELECT id
        FROM expenses
        WHERE user_id = $1
          AND source_type = 'vendor'
          AND source_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [ownerId, id],
    );
    const linkedExpenseId = linkedRows[0]?.id ? String(linkedRows[0].id) : null;
    if (linkedExpenseId) {
      linkedExpense = await getExpenseDetailsTx(client, ownerId, linkedExpenseId);
    }
    if (shouldTouchFinance) {
      const financeInput =
        payload.finance != null || payload.total_cost !== undefined
          ? await extractVendorFinanceInput(ownerId, {
              name: vendor.name,
              category_id: vendor.category_id,
              total_cost: payload.total_cost ?? linkedExpense?.summary.committed_amount ?? null,
              expense_date: payload.expense_date ?? linkedExpense?.expense_date ?? null,
              side: payload.side ?? 'shared',
              bride_share_percentage: payload.bride_share_percentage ?? null,
              notes: payload.notes ?? vendor.notes,
              finance: payload.finance ?? null,
            })
          : linkedExpense
            ? {
                description: vendor.name,
                expense_date: linkedExpense.expense_date,
                notes: linkedExpense.notes,
                items: linkedExpense.items,
                payments: [],
              }
            : {
                description: vendor.name,
                expense_date: normalizeDate(payload.expense_date),
                notes: payload.notes ?? vendor.notes,
                items: [],
                payments: [],
              };
      linkedExpense = await upsertSourceExpenseTx(client, ownerId, 'vendor', id, financeInput);
    }

    return mergeVendorWithFinance(vendor, linkedExpense);
  });
}

export async function deleteVendor(id: string, ownerId: string) {
  return withPgTransaction(async (client) => {
    const { rows } = await client.query<Record<string, unknown>>(
      `SELECT * FROM vendors WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [id, ownerId],
    );
    const vendor = rows[0] as VendorRow | undefined;
    if (!vendor) throw new NotFoundError('Vendor not found');

    const { rows: expenseRows } = await client.query<Record<string, unknown>>(
      `
        SELECT id
        FROM expenses
        WHERE user_id = $1
          AND source_type = 'vendor'
          AND source_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [ownerId, id],
    );
    const expenseId = expenseRows[0]?.id ? String(expenseRows[0].id) : null;
    if (expenseId) {
      const finance = await getExpenseDetailsTx(client, ownerId, expenseId);
      if (finance.payments.length > 0) {
        throw new ConflictError('Cannot delete vendor with linked payment history.');
      }
      await client.query(`DELETE FROM expenses WHERE id = $1 AND user_id = $2`, [expenseId, ownerId]);
    }

    await client.query(`DELETE FROM vendors WHERE id = $1 AND user_id = $2`, [id, ownerId]);
  });
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

export async function getPayments(vendorId: string, ownerId: string) {
  const expense = await getSourceExpense(ownerId, 'vendor', vendorId);
  return expense?.payments ?? [];
}

export async function addPayment(
  vendorId: string,
  ownerId: string,
  payload: PaymentMutationInput,
) {
  const expenseId = await getSourceExpenseId(ownerId, 'vendor', vendorId);
  if (!expenseId) {
    throw new NotFoundError('Create a vendor obligation before recording payments.');
  }
  return createExpensePayment(ownerId, expenseId, payload);
}

export async function deletePayment(paymentId: string, ownerId: string) {
  return deleteExpensePayment(ownerId, paymentId);
}

export async function getVendorExpenseSummary(ownerId: string) {
  const vendors = await listVendors(ownerId);
  return vendors.map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    category_id: vendor.category_id,
    category: (vendor as { expense_categories?: { name?: string } }).expense_categories?.name ?? null,
    expense_id: vendor.expense_id,
    totalCost: vendor.finance_summary?.committed_amount ?? 0,
    paidAmount: vendor.finance_summary?.paid_amount ?? 0,
    outstandingAmount: vendor.finance_summary?.outstanding_amount ?? 0,
  }));
}

export async function getVendorsBySide(ownerId: string) {
  const vendors = await listVendors(ownerId);
  const grouped = {
    bride: { vendors: [] as typeof vendors, totalCost: 0 },
    groom: { vendors: [] as typeof vendors, totalCost: 0 },
    shared: { vendors: [] as typeof vendors, totalCost: 0 },
  };

  for (const vendor of vendors) {
    const firstItem = vendor.finance?.items[0];
    const side = firstItem?.side ?? 'shared';
    grouped[side].vendors.push(vendor);
    grouped[side].totalCost += vendor.finance_summary?.committed_amount ?? 0;
  }

  return grouped;
}
