import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  due_date: z.string().optional().nullable(),
  event_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
});
