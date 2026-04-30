import { AppError } from '../shared/errors/AppError';
import { BadRequestError, ConflictError, NotFoundError } from '../shared/errors/HttpError';
import { withPgTransaction, withPgClient } from '../config/postgres';
import { ensureDefaultCategoriesTx } from './expense-categories.service';
import type {
  ExpenseBalanceSummary,
  ExpenseInsert,
  ExpenseItemInput,
  ExpenseItemRow,
  ExpenseRow,
  ExpenseWithDetails,
  FinanceHeaderStatus,
  FinancePaymentDirection,
  FinancePaymentStatus,
  FinanceSourceType,
  PaymentAllocationInput,
  PaymentAllocationRow,
  PaymentInsert,
  PaymentRow,
  PaymentMethod,
} from '@wedding-planner/shared';
import type { PoolClient } from 'pg';

type SourceType = FinanceSourceType;
type HeaderStatus = FinanceHeaderStatus;
type PaymentDirection = FinancePaymentDirection;
type PaymentStatus = FinancePaymentStatus;

export interface ExpenseQueryFilters {
  category_id?: string;
  side?: string;
  source_type?: string;
  status?: string;
}

export interface PaymentMutationInput extends Omit<PaymentInsert, 'expense_id'> {
  id?: string;
  allocations?: PaymentAllocationInput[];
  new_items?: ExpenseItemInput[];
}

export interface ExpenseWriteInput extends Omit<ExpenseInsert, 'user_id'> {
  items: ExpenseItemInput[];
  payments?: PaymentMutationInput[];
}

export interface SourceFinanceInput {
  description: string;
  expense_date: string;
  notes?: string | null;
  items?: ExpenseItemInput[];
  payments?: PaymentMutationInput[];
}

type DbRow = Record<string, unknown>;

function toNumber(value: unknown): number {
  return Number(value ?? 0);
}

function toNullableNumber(value: unknown): number | null {
  return value == null ? null : Number(value);
}

function normalizeDate(value: string | null | undefined, fallback?: string): string {
  if (value && value.trim() !== '') return value;
  if (fallback) return fallback;
  return new Date().toISOString().slice(0, 10);
}

function normalizeMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

function fromCents(value: number): number {
  return value / 100;
}

function ensureSharedPercentage(item: ExpenseItemInput): ExpenseItemInput {
  if (item.side !== 'shared') {
    return { ...item, bride_share_percentage: null };
  }
  return { ...item, bride_share_percentage: item.bride_share_percentage ?? 50 };
}

function mapExpenseRow(row: DbRow): ExpenseRow {
  return {
    id: String(row['id']),
    user_id: String(row['user_id']),
    source_type: row['source_type'] as SourceType,
    source_id: row['source_id'] ? String(row['source_id']) : null,
    description: String(row['description']),
    expense_date: String(row['expense_date']),
    notes: row['notes'] ? String(row['notes']) : null,
    status: row['status'] as HeaderStatus,
    created_at: String(row['created_at']),
    updated_at: String(row['updated_at']),
  };
}

function mapExpenseItemRow(row: DbRow): ExpenseItemRow {
  return {
    id: String(row['id']),
    expense_id: String(row['expense_id']),
    category_id: String(row['category_id']),
    event_id: row['event_id'] ? String(row['event_id']) : null,
    description: String(row['description']),
    amount: toNumber(row['amount']),
    side: row['side'] as ExpenseItemRow['side'],
    bride_share_percentage: toNullableNumber(row['bride_share_percentage']),
    display_order: Number(row['display_order']),
    created_at: String(row['created_at']),
    updated_at: String(row['updated_at']),
  };
}

function mapPaymentRow(row: DbRow): PaymentRow {
  return {
    id: String(row['id']),
    expense_id: String(row['expense_id']),
    amount: toNumber(row['amount']),
    direction: row['direction'] as PaymentDirection,
    status: row['status'] as PaymentStatus,
    due_date: row['due_date'] ? String(row['due_date']) : null,
    paid_date: row['paid_date'] ? String(row['paid_date']) : null,
    payment_method: (row['payment_method'] as PaymentMethod | null) ?? null,
    paid_by_side: (row['paid_by_side'] as PaymentRow['paid_by_side']) ?? null,
    transaction_reference: row['transaction_reference']
      ? String(row['transaction_reference'])
      : null,
    notes: row['notes'] ? String(row['notes']) : null,
    reverses_payment_id: row['reverses_payment_id'] ? String(row['reverses_payment_id']) : null,
    created_at: String(row['created_at']),
    updated_at: String(row['updated_at']),
  };
}

function mapAllocationRow(row: DbRow): PaymentAllocationRow {
  return {
    id: String(row['id']),
    payment_id: String(row['payment_id']),
    expense_item_id: String(row['expense_item_id']),
    amount: toNumber(row['amount']),
    created_at: String(row['created_at']),
    updated_at: String(row['updated_at']),
  };
}

function parseSummary(row: DbRow | undefined): ExpenseBalanceSummary {
  return {
    committed_amount: row ? toNumber(row['committed_amount']) : 0,
    paid_amount: row ? toNumber(row['paid_amount']) : 0,
    outstanding_amount: row ? toNumber(row['outstanding_amount']) : 0,
    planned_amount: row ? toNumber(row['planned_amount']) : 0,
  };
}

function mapVenueTypeToCategoryName(venueType: string | null | undefined): string {
  switch (venueType) {
    case 'wedding_hall':
    case 'banquet':
      return 'Wedding Hall / Banquet';
    case 'outdoor':
      return 'Outdoor Garden / Lawn';
    case 'resort':
      return 'Farmhouse / Resort';
    case 'hotel':
      return 'Hotel Ballroom';
    default:
      return 'Wedding Hall / Banquet';
  }
}

async function insertActivity(
  client: PoolClient,
  ownerId: string,
  expenseId: string,
  entityType: string,
  entityId: string,
  actionType: string,
  beforeState: unknown,
  afterState: unknown,
): Promise<void> {
  await client.query(
    `
      INSERT INTO finance_activity (
        expense_id,
        entity_type,
        entity_id,
        action_type,
        before_state,
        after_state,
        actor_user_id
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
    `,
    [
      expenseId,
      entityType,
      entityId,
      actionType,
      beforeState == null ? null : JSON.stringify(beforeState),
      afterState == null ? null : JSON.stringify(afterState),
      ownerId,
    ],
  );
}

async function getLeafCategoryMap(
  client: PoolClient,
  ownerId: string,
  categoryIds: string[],
): Promise<Map<string, true>> {
  if (categoryIds.length === 0) return new Map();
  const { rows } = await client.query<DbRow>(
    `
      SELECT c.id
      FROM expense_categories c
      WHERE c.user_id = $1
        AND c.id = ANY($2::uuid[])
        AND NOT EXISTS (
          SELECT 1
          FROM expense_categories child
          WHERE child.parent_category_id = c.id
        )
    `,
    [ownerId, categoryIds],
  );
  return new Map(rows.map((row: DbRow) => [String(row['id']), true] as const));
}

async function assertLeafCategories(
  client: PoolClient,
  ownerId: string,
  items: ExpenseItemInput[],
): Promise<void> {
  const categoryIds = Array.from(new Set(items.map((item) => item.category_id)));
  const validLeafIds = await getLeafCategoryMap(client, ownerId, categoryIds);
  const invalid = categoryIds.filter((id) => !validLeafIds.has(id));
  if (invalid.length > 0) {
    throw new BadRequestError('Finance items must use valid leaf categories.');
  }
}

async function findCategoryIdByName(
  client: PoolClient,
  ownerId: string,
  name: string,
): Promise<string | null> {
  const { rows } = await client.query<DbRow>(
    `
      SELECT id
      FROM expense_categories
      WHERE user_id = $1
        AND name = $2
      LIMIT 1
    `,
    [ownerId, name],
  );
  return rows[0]?.['id'] ? String(rows[0]['id']) : null;
}

async function lockExpenseHeader(
  client: PoolClient,
  ownerId: string,
  expenseId: string,
): Promise<ExpenseRow> {
  const { rows } = await client.query<DbRow>(
    `
      SELECT *
      FROM expenses
      WHERE id = $1
        AND user_id = $2
      FOR UPDATE
    `,
    [expenseId, ownerId],
  );
  const row = rows[0];
  if (!row) throw new NotFoundError('Expense not found');
  return mapExpenseRow(row);
}

async function lockExpenseItems(client: PoolClient, expenseId: string): Promise<ExpenseItemRow[]> {
  const { rows } = await client.query<DbRow>(
    `
      SELECT *
      FROM expense_items
      WHERE expense_id = $1
      ORDER BY id ASC
      FOR UPDATE
    `,
    [expenseId],
  );
  return rows.map(mapExpenseItemRow);
}

async function lockPayments(client: PoolClient, paymentIds: string[]): Promise<PaymentRow[]> {
  if (paymentIds.length === 0) return [];
  const { rows } = await client.query<DbRow>(
    `
      SELECT *
      FROM payments
      WHERE id = ANY($1::uuid[])
      ORDER BY id ASC
      FOR UPDATE
    `,
    [paymentIds],
  );
  return rows.map(mapPaymentRow);
}

async function loadExpenseItems(client: PoolClient, expenseId: string): Promise<ExpenseItemRow[]> {
  const { rows } = await client.query<DbRow>(
    `
      SELECT *
      FROM expense_items
      WHERE expense_id = $1
      ORDER BY display_order ASC, id ASC
    `,
    [expenseId],
  );
  return rows.map(mapExpenseItemRow);
}

async function loadExpensePayments(client: PoolClient, expenseId: string): Promise<PaymentRow[]> {
  const { rows } = await client.query<DbRow>(
    `
      SELECT *
      FROM payments
      WHERE expense_id = $1
      ORDER BY COALESCE(paid_date, due_date) DESC NULLS LAST, created_at DESC
    `,
    [expenseId],
  );
  return rows.map(mapPaymentRow);
}

async function loadExpenseAllocations(
  client: PoolClient,
  expenseId: string,
): Promise<PaymentAllocationRow[]> {
  const { rows } = await client.query<DbRow>(
    `
      SELECT pa.*
      FROM payment_allocations pa
      JOIN payments p ON p.id = pa.payment_id
      WHERE p.expense_id = $1
      ORDER BY pa.created_at ASC, pa.id ASC
    `,
    [expenseId],
  );
  return rows.map(mapAllocationRow);
}

async function loadExpenseSummary(
  client: PoolClient,
  ownerId: string,
  expenseId: string,
): Promise<ExpenseBalanceSummary> {
  const { rows } = await client.query<DbRow>(
    `
      SELECT
        febv.committed_amount,
        febv.paid_amount,
        febv.outstanding_amount,
        COALESCE((
          SELECT SUM(p.amount)
          FROM payments p
          WHERE p.expense_id = febv.expense_id
            AND p.status = 'scheduled'
        ), 0) AS planned_amount
      FROM finance_expense_balances_v febv
      WHERE febv.user_id = $1
        AND febv.expense_id = $2
    `,
    [ownerId, expenseId],
  );
  return parseSummary(rows[0]);
}

async function getItemBalanceMap(
  client: PoolClient,
  expenseId: string,
): Promise<
  Map<
    string,
    {
      committed_amount: number;
      paid_amount: number;
      outstanding_amount: number;
      side: ExpenseItemRow['side'];
      bride_share_percentage: number | null;
      description: string;
    }
  >
> {
  const { rows } = await client.query<DbRow>(
    `
      SELECT
        expense_item_id,
        committed_amount,
        paid_amount,
        outstanding_amount,
        side,
        bride_share_percentage,
        item_description
      FROM finance_item_balances_v
      WHERE expense_id = $1
    `,
    [expenseId],
  );

  return new Map(
    rows.map((row: DbRow) => [
      String(row['expense_item_id']),
      {
        committed_amount: toNumber(row['committed_amount']),
        paid_amount: toNumber(row['paid_amount']),
        outstanding_amount: toNumber(row['outstanding_amount']),
        side: row['side'] as ExpenseItemRow['side'],
        bride_share_percentage: toNullableNumber(row['bride_share_percentage']),
        description: String(row['item_description']),
      },
    ]),
  );
}

export async function getExpenseDetailsTx(
  client: PoolClient,
  ownerId: string,
  expenseId: string,
): Promise<ExpenseWithDetails> {
  const { rows } = await client.query<DbRow>(
    `
      SELECT *
      FROM expenses
      WHERE id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [expenseId, ownerId],
  );
  const row = rows[0];
  if (!row) throw new NotFoundError('Expense not found');

  const [items, payments, allocations, summary] = await Promise.all([
    loadExpenseItems(client, expenseId),
    loadExpensePayments(client, expenseId),
    loadExpenseAllocations(client, expenseId),
    loadExpenseSummary(client, ownerId, expenseId),
  ]);

  return {
    ...mapExpenseRow(row),
    items,
    payments,
    allocations,
    summary,
    source_name: row['description'] ? String(row['description']) : null,
  };
}

function requireItems(items: ExpenseItemInput[] | undefined): ExpenseItemInput[] {
  if (!items || items.length === 0) {
    throw new BadRequestError('At least one finance line item is required.');
  }
  return items.map((item, index) => ({
    ...ensureSharedPercentage(item),
    display_order: item.display_order ?? index + 1,
    amount: normalizeMoney(item.amount),
  }));
}

function normalizePaymentStatus(input: PaymentMutationInput): PaymentMutationInput {
  const status = input.status;
  if (status === 'scheduled') {
    return {
      ...input,
      due_date: normalizeDate(input.due_date),
      paid_date: null,
      payment_method: null,
    };
  }
  if (status === 'cancelled') {
    return {
      ...input,
      due_date: normalizeDate(input.due_date),
      paid_date: null,
      payment_method: null,
    };
  }
  return {
    ...input,
    paid_date: normalizeDate(input.paid_date),
    due_date: input.due_date ?? null,
    payment_method: input.payment_method ?? null,
    amount: normalizeMoney(input.amount),
  };
}

function buildFlatSourceItem(input: {
  category_id: string;
  description: string;
  amount: number;
  side?: 'bride' | 'groom' | 'shared' | 'mutual' | null | undefined;
  bride_share_percentage?: number | null | undefined;
}): ExpenseItemInput {
  const side =
    input.side === 'mutual' || input.side == null
      ? 'shared'
      : (input.side as ExpenseItemRow['side']);
  return ensureSharedPercentage({
    category_id: input.category_id,
    description: input.description,
    amount: normalizeMoney(input.amount),
    side,
    bride_share_percentage: side === 'shared' ? (input.bride_share_percentage ?? 50) : null,
  });
}

async function insertExpenseHeader(
  client: PoolClient,
  ownerId: string,
  payload: ExpenseInsert,
): Promise<ExpenseRow> {
  const { rows } = await client.query<DbRow>(
    `
      INSERT INTO expenses (
        user_id,
        source_type,
        source_id,
        description,
        expense_date,
        notes,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      ownerId,
      payload.source_type ?? 'manual',
      payload.source_id ?? null,
      payload.description,
      normalizeDate(payload.expense_date),
      payload.notes ?? null,
      payload.status ?? 'active',
    ],
  );
  return mapExpenseRow(rows[0] ?? {});
}

async function updateExpenseHeader(
  client: PoolClient,
  ownerId: string,
  expenseId: string,
  payload: Partial<ExpenseInsert>,
): Promise<ExpenseRow> {
  const current = await lockExpenseHeader(client, ownerId, expenseId);
  const nextStatus = payload.status ?? current.status;

  const { rows } = await client.query<DbRow>(
    `
      UPDATE expenses
      SET
        description = $3,
        expense_date = $4,
        notes = $5,
        status = $6
      WHERE id = $1
        AND user_id = $2
      RETURNING *
    `,
    [
      expenseId,
      ownerId,
      payload.description ?? current.description,
      normalizeDate(payload.expense_date ?? current.expense_date),
      payload.notes ?? current.notes,
      nextStatus,
    ],
  );
  const updated = mapExpenseRow(rows[0] ?? {});
  await insertActivity(
    client,
    ownerId,
    expenseId,
    'expense',
    expenseId,
    'updated',
    current,
    updated,
  );
  return updated;
}

async function syncExpenseItems(
  client: PoolClient,
  ownerId: string,
  expenseId: string,
  items: ExpenseItemInput[],
): Promise<ExpenseItemRow[]> {
  const normalizedItems = requireItems(items);
  await assertLeafCategories(client, ownerId, normalizedItems);

  const existing = await lockExpenseItems(client, expenseId);
  const existingById = new Map(existing.map((item) => [item.id, item]));
  const keptIds = new Set<string>();
  const nextRows: ExpenseItemRow[] = [];

  for (const [index, rawItem] of normalizedItems.entries()) {
    const item = { ...rawItem, display_order: rawItem.display_order ?? index + 1 };
    if (item.id && existingById.has(item.id)) {
      const before = existingById.get(item.id)!;
      const { rows } = await client.query<DbRow>(
        `
          UPDATE expense_items
          SET
            category_id = $2,
            event_id = $3,
            description = $4,
            amount = $5,
            side = $6,
            bride_share_percentage = $7,
            display_order = $8
          WHERE id = $1
          RETURNING *
        `,
        [
          item.id,
          item.category_id,
          item.event_id ?? null,
          item.description,
          normalizeMoney(item.amount),
          item.side,
          item.side === 'shared' ? (item.bride_share_percentage ?? 50) : null,
          item.display_order,
        ],
      );
      const updated = mapExpenseItemRow(rows[0] ?? {});
      keptIds.add(updated.id);
      nextRows.push(updated);
      await insertActivity(
        client,
        ownerId,
        expenseId,
        'expense_item',
        updated.id,
        'updated',
        before,
        updated,
      );
      continue;
    }

    const { rows } = await client.query<DbRow>(
      `
        INSERT INTO expense_items (
          expense_id,
          category_id,
          event_id,
          description,
          amount,
          side,
          bride_share_percentage,
          display_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        expenseId,
        item.category_id,
        item.event_id ?? null,
        item.description,
        normalizeMoney(item.amount),
        item.side,
        item.side === 'shared' ? (item.bride_share_percentage ?? 50) : null,
        item.display_order,
      ],
    );
    const created = mapExpenseItemRow(rows[0] ?? {});
    keptIds.add(created.id);
    nextRows.push(created);
    await insertActivity(
      client,
      ownerId,
      expenseId,
      'expense_item',
      created.id,
      'created',
      null,
      created,
    );
  }

  for (const row of existing) {
    if (keptIds.has(row.id)) continue;
    await client.query(`DELETE FROM expense_items WHERE id = $1`, [row.id]);
    await insertActivity(client, ownerId, expenseId, 'expense_item', row.id, 'deleted', row, null);
  }

  return nextRows.sort((a, b) => a.display_order - b.display_order);
}

function autoAllocateProportionally(
  totalAmount: number,
  candidates: Array<{ id: string; available: number }>,
): PaymentAllocationInput[] {
  const totalCents = toCents(totalAmount);
  const availableTotal = candidates.reduce((sum, candidate) => sum + candidate.available, 0);
  const availableCentsTotal = toCents(availableTotal);
  if (totalCents <= 0 || availableCentsTotal <= 0) {
    throw new BadRequestError('No available balance exists for auto-allocation.');
  }

  const prepared = candidates.map((candidate) => {
    const candidateCents = toCents(candidate.available);
    const exact = (totalCents * candidateCents) / availableCentsTotal;
    const base = Math.floor(exact);
    return {
      id: candidate.id,
      base,
      remainder: exact - base,
    };
  });

  let allocated = prepared.reduce((sum, candidate) => sum + candidate.base, 0);
  let remaining = totalCents - allocated;

  prepared.sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    return a.id.localeCompare(b.id);
  });

  for (const candidate of prepared) {
    if (remaining <= 0) break;
    candidate.base += 1;
    remaining -= 1;
  }

  allocated = prepared.reduce((sum, candidate) => sum + candidate.base, 0);
  if (allocated !== totalCents) {
    throw new BadRequestError('Auto-allocation failed to reach the payment total.');
  }

  return prepared
    .filter((candidate) => candidate.base > 0)
    .map((candidate) => ({
      expense_item_id: candidate.id,
      amount: fromCents(candidate.base),
    }));
}

async function insertPaymentAllocations(
  client: PoolClient,
  ownerId: string,
  expenseId: string,
  paymentId: string,
  allocations: PaymentAllocationInput[],
): Promise<void> {
  for (const allocation of allocations) {
    const { rows } = await client.query<DbRow>(
      `
        INSERT INTO payment_allocations (
          payment_id,
          expense_item_id,
          amount
        )
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [paymentId, allocation.expense_item_id, normalizeMoney(allocation.amount)],
    );
    const created = mapAllocationRow(rows[0] ?? {});
    await insertActivity(
      client,
      ownerId,
      expenseId,
      'payment_allocation',
      created.id,
      'created',
      null,
      created,
    );
  }
}

async function removeExistingAllocations(
  client: PoolClient,
  ownerId: string,
  expenseId: string,
  paymentId: string,
): Promise<Map<string, number>> {
  const { rows } = await client.query<DbRow>(
    `
      SELECT *
      FROM payment_allocations
      WHERE payment_id = $1
      ORDER BY expense_item_id ASC
      FOR UPDATE
    `,
    [paymentId],
  );

  const adjustments = new Map<string, number>();
  for (const row of rows) {
    const before = mapAllocationRow(row);
    adjustments.set(before.expense_item_id, before.amount);
    await client.query(`DELETE FROM payment_allocations WHERE id = $1`, [before.id]);
    await insertActivity(
      client,
      ownerId,
      expenseId,
      'payment_allocation',
      before.id,
      'deleted',
      before,
      null,
    );
  }
  return adjustments;
}

function validateAllocationSum(amount: number, allocations: PaymentAllocationInput[]): void {
  const sum = normalizeMoney(
    allocations.reduce((total, allocation) => total + allocation.amount, 0),
  );
  if (normalizeMoney(amount) !== sum) {
    throw new BadRequestError('Payment allocations must add up to the full payment amount.');
  }
}

function buildWorkingAvailability(params: {
  balances: Map<
    string,
    { committed_amount: number; paid_amount: number; outstanding_amount: number }
  >;
  currentPayment?: PaymentRow | null;
  removedAllocations?: Map<string, number>;
}): Map<string, { outstanding: number; paid: number }> {
  const result = new Map<string, { outstanding: number; paid: number }>();
  for (const [itemId, balance] of params.balances.entries()) {
    let paid = balance.paid_amount;
    if (params.currentPayment && params.currentPayment.status === 'posted') {
      const previousAllocation = params.removedAllocations?.get(itemId) ?? 0;
      if (previousAllocation > 0) {
        if (params.currentPayment.direction === 'outflow') paid -= previousAllocation;
        else paid += previousAllocation;
      }
    }
    const committed = balance.committed_amount;
    result.set(itemId, {
      paid: normalizeMoney(paid),
      outstanding: normalizeMoney(committed - paid),
    });
  }
  return result;
}

export async function createPaymentRecordTx(
  client: PoolClient,
  ownerId: string,
  expenseId: string,
  payload: PaymentMutationInput,
  currentPayment: PaymentRow | null = null,
): Promise<PaymentRow> {
  const normalized = normalizePaymentStatus(payload);
  const header = await lockExpenseHeader(client, ownerId, expenseId);
  const items = await lockExpenseItems(client, expenseId);
  if (items.length === 0) {
    throw new BadRequestError(
      'You must add at least one finance line item before recording payments.',
    );
  }

  const currentLockedPayments = currentPayment
    ? await lockPayments(client, [currentPayment.id])
    : [];
  const lockedCurrentPayment = currentLockedPayments[0] ?? currentPayment;
  const removedAllocations =
    lockedCurrentPayment != null
      ? await removeExistingAllocations(client, ownerId, expenseId, lockedCurrentPayment.id)
      : new Map<string, number>();

  if (normalized.new_items && normalized.new_items.length > 0) {
    const nextItems = [
      ...items.map((item) => ({
        id: item.id,
        category_id: item.category_id,
        event_id: item.event_id,
        description: item.description,
        amount: item.amount,
        side: item.side,
        bride_share_percentage: item.bride_share_percentage,
        display_order: item.display_order,
      })),
      ...normalized.new_items,
    ];
    await syncExpenseItems(client, ownerId, expenseId, nextItems);
  }

  const balances = await getItemBalanceMap(client, expenseId);
  const working = buildWorkingAvailability({
    balances,
    currentPayment: lockedCurrentPayment,
    removedAllocations,
  });

  const candidateAmount = normalizeMoney(normalized.amount);
  const hasExplicitAllocations = (normalized.allocations?.length ?? 0) > 0;

  let allocations = normalized.allocations?.map((allocation) => ({
    expense_item_id: allocation.expense_item_id,
    amount: normalizeMoney(allocation.amount),
  }));

  if (normalized.status === 'posted') {
    if (normalized.direction === 'inflow' && !hasExplicitAllocations) {
      throw new BadRequestError('Refunds require explicit line-item allocations.');
    }

    if (normalized.direction !== 'inflow' && !hasExplicitAllocations) {
      const candidates = Array.from(working.entries())
        .map(([id, values]) => ({ id, available: values.outstanding }))
        .filter((entry) => entry.available > 0);
      const available = normalizeMoney(candidates.reduce((sum, item) => sum + item.available, 0));
      if (candidateAmount > available) {
        const excess = normalizeMoney(candidateAmount - available);
        throw new AppError(
          `Payment exceeds the remaining balance by ${excess}. Add a new finance line item such as Tip, Late Fee, or Extra Service to continue.`,
          400,
          'EXCESS_AMOUNT',
        );
      }
      allocations = autoAllocateProportionally(candidateAmount, candidates);
    }

    if (!allocations || allocations.length === 0) {
      throw new BadRequestError('Posted payments require allocations.');
    }

    validateAllocationSum(candidateAmount, allocations);

    for (const allocation of allocations) {
      const itemState = working.get(allocation.expense_item_id);
      if (!itemState) {
        throw new BadRequestError('Payment allocation references an invalid expense item.');
      }
      const limit = normalized.direction === 'inflow' ? itemState.paid : itemState.outstanding;
      if (normalizeMoney(allocation.amount) > normalizeMoney(limit)) {
        throw new ConflictError(
          normalized.direction === 'inflow'
            ? 'Refund allocation exceeds the amount previously paid for one of the line items.'
            : 'Payment allocation exceeds the remaining balance for one of the line items.',
        );
      }
    }
  } else {
    allocations = [];
  }

  let payment: PaymentRow;
  if (lockedCurrentPayment) {
    const before = lockedCurrentPayment;
    const { rows } = await client.query<DbRow>(
      `
        UPDATE payments
        SET
          amount = $2,
          direction = $3,
          status = $4,
          due_date = $5,
          paid_date = $6,
          payment_method = $7,
          paid_by_side = $8,
          transaction_reference = $9,
          notes = $10,
          reverses_payment_id = $11
        WHERE id = $1
        RETURNING *
      `,
      [
        lockedCurrentPayment.id,
        candidateAmount,
        normalized.direction ?? 'outflow',
        normalized.status,
        normalized.due_date ?? null,
        normalized.paid_date ?? null,
        normalized.payment_method ?? null,
        normalized.paid_by_side ?? null,
        normalized.transaction_reference ?? null,
        normalized.notes ?? null,
        normalized.reverses_payment_id ?? null,
      ],
    );
    payment = mapPaymentRow(rows[0] ?? {});
    await insertActivity(
      client,
      ownerId,
      expenseId,
      'payment',
      payment.id,
      payment.status === 'entered_in_error' ? 'entered_in_error' : 'updated',
      before,
      payment,
    );
  } else {
    const { rows } = await client.query<DbRow>(
      `
        INSERT INTO payments (
          expense_id,
          amount,
          direction,
          status,
          due_date,
          paid_date,
          payment_method,
          paid_by_side,
          transaction_reference,
          notes,
          reverses_payment_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `,
      [
        expenseId,
        candidateAmount,
        normalized.direction ?? 'outflow',
        normalized.status,
        normalized.due_date ?? null,
        normalized.paid_date ?? null,
        normalized.payment_method ?? null,
        normalized.paid_by_side ?? null,
        normalized.transaction_reference ?? null,
        normalized.notes ?? null,
        normalized.reverses_payment_id ?? null,
      ],
    );
    payment = mapPaymentRow(rows[0] ?? {});
    await insertActivity(
      client,
      ownerId,
      expenseId,
      'payment',
      payment.id,
      'created',
      null,
      payment,
    );
  }

  if (allocations.length > 0) {
    await insertPaymentAllocations(client, ownerId, header.id, payment.id, allocations);
  }

  return payment;
}

export async function deleteScheduledPaymentTx(
  client: PoolClient,
  ownerId: string,
  paymentId: string,
): Promise<void> {
  const payments = await lockPayments(client, [paymentId]);
  const payment = payments[0];
  if (!payment) throw new NotFoundError('Payment not found');
  if (payment.status !== 'scheduled') {
    throw new ConflictError('Only scheduled payments can be deleted.');
  }
  await client.query(`DELETE FROM payments WHERE id = $1`, [paymentId]);
  await insertActivity(
    client,
    ownerId,
    payment.expense_id,
    'payment',
    paymentId,
    'deleted',
    payment,
    null,
  );
}

async function normalizeTerminatedExpense(
  client: PoolClient,
  ownerId: string,
  expenseId: string,
): Promise<void> {
  await client.query(
    `
      UPDATE payments
      SET status = 'cancelled'
      WHERE expense_id = $1
        AND status = 'scheduled'
    `,
    [expenseId],
  );

  const balances = await getItemBalanceMap(client, expenseId);
  const items = await loadExpenseItems(client, expenseId);

  for (const item of items) {
    const balance = balances.get(item.id);
    const targetAmount = normalizeMoney(balance?.paid_amount ?? 0);
    if (targetAmount === 0) {
      await client.query(`DELETE FROM expense_items WHERE id = $1`, [item.id]);
      await insertActivity(
        client,
        ownerId,
        expenseId,
        'expense_item',
        item.id,
        'deleted',
        item,
        null,
      );
      continue;
    }
    if (item.amount === targetAmount) continue;
    const { rows } = await client.query<DbRow>(
      `
        UPDATE expense_items
        SET amount = $2
        WHERE id = $1
        RETURNING *
      `,
      [item.id, targetAmount],
    );
    await insertActivity(
      client,
      ownerId,
      expenseId,
      'expense_item',
      item.id,
      'updated',
      item,
      mapExpenseItemRow(rows[0] ?? {}),
    );
  }
}

export async function listExpenses(
  ownerId: string,
  filters: ExpenseQueryFilters = {},
): Promise<ExpenseWithDetails[]> {
  return withPgClient(async (client) => {
    const values: unknown[] = [ownerId];
    const clauses = ['e.user_id = $1'];

    if (filters.status) {
      values.push(filters.status);
      clauses.push(`e.status = $${values.length}`);
    }
    if (filters.source_type) {
      values.push(filters.source_type);
      clauses.push(`e.source_type = $${values.length}`);
    }
    if (filters.category_id) {
      values.push(filters.category_id);
      clauses.push(
        `EXISTS (SELECT 1 FROM expense_items ei WHERE ei.expense_id = e.id AND ei.category_id = $${values.length})`,
      );
    }
    if (filters.side) {
      values.push(filters.side);
      clauses.push(
        `EXISTS (SELECT 1 FROM expense_items ei WHERE ei.expense_id = e.id AND ei.side = $${values.length})`,
      );
    }

    const { rows } = await client.query<DbRow>(
      `
        SELECT e.*
        FROM expenses e
        WHERE ${clauses.join(' AND ')}
        ORDER BY e.expense_date DESC, e.created_at DESC
      `,
      values,
    );

    const expenses = rows.map(mapExpenseRow);
    const details = await Promise.all(
      expenses.map((expense: ExpenseRow) => getExpenseDetailsTx(client, ownerId, expense.id)),
    );
    return details;
  });
}

export async function getExpense(ownerId: string, expenseId: string): Promise<ExpenseWithDetails> {
  return withPgClient((client) => getExpenseDetailsTx(client, ownerId, expenseId));
}

export async function createManualExpense(
  ownerId: string,
  payload: ExpenseWriteInput,
): Promise<ExpenseWithDetails> {
  return withPgTransaction(async (client) => {
    const expense = await insertExpenseHeader(client, ownerId, {
      ...payload,
      user_id: ownerId,
      source_type: payload.source_type ?? 'manual',
      source_id: payload.source_id ?? null,
      status: payload.status ?? 'active',
    });
    await insertActivity(
      client,
      ownerId,
      expense.id,
      'expense',
      expense.id,
      'created',
      null,
      expense,
    );
    await syncExpenseItems(client, ownerId, expense.id, payload.items);
    for (const payment of payload.payments ?? []) {
      await createPaymentRecordTx(client, ownerId, expense.id, payment);
    }
    return getExpenseDetailsTx(client, ownerId, expense.id);
  });
}

export async function updateExpense(
  ownerId: string,
  expenseId: string,
  payload: Partial<ExpenseWriteInput>,
): Promise<ExpenseWithDetails> {
  return withPgTransaction(async (client) => {
    const current = await lockExpenseHeader(client, ownerId, expenseId);
    const next = await updateExpenseHeader(client, ownerId, expenseId, payload);
    if (payload.items) {
      await syncExpenseItems(client, ownerId, expenseId, payload.items);
    } else {
      await lockExpenseItems(client, expenseId);
    }

    if (current.status !== 'terminated' && next.status === 'terminated') {
      await normalizeTerminatedExpense(client, ownerId, expenseId);
    }

    for (const payment of payload.payments ?? []) {
      await createPaymentRecordTx(client, ownerId, expenseId, payment);
    }

    return getExpenseDetailsTx(client, ownerId, expenseId);
  });
}

export async function deleteExpense(ownerId: string, expenseId: string): Promise<void> {
  await withPgTransaction(async (client) => {
    const expense = await lockExpenseHeader(client, ownerId, expenseId);
    const payments = await loadExpensePayments(client, expenseId);
    if (payments.length > 0) {
      throw new ConflictError('Expenses with payment history cannot be deleted.');
    }
    await client.query(`DELETE FROM expenses WHERE id = $1 AND user_id = $2`, [expenseId, ownerId]);
    await insertActivity(
      client,
      ownerId,
      expenseId,
      'expense',
      expenseId,
      'deleted',
      expense,
      null,
    );
  });
}

export async function listExpensePayments(
  ownerId: string,
  expenseId: string,
): Promise<PaymentRow[]> {
  await getExpense(ownerId, expenseId);
  return withPgClient((client) => loadExpensePayments(client, expenseId));
}

export async function createExpensePayment(
  ownerId: string,
  expenseId: string,
  payload: PaymentMutationInput,
): Promise<ExpenseWithDetails> {
  return withPgTransaction(async (client) => {
    await createPaymentRecordTx(client, ownerId, expenseId, payload);
    return getExpenseDetailsTx(client, ownerId, expenseId);
  });
}

export async function updateExpensePayment(
  ownerId: string,
  paymentId: string,
  payload: PaymentMutationInput,
): Promise<ExpenseWithDetails> {
  return withPgTransaction(async (client) => {
    const payments = await lockPayments(client, [paymentId]);
    const payment = payments[0];
    if (!payment) throw new NotFoundError('Payment not found');
    if (payment.status === 'cancelled') {
      throw new ConflictError('Cancelled scheduled payments cannot be edited.');
    }
    await createPaymentRecordTx(client, ownerId, payment.expense_id, payload, payment);
    return getExpenseDetailsTx(client, ownerId, payment.expense_id);
  });
}

export async function deleteExpensePayment(ownerId: string, paymentId: string): Promise<void> {
  await withPgTransaction((client) => deleteScheduledPaymentTx(client, ownerId, paymentId));
}

export async function getSourceExpenseId(
  ownerId: string,
  sourceType: SourceType,
  sourceId: string,
): Promise<string | null> {
  return withPgClient(async (client) => {
    const { rows } = await client.query<DbRow>(
      `
        SELECT id
        FROM expenses
        WHERE user_id = $1
          AND source_type = $2
          AND source_id = $3
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [ownerId, sourceType, sourceId],
    );
    return rows[0]?.['id'] ? String(rows[0]['id']) : null;
  });
}

export async function getSourceExpense(
  ownerId: string,
  sourceType: SourceType,
  sourceId: string,
): Promise<ExpenseWithDetails | null> {
  const expenseId = await getSourceExpenseId(ownerId, sourceType, sourceId);
  if (!expenseId) return null;
  return getExpense(ownerId, expenseId);
}

export async function upsertSourceExpenseTx(
  client: PoolClient,
  ownerId: string,
  sourceType: Exclude<SourceType, 'manual'>,
  sourceId: string,
  input: SourceFinanceInput,
): Promise<ExpenseWithDetails | null> {
  const { rows } = await client.query<DbRow>(
    `
      SELECT id
      FROM expenses
      WHERE user_id = $1
        AND source_type = $2
        AND source_id = $3
        AND status = 'active'
      LIMIT 1
    `,
    [ownerId, sourceType, sourceId],
  );
  const existingId = rows[0]?.['id'] ? String(rows[0]['id']) : null;

  const items = input.items ? requireItems(input.items) : [];
  if (items.length === 0) {
    if (!existingId) return null;
    const payments = await loadExpensePayments(client, existingId);
    if (payments.length > 0) {
      throw new ConflictError(
        'This vendor or venue already has payment history, so its finance obligation cannot be cleared.',
      );
    }
    const expense = await lockExpenseHeader(client, ownerId, existingId);
    await client.query(`DELETE FROM expenses WHERE id = $1 AND user_id = $2`, [
      existingId,
      ownerId,
    ]);
    await insertActivity(
      client,
      ownerId,
      existingId,
      'expense',
      existingId,
      'deleted',
      expense,
      null,
    );
    return null;
  }

  if (existingId) {
    await updateExpenseHeader(client, ownerId, existingId, {
      description: input.description,
      expense_date: input.expense_date,
      notes: input.notes ?? null,
      status: 'active',
    });
    await syncExpenseItems(client, ownerId, existingId, items);
    for (const payment of input.payments ?? []) {
      await createPaymentRecordTx(client, ownerId, existingId, payment);
    }
    return getExpenseDetailsTx(client, ownerId, existingId);
  }

  const created = await insertExpenseHeader(client, ownerId, {
    user_id: ownerId,
    source_type: sourceType,
    source_id: sourceId,
    description: input.description,
    expense_date: input.expense_date,
    notes: input.notes ?? null,
    status: 'active',
  });
  await insertActivity(
    client,
    ownerId,
    created.id,
    'expense',
    created.id,
    'created',
    null,
    created,
  );
  await syncExpenseItems(client, ownerId, created.id, items);
  for (const payment of input.payments ?? []) {
    await createPaymentRecordTx(client, ownerId, created.id, payment);
  }
  return getExpenseDetailsTx(client, ownerId, created.id);
}

export async function upsertSourceExpense(
  ownerId: string,
  sourceType: Exclude<SourceType, 'manual'>,
  sourceId: string,
  input: SourceFinanceInput,
): Promise<ExpenseWithDetails | null> {
  return withPgTransaction((client) =>
    upsertSourceExpenseTx(client, ownerId, sourceType, sourceId, input),
  );
}

export async function buildVendorSourceItems(
  ownerId: string,
  categoryId: string | null,
  name: string,
  totalCost: number | null | undefined,
  side?: 'bride' | 'groom' | 'shared' | 'mutual' | null,
  brideSharePercentage?: number | null,
): Promise<ExpenseItemInput[]> {
  if (!totalCost || totalCost <= 0) return [];
  if (!categoryId) {
    throw new BadRequestError('Vendors need a default category before finance can be recorded.');
  }
  return [
    buildFlatSourceItem({
      category_id: categoryId,
      description: name,
      amount: totalCost,
      side,
      bride_share_percentage: brideSharePercentage,
    }),
  ];
}

export async function buildVenueSourceItems(
  ownerId: string,
  venueType: string | null | undefined,
  name: string,
  totalCost: number | null | undefined,
  side?: 'bride' | 'groom' | 'shared' | 'mutual' | null,
  brideSharePercentage?: number | null,
): Promise<ExpenseItemInput[]> {
  if (!totalCost || totalCost <= 0) return [];
  return withPgClient(async (client) => {
    await ensureDefaultCategoriesTx(client, ownerId);
    const categoryName = mapVenueTypeToCategoryName(venueType);
    const categoryId = await findCategoryIdByName(client, ownerId, categoryName);
    if (!categoryId) {
      throw new BadRequestError(`Venue category "${categoryName}" is missing for this user.`);
    }
    return [
      buildFlatSourceItem({
        category_id: categoryId,
        description: name,
        amount: totalCost,
        side,
        bride_share_percentage: brideSharePercentage,
      }),
    ];
  });
}

export async function getFinanceDashboardTotals(ownerId: string): Promise<{
  committed: number;
  paid: number;
  outstanding: number;
}> {
  return withPgClient(async (client) => {
    const { rows } = await client.query<DbRow>(
      `
        SELECT
          COALESCE(SUM(committed_amount), 0) AS committed,
          COALESCE(SUM(paid_amount), 0) AS paid,
          COALESCE(SUM(outstanding_amount), 0) AS outstanding
        FROM finance_expense_balances_v
        WHERE user_id = $1
      `,
      [ownerId],
    );
    return {
      committed: toNumber(rows[0]?.['committed']),
      paid: toNumber(rows[0]?.['paid']),
      outstanding: toNumber(rows[0]?.['outstanding']),
    };
  });
}

export async function getCategoryRollups(ownerId: string): Promise<
  Array<{
    category_id: string;
    parent_category_id: string | null;
    committed_amount: number;
    paid_amount: number;
    outstanding_amount: number;
  }>
> {
  return withPgClient(async (client) => {
    const { rows } = await client.query<DbRow>(
      `
        SELECT *
        FROM finance_category_rollups_v
        WHERE user_id = $1
      `,
      [ownerId],
    );
    return rows.map((row: DbRow) => ({
      category_id: String(row['category_id']),
      parent_category_id: row['parent_category_id'] ? String(row['parent_category_id']) : null,
      committed_amount: toNumber(row['committed_amount']),
      paid_amount: toNumber(row['paid_amount']),
      outstanding_amount: toNumber(row['outstanding_amount']),
    }));
  });
}

export async function getSideLiabilityRollups(ownerId: string): Promise<
  Array<{
    side: 'bride' | 'groom' | 'shared';
    committed_amount: number;
    paid_amount: number;
    outstanding_amount: number;
  }>
> {
  const [liability, cash] = await Promise.all([
    withPgClient(async (client) => {
      const { rows } = await client.query<DbRow>(
        `
          SELECT *
          FROM finance_side_liability_rollups_v
          WHERE user_id = $1
        `,
        [ownerId],
      );
      return rows;
    }),
    withPgClient(async (client) => {
      const { rows } = await client.query<DbRow>(
        `
          SELECT side, paid_amount
          FROM finance_side_cash_rollups_v
          WHERE user_id = $1
        `,
        [ownerId],
      );
      return rows;
    }),
  ]);

  const cashBySide = new Map(
    cash.map((row: DbRow) => [String(row['side']), toNumber(row['paid_amount'])] as const),
  );
  const rows = liability.map((row: DbRow) => ({
    side: String(row['side']) as 'bride' | 'groom' | 'shared',
    committed_amount: toNumber(row['committed_amount']),
    paid_amount: toNumber(row['paid_amount']),
    outstanding_amount: toNumber(row['outstanding_amount']),
    cash_paid_amount: cashBySide.get(String(row['side'])) ?? 0,
  }));

  return [
    ...rows,
    {
      side: 'shared',
      committed_amount: 0,
      paid_amount: 0,
      outstanding_amount: 0,
    },
  ];
}

export async function getScheduledPayments(ownerId: string): Promise<PaymentRow[]> {
  return withPgClient(async (client) => {
    const { rows } = await client.query<DbRow>(
      `
        SELECT p.*
        FROM payments p
        JOIN expenses e ON e.id = p.expense_id
        WHERE e.user_id = $1
          AND p.status = 'scheduled'
        ORDER BY p.due_date ASC, p.created_at ASC
      `,
      [ownerId],
    );
    return rows.map(mapPaymentRow);
  });
}
