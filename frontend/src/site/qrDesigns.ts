import type { QrDotShape } from './QrCode';

export type QrFrame = 'card' | 'stamp' | 'seal' | 'none';

export interface QrDesign {
  id: string;
  name: string;
  tagline: string;
  dotShape: QrDotShape;
  frame: QrFrame;
}

/** Colors always come from the page's active palette — a design preset only
 *  picks module shape + surrounding frame, so it stays in step with whatever
 *  template/palette the couple picks. */
export const QR_DESIGNS: QrDesign[] = [
  { id: 'classic', name: 'Classic Card', tagline: 'Crisp square modules, bordered card', dotShape: 'square', frame: 'card' },
  { id: 'soft', name: 'Soft Rounded', tagline: 'Rounded modules, gentle card', dotShape: 'rounded', frame: 'card' },
  { id: 'stamp', name: 'Dotted Stamp', tagline: 'Circular modules, dashed stamp edge', dotShape: 'dot', frame: 'stamp' },
  { id: 'minimal', name: 'Minimal', tagline: 'Just the code, no frame', dotShape: 'square', frame: 'none' },
];

export const DEFAULT_QR_DESIGN_ID = QR_DESIGNS[0]!.id;

export function getQrDesign(id: string | undefined | null): QrDesign {
  return QR_DESIGNS.find((d) => d.id === id) ?? QR_DESIGNS[0]!;
}
