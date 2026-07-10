import { z } from 'zod';
import { WEDDING_SECTIONS, MEMBER_PERMISSIONS } from '../../../shared/src';

const roleSchema = z.enum(['admin', 'editor', 'viewer']);

// null / omitted = full access. Admins always get full access — the service
// normalises their sections to null regardless of what's sent.
const sectionsSchema = z
  .array(z.enum(WEDDING_SECTIONS))
  .min(1, 'Select at least one section')
  .nullable()
  .optional();

// [] / omitted = no extra grants. Admins always get every permission — the
// service normalises their permissions to [] (implicit) regardless of input.
const permissionsSchema = z.array(z.enum(MEMBER_PERMISSIONS)).optional();

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: roleSchema,
  sections: sectionsSchema,
  permissions: permissionsSchema,
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
});

export const updateMemberSchema = z
  .object({
    role: roleSchema.optional(),
    sections: sectionsSchema,
    permissions: permissionsSchema,
  })
  .refine(
    (v) => v.role !== undefined || v.sections !== undefined || v.permissions !== undefined,
    { message: 'Nothing to update' },
  );

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
