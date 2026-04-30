import { z } from 'zod';
import { financeItemSchema, financePaymentSchema } from './expense.validator';

const roomInputSchema = z.object({
  room_number: z.string().min(1),
  room_type: z.string().min(1),
  capacity: z.coerce.number().int().nonnegative().optional(),
  rate_per_night: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
});

export type RoomInput = z.infer<typeof roomInputSchema>;

export const createVenueSchema = z.object({
  name: z.string().min(1),
  venue_type: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  google_maps_link: z.string().optional().nullable(),
  contact_person: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  capacity: z.coerce.number().int().nonnegative().optional().nullable(),
  total_cost: z.coerce.number().nonnegative().optional().nullable(),
  expense_date: z.string().optional().nullable(),
  side: z.enum(['bride', 'groom', 'shared', 'mutual']).optional().nullable(),
  bride_share_percentage: z.coerce.number().min(0).max(100).optional().nullable(),
  has_accommodation: z.boolean().optional(),
  default_check_in_date: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v || null),
  default_check_out_date: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v || null),
  notes: z.string().optional().nullable(),
  rooms: z.array(roomInputSchema).optional(),
  finance: z
    .object({
      expense_date: z.string().min(1),
      notes: z.string().optional().nullable(),
      items: z.array(financeItemSchema).min(1),
      payments: z.array(financePaymentSchema).optional(),
    })
    .optional(),
});

export const updateVenueSchema = createVenueSchema.partial();

export const addRoomSchema = z.object({
  room_number: z.string().min(1),
  room_type: z.string().min(1),
  capacity: z.coerce.number().int().nonnegative().optional(),
  rate_per_night: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
});

export const updateRoomSchema = z.object({
  room_number: z.string().min(1).optional(),
  room_type: z.string().min(1).optional(),
  capacity: z.coerce.number().int().nonnegative().optional(),
  rate_per_night: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
});

export const createAllocationSchema = z.object({
  room_id: z.string().uuid(),
  guest_ids: z.array(z.string().uuid()).min(1),
  check_in_date: z.string().min(1),
  check_out_date: z.string().min(1),
  notes: z.string().optional().nullable(),
});

export const updateAllocationSchema = createAllocationSchema.partial();

export const createPaymentSchema = financePaymentSchema;

export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
