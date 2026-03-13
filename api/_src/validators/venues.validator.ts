import { z } from 'zod';

export const createVenueSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  contact_person: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  contact_email: z.string().email().optional().nullable(),
  capacity: z.number().int().nonnegative().optional().nullable(),
  parking_capacity: z.number().int().nonnegative().optional().nullable(),
  amenities: z.unknown().optional().nullable(),
  restrictions: z.string().optional().nullable(),
  photos: z.array(z.string()).optional().nullable(),
  documents: z.array(z.string()).optional().nullable(),
  booking_amount: z.number().nonnegative().optional().nullable(),
  total_cost: z.number().nonnegative().optional().nullable(),
  payment_status: z
    .enum(['pending', 'partial', 'paid', 'overdue', 'cancelled'])
    .optional()
    .nullable(),
  notes: z.string().optional().nullable(),
});

export const updateVenueSchema = createVenueSchema.partial();

export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
