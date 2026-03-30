import { z } from 'zod';

export const createVendorSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  contact_person: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.preprocess((v) => (v === '' ? null : v), z.string().email().optional().nullable()),
  total_cost: z.preprocess(
    (v) => (v === '' ? null : v),
    z.coerce.number().nonnegative().optional().nullable(),
  ),
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
