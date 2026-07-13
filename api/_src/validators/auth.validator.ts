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

// Registration creates an account only; weddings are created via POST
// /weddings. slug/brideName/groomName/weddingDate remain accepted for one
// release as the legacy one-shot couple signup (account + wedding in one call).
export const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  slug: weddingSlugSchema.optional(),
  inviteToken: z.string().min(1).optional(),
  accountType: z.enum(['couple', 'collaborator']).optional(),
  brideName: z.string().optional(),
  groomName: z.string().optional(),
  weddingDate: z.string().optional(),
});

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

// slug/currency moved to the wedding (PATCH /weddings/:id); unknown keys from
// older clients are stripped by zod, not rejected.
export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  reminder_prefs: z
    .object({
      email_digest: z.boolean(),
      payment_lead_days: z.union([z.literal(1), z.literal(3), z.literal(7)]),
    })
    .optional(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

// ownerId is the pre-weddings-table name for the same id (weddings backfilled
// id = owner user id), accepted for one release so old cached bundles work.
export const setActiveWeddingSchema = z
  .object({
    weddingId: z.string().uuid().optional(),
    ownerId: z.string().uuid().optional(),
  })
  .refine((v) => v.weddingId !== undefined || v.ownerId !== undefined, {
    message: 'weddingId is required',
    path: ['weddingId'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
