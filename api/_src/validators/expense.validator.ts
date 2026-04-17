import { z } from 'zod';

export const updateTotalExpenseSchema = z.object({
  total_expense: z.coerce.number().nonnegative().optional(),
  bride_side_contribution: z.coerce.number().nonnegative().optional(),
  groom_side_contribution: z.coerce.number().nonnegative().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1),
  allocated_amount: z.coerce.number().nonnegative().optional(),
  description: z.string().optional().nullable(),
  parent_category_id: z.string().uuid().optional().nullable(),
  display_order: z.coerce.number().int().nonnegative().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createCustomCategorySchema = z.object({
  name: z.string().min(1),
  parent_category_id: z.string().uuid().optional().nullable(),
  allocated_amount: z.number().nonnegative().optional(),
  description: z.string().optional().nullable(),
});

const paymentMethodEnum = z.enum(['cash', 'bank_transfer', 'upi', 'cheque', 'credit_card']);

export const financeItemSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  event_id: z.string().uuid().optional().nullable(),
  description: z.string().min(1),
  amount: z.coerce.number().nonnegative(),
  side: z.enum(['bride', 'groom', 'shared']),
  bride_share_percentage: z.coerce.number().min(0).max(100).optional().nullable(),
  display_order: z.coerce.number().int().positive().optional(),
});

export const paymentAllocationSchema = z.object({
  expense_item_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
});

export const financePaymentSchema = z.object({
  id: z.string().uuid().optional(),
  amount: z.coerce.number().positive(),
  direction: z.enum(['outflow', 'inflow']).optional(),
  status: z.enum(['scheduled', 'posted', 'cancelled', 'entered_in_error']),
  due_date: z.string().optional().nullable(),
  paid_date: z.string().optional().nullable(),
  payment_method: paymentMethodEnum.optional().nullable(),
  paid_by_side: z.enum(['bride', 'groom', 'shared']).optional().nullable(),
  transaction_reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  reverses_payment_id: z.string().uuid().optional().nullable(),
  allocations: z.array(paymentAllocationSchema).optional(),
  new_items: z.array(financeItemSchema.omit({ id: true })).optional(),
});

export const createExpenseSchema = z.object({
  source_type: z.enum(['manual', 'vendor', 'venue']).optional(),
  source_id: z.string().uuid().optional().nullable(),
  description: z.string().min(1),
  expense_date: z.string().min(1),
  notes: z.string().optional().nullable(),
  status: z.enum(['active', 'closed', 'terminated']).optional(),
  items: z.array(financeItemSchema).min(1),
  payments: z.array(financePaymentSchema).optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial().extend({
  items: z.array(financeItemSchema).min(1).optional(),
  payments: z.array(financePaymentSchema).optional(),
});

export const createExpensePaymentSchema = financePaymentSchema;
export const updateExpensePaymentSchema = financePaymentSchema.partial();
