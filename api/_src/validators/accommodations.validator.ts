import { z } from 'zod';

export const createAccommodationSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  total_rooms: z.number().int().nonnegative().optional().nullable(),
  contact_person: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  contact_email: z.string().email().optional().nullable(),
  check_in_time: z.string().optional().nullable(),
  check_out_time: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateAccommodationSchema = createAccommodationSchema.partial();

export const addRoomSchema = z.object({
  room_number: z.string().min(1),
  room_type: z.enum(['single', 'double', 'suite', 'family', 'dormitory']),
  capacity: z.number().int().nonnegative().optional(),
  rate_per_night: z.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
});

export const createAllocationSchema = z.object({
  room_id: z.string().uuid(),
  guest_id: z.string().uuid(),
  check_in_date: z.string().min(1),
  check_out_date: z.string().min(1),
  notes: z.string().optional().nullable(),
});

export const updateAllocationSchema = createAllocationSchema.partial();
