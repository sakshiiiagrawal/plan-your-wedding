import { z } from 'zod';

export const deleteGalleryImageSchema = z.object({
  url: z.string().url(),
});
