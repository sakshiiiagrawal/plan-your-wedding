import { z } from 'zod';

const taskFields = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  due_date: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  event_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  reminder_offset_days: z.number().int().min(0).max(365).optional().nullable(),
  reminder_date: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  reminder_repeat: z.enum(['once', 'daily']).optional(),
});

// Mirrors tasks_reminder_shape_chk so a bad combination is a 400, not a 500.
const reminderShape = (
  data: {
    reminder_offset_days?: number | null | undefined;
    reminder_date?: string | null | undefined;
  },
  ctx: z.RefinementCtx,
) => {
  if (data.reminder_offset_days != null && data.reminder_date != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Set either a relative reminder or a reminder date, not both',
      path: ['reminder_date'],
    });
  }
};

export const createTaskSchema = taskFields.superRefine(reminderShape);

export const updateTaskSchema = taskFields.partial().superRefine(reminderShape);

export const updateStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
});
