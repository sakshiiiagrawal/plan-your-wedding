import { z } from 'zod';

const emptyStringToNull = z.preprocess(
  (value) => (value === '' ? null : value),
  z.union([z.string(), z.null()]).optional(),
);

const emptyStringToNullEmail = z.preprocess(
  (value) => (value === '' ? null : value),
  z.union([z.string().email(), z.null()]).optional(),
);

export const createGuestSchema = z.object({
  first_name: z.string().min(1),
  last_name: emptyStringToNull,
  phone: emptyStringToNull,
  email: emptyStringToNullEmail,
  side: z.enum(['bride', 'groom', 'mutual']),
  group_id: z.preprocess(
    (value) => (value === '' ? null : value),
    z.union([z.string().uuid(), z.null()]).optional(),
  ),
  relationship: emptyStringToNull,
  is_vip: z.boolean().optional(),
  age_group: z.enum(['child', 'adult', 'senior']).optional(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  meal_preference: z.enum(['vegetarian', 'jain', 'vegan', 'non_vegetarian']).optional(),
  dietary_restrictions: emptyStringToNull,
  needs_accommodation: z.boolean().optional(),
  needs_pickup: z.boolean().optional(),
  pickup_location: emptyStringToNull,
  arrival_date: emptyStringToNull,
  arrival_time: emptyStringToNull,
  departure_date: emptyStringToNull,
  departure_time: emptyStringToNull,
  notes: emptyStringToNull,
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

export const bulkDeleteGuestsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const createGroupSchema = z.object({
  name: z.string().min(1),
  side: z.enum(['bride', 'groom', 'mutual']),
  description: z.string().optional().nullable(),
});

export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
