import { z } from 'zod';
import { VENDOR_CATEGORIES } from '../constants/enums';

export const createVendorSchema = z.object({
  name: z.string().min(1),
  category: z.enum(VENDOR_CATEGORIES),
  contact_person: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.preprocess((v) => (v === '' ? null : v), z.string().email().optional().nullable()),
  website: z.preprocess((v) => (v === '' ? null : v), z.string().url().optional().nullable()),
  address: z.string().optional().nullable(),
  total_cost: z.preprocess(
    (v) => (v === '' ? null : v),
    z.coerce.number().nonnegative().optional().nullable(),
  ),
  advance_paid: z.preprocess(
    (v) => (v === '' ? null : v),
    z.coerce.number().nonnegative().optional().nullable(),
  ),
  payment_status: z
    .enum(['pending', 'partial', 'paid', 'overdue', 'cancelled'])
    .optional()
    .nullable(),
  side: z.enum(['bride', 'groom', 'mutual']).optional().nullable(),
  is_shared: z.boolean().optional(),
  is_confirmed: z.boolean().optional(),
  contract_signed: z.boolean().optional(),
  rating: z.preprocess(
    (v) => (v === '' ? null : v),
    z.coerce.number().min(1).max(5).optional().nullable(),
  ),
  notes: z.string().optional().nullable(),
});

export const updateVendorSchema = createVendorSchema.partial();

export const assignToEventSchema = z.object({
  service_description: z.string().optional(),
  arrival_time: z.string().optional(),
  setup_requirements: z.string().optional(),
  special_instructions: z.string().optional(),
});
