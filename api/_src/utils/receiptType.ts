import { detectImageType, IMAGE_CONTENT_TYPES, type ImageType } from './imageType';

export type ReceiptType = ImageType | 'pdf';

/**
 * Sniffs the real file format from bytes for receipt/attachment uploads —
 * the allowlisted raster formats plus PDF (via its `%PDF` magic bytes).
 * Anything else (including SVG) is rejected, same rationale as detectImageType.
 */
export function detectReceiptType(buf: Buffer): ReceiptType | null {
  const imageType = detectImageType(buf);
  if (imageType) return imageType;
  if (buf.length >= 4 && buf.toString('ascii', 0, 4) === '%PDF') {
    return 'pdf';
  }
  return null;
}

export const RECEIPT_CONTENT_TYPES: Record<ReceiptType, string> = {
  ...IMAGE_CONTENT_TYPES,
  pdf: 'application/pdf',
};
