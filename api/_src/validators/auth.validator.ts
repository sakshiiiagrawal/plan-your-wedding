import { z } from 'zod';
import { RESERVED_WEDDING_SLUGS } from '../../../shared/src';

const RESERVED = new Set<string>(RESERVED_WEDDING_SLUGS);

const weddingSlugSchema = z
  .string()
  .min(3)
  .max(50)
  .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
  .refine((s) => !RESERVED.has(s), 'This URL is reserved');

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    // Optional when joining an existing wedding via invite — those accounts
    // don't create a wedding site of their own until they claim a slug later.
    slug: weddingSlugSchema.optional(),
    inviteToken: z.string().min(1).optional(),
    // 'collaborator' = planner / family / friend joining other people's
    // weddings — no wedding site of their own, invites arrive by email.
    accountType: z.enum(['couple', 'collaborator']).optional(),
    brideName: z.string().optional(),
    groomName: z.string().optional(),
    weddingDate: z.string().optional(),
  })
  .refine(
    (v) =>
      v.slug !== undefined || v.inviteToken !== undefined || v.accountType === 'collaborator',
    {
      message: 'A wedding URL is required',
      path: ['slug'],
    },
  );

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const CURRENCY_CODES = ['INR', 'USD', 'EUR', 'GBP', 'AED'] as const;

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  slug: weddingSlugSchema.optional(),
  currency: z.enum(CURRENCY_CODES).optional(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const setActiveWeddingSchema = z.object({
  ownerId: z.string().uuid(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
