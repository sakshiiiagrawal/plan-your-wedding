import { randomUUID } from 'crypto';
import { supabase } from '../config/database';
import * as contentService from './website-content.service';
import { BadRequestError } from '../shared/errors/HttpError';
import { detectImageType, IMAGE_CONTENT_TYPES } from '../utils/imageType';

const BUCKET = 'wedding-media';

interface GalleryImage {
  url: string;
  alt?: string;
}

interface GalleryContent {
  images?: GalleryImage[];
  subtitle?: string;
}

function storagePathFromUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

export async function uploadGalleryImage(
  ownerId: string,
  file: Express.Multer.File,
): Promise<GalleryImage[]> {
  const imageType = detectImageType(file.buffer);
  if (!imageType) {
    throw new BadRequestError('Only JPG, PNG, WebP, or GIF images are allowed');
  }

  const path = `${ownerId}/${randomUUID()}.${imageType}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    // Random-UUID path → content is immutable; cache a year so the CDN stops
    // missing (default is 1h). Fewer origin fetches = fewer transient blanks.
    .upload(path, file.buffer, {
      contentType: IMAGE_CONTENT_TYPES[imageType],
      cacheControl: '31536000',
    });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const current = ((await contentService.getSectionContent('gallery', ownerId)) ??
    {}) as GalleryContent;
  const images = [...(current.images ?? []), { url: publicUrl }];
  await contentService.upsertSection('gallery', ownerId, { ...current, images });
  return images;
}

const AUDIO_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/aac',
  'audio/x-m4a',
]);

/**
 * Background soundtrack for a public page. Returns the public URL; the page
 * stores it in its config (`music_url`) on publish.
 */
export async function uploadMusic(ownerId: string, file: Express.Multer.File): Promise<string> {
  if (!AUDIO_MIMES.has(file.mimetype)) {
    throw new BadRequestError('Only MP3 / M4A / AAC audio files are allowed');
  }

  // originalname is client-controlled — only accept a plain short extension
  const rawExt = file.originalname.split('.').pop() ?? '';
  const ext = /^[a-z0-9]{1,5}$/i.test(rawExt) ? rawExt.toLowerCase() : 'mp3';
  const path = `${ownerId}/music/${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype, cacheControl: '31536000' });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}

/** Remove an uploaded soundtrack file. Only touches objects inside this
 *  wedding's music folder — external URLs are silently ignored. */
export async function deleteMusic(ownerId: string, url: string): Promise<void> {
  const path = storagePathFromUrl(url);
  if (path && path.startsWith(`${ownerId}/music/`)) {
    await supabase.storage.from(BUCKET).remove([path]);
  }
}

export async function deleteGalleryImage(ownerId: string, url: string): Promise<GalleryImage[]> {
  const current = ((await contentService.getSectionContent('gallery', ownerId)) ??
    {}) as GalleryContent;
  const images = (current.images ?? []).filter((img) => img.url !== url);
  await contentService.upsertSection('gallery', ownerId, { ...current, images });

  // The URL is caller-supplied — only remove objects inside this wedding's folder
  const path = storagePathFromUrl(url);
  if (path && path.startsWith(`${ownerId}/`)) {
    await supabase.storage.from(BUCKET).remove([path]);
  }

  return images;
}
