import { z } from 'zod';

export const createEventSchema = z.object({
  name: z.string().min(1),
  event_type: z.string().min(1),
  event_date: z.string().min(1),
  start_time: z.string().min(1),
  description: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  venue_id: z.string().uuid().optional().nullable(),
  dress_code: z.string().optional().nullable(),
  theme: z.string().optional().nullable(),
  color_palette: z.unknown().optional().nullable(),
  special_notes: z.string().optional().nullable(),
  estimated_guests: z.number().int().nonnegative().optional().nullable(),
  is_public: z.boolean().optional(),
  display_order: z.number().int().nonnegative().optional(),
});

export const updateEventSchema = createEventSchema.partial();

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
