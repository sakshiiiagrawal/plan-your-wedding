import { z } from 'zod';
import { financeItemSchema, financePaymentSchema } from './expense.validator';

export const createVendorSchema = z.object({
  name: z.string().min(1),
  category_id: z.string().uuid().optional().nullable(),
  contact_person: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.preprocess((v) => (v === '' ? null : v), z.string().email().optional().nullable()),
  total_cost: z.preprocess(
    (v) => (v === '' ? null : v),
    z.coerce.number().nonnegative().optional().nullable(),
  ),
  expense_date: z.string().optional().nullable(),
  side: z.enum(['bride', 'groom', 'shared', 'mutual']).optional().nullable(),
  bride_share_percentage: z.coerce.number().min(0).max(100).optional().nullable(),
  is_confirmed: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  finance: z
    .object({
      expense_date: z.string().min(1),
      notes: z.string().optional().nullable(),
      items: z.array(financeItemSchema).min(1),
      payments: z.array(financePaymentSchema).optional(),
    })
    .optional(),
});

export const updateVendorSchema = createVendorSchema.partial();

export const assignToEventSchema = z.object({
  service_description: z.string().optional(),
  arrival_time: z.string().optional(),
  setup_requirements: z.string().optional(),
  special_instructions: z.string().optional(),
});
