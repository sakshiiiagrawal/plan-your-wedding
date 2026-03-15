import { z } from 'zod';
import { VENDOR_CATEGORIES } from '@wedding-planner/shared';

export const createVendorSchema = z.object({
  name: z.string().min(1),
  category: z.enum(VENDOR_CATEGORIES),
  contact_person: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  website: z.string().url().optional().nullable(),
  address: z.string().optional().nullable(),
  total_cost: z.number().nonnegative().optional().nullable(),
  advance_paid: z.number().nonnegative().optional().nullable(),
  payment_status: z
    .enum(['pending', 'partial', 'paid', 'overdue', 'cancelled'])
    .optional()
    .nullable(),
  side: z.enum(['bride', 'groom', 'mutual']).optional().nullable(),
  is_shared: z.boolean().optional(),
  is_confirmed: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export const updateVendorSchema = createVendorSchema.partial();

export const assignToEventSchema = z.object({
  service_description: z.string().optional(),
  arrival_time: z.string().optional(),
  setup_requirements: z.string().optional(),
  special_instructions: z.string().optional(),
});
