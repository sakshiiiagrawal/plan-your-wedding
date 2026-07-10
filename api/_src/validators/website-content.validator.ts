import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// The four seeded sections are the only ones the app reads or renders.
// Without this whitelist, PUT /website-content/:section happily stored junk
// rows under arbitrary section names and served them back (authed + public).
const SECTION_SCHEMAS: Record<string, z.ZodType> = {
  // Known fields get type/length checks; extra keys stay allowed because the
  // hero blob also carries the home page's template/palette/section layout
  // (see Website.tsx publish) and shapes evolve with the Studio.
  hero: z.looseObject({
    bride_name: z.string().max(200).optional(),
    groom_name: z.string().max(200).optional(),
    wedding_date: z.string().max(40).nullable().optional(),
    tagline: z.string().max(500).optional(),
  }),
  couple: z.looseObject({}),
  our_story: z.looseObject({
    story: z.string().max(50000).optional(),
  }),
  gallery: z.looseObject({
    images: z
      .array(z.looseObject({ url: z.string().max(2048) }))
      .max(200)
      .optional(),
  }),
};

/** Route middleware for PUT /website-content/:section — rejects unknown
 *  section names and validates the body against that section's schema. */
export function validateSectionUpdate(
  req: Request<{ section: string }>,
  res: Response,
  next: NextFunction,
): void {
  const schema = SECTION_SCHEMAS[req.params.section];
  if (!schema) {
    res.status(400).json({ error: 'Validation Error', message: 'Unknown website section' });
    return;
  }

  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation Error',
      details: result.error.flatten().fieldErrors,
    });
    return;
  }
  req.body = result.data;
  next();
}
