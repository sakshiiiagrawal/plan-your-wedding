import { randomUUID } from 'crypto';
import { supabase } from '../config/database';
import * as contentService from './website-content.service';
import { BadRequestError } from '../shared/errors/HttpError';

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
  if (!file.mimetype.startsWith('image/')) {
    throw new BadRequestError('Only image files are allowed');
  }

  const ext = file.originalname.split('.').pop() || 'jpg';
  const path = `${ownerId}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype });
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
