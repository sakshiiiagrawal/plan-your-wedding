import { z } from 'zod';

export const updateTotalBudgetSchema = z.object({
  total_budget: z.number().nonnegative().optional(),
  bride_side_contribution: z.number().nonnegative().optional(),
  groom_side_contribution: z.number().nonnegative().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1),
  allocated_amount: z.number().nonnegative().optional(),
  description: z.string().optional().nullable(),
  parent_category_id: z.string().uuid().optional().nullable(),
  display_order: z.number().int().nonnegative().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createCustomCategorySchema = z.object({
  name: z.string().min(1),
  parent_category_id: z.string().uuid().optional().nullable(),
  allocated_amount: z.number().nonnegative().optional(),
  description: z.string().optional().nullable(),
});

export const createExpenseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().nonnegative(),
  expense_date: z.string().min(1),
  category_id: z.string().uuid().optional().nullable(),
  vendor_id: z.string().uuid().optional().nullable(),
  event_id: z.string().uuid().optional().nullable(),
  side: z.enum(['bride', 'groom', 'mutual']).optional().nullable(),
  is_shared: z.boolean().optional(),
  share_percentage: z.number().min(0).max(100).optional().nullable(),
  paid_amount: z.number().nonnegative().optional().nullable(),
  payment_method: z.enum(['cash', 'bank_transfer', 'upi', 'cheque', 'credit_card']).optional().nullable(),
  receipt_url: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateExpenseSchema = createExpenseSchema.partial();
