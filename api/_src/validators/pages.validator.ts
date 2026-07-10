import { z } from 'zod';
import { RESERVED_PAGE_SLUGS } from '../../../shared/src';

const RESERVED = new Set<string>(RESERVED_PAGE_SLUGS);

const pageSlugSchema = z
  .string()
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/, 'Use lowercase letters, numbers and hyphens')
  .refine((s) => !RESERVED.has(s), 'This page URL is reserved');

export const createPageSchema = z.object({
  page_slug: pageSlugSchema,
  kind: z.enum(['website', 'invite']),
  title: z.string().min(1).max(120),
  template: z.string().min(1).max(40),
  palette: z.string().min(1).max(40),
   
  config: z.record(z.string(), z.any()).optional(),
  is_published: z.boolean().optional(),
  display_order: z.coerce.number().int().optional(),
});

export const updatePageSchema = z.object({
  page_slug: pageSlugSchema.optional(),
  title: z.string().min(1).max(120).optional(),
  template: z.string().min(1).max(40).optional(),
  palette: z.string().min(1).max(40).optional(),
   
  config: z.record(z.string(), z.any()).optional(),
  is_published: z.boolean().optional(),
  display_order: z.coerce.number().int().optional(),
});
