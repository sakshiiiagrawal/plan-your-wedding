import { z } from 'zod';
import { WEDDING_SECTIONS } from '@wedding-planner/shared';

const roleSchema = z.enum(['admin', 'editor', 'viewer']);

// null / omitted = full access. Admins always get full access — the service
// normalises their sections to null regardless of what's sent.
const sectionsSchema = z
  .array(z.enum(WEDDING_SECTIONS))
  .min(1, 'Select at least one section')
  .nullable()
  .optional();

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: roleSchema,
  sections: sectionsSchema,
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
});

export const updateMemberSchema = z
  .object({
    role: roleSchema.optional(),
    sections: sectionsSchema,
  })
  .refine((v) => v.role !== undefined || v.sections !== undefined, {
    message: 'Nothing to update',
  });

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
