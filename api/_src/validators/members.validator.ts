import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer']),
});
