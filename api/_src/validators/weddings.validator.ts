import { z } from 'zod';
import { RESERVED_WEDDING_SLUGS } from '../../../shared/src';
import { CURRENCY_CODES } from './auth.validator';

const RESERVED = new Set<string>(RESERVED_WEDDING_SLUGS);

export const weddingSlugSchema = z
  .string()
  .min(3)
  .max(50)
  .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
  .refine((s) => !RESERVED.has(s), 'This URL is reserved');

export const createWeddingSchema = z.object({
  slug: weddingSlugSchema,
  title: z.string().min(1).max(120).optional(),
  brideName: z.string().optional(),
  groomName: z.string().optional(),
  weddingDate: z.string().optional(),
  currency: z.enum(CURRENCY_CODES).optional(),
});

export const updateWeddingSchema = z.object({
  slug: weddingSlugSchema.optional(),
  title: z.string().min(1).max(120).optional(),
  currency: z.enum(CURRENCY_CODES).optional(),
});

export type CreateWeddingInput = z.infer<typeof createWeddingSchema>;
export type UpdateWeddingInput = z.infer<typeof updateWeddingSchema>;
