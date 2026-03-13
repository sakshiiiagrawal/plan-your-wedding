import { z } from 'zod';

export const createGuestSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  side: z.enum(['bride', 'groom', 'mutual']),
  group_id: z.string().uuid().optional().nullable(),
  relationship: z.string().optional().nullable(),
  is_vip: z.boolean().optional(),
  age_group: z.enum(['child', 'adult', 'senior']).optional(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  meal_preference: z.enum(['vegetarian', 'jain', 'vegan', 'non_vegetarian']).optional(),
  dietary_restrictions: z.string().optional().nullable(),
  needs_accommodation: z.boolean().optional(),
  needs_pickup: z.boolean().optional(),
  pickup_location: z.string().optional().nullable(),
  arrival_date: z.string().optional().nullable(),
  arrival_time: z.string().optional().nullable(),
  departure_date: z.string().optional().nullable(),
  departure_time: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // Frontend may send an array of event IDs to attach the guest to
  events: z.array(z.string().uuid()).optional(),
});

export const updateGuestSchema = createGuestSchema.partial();

export const bulkCreateGuestsSchema = z.object({
  guests: z.array(createGuestSchema).min(1),
});

export const updateRsvpSchema = z.object({
  rsvp_status: z.enum(['pending', 'confirmed', 'declined', 'tentative']).optional(),
  plus_ones: z.number().int().nonnegative().optional(),
  plus_one_names: z.array(z.string()).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createGroupSchema = z.object({
  name: z.string().min(1),
  side: z.enum(['bride', 'groom', 'mutual']),
  description: z.string().optional().nullable(),
});

export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
