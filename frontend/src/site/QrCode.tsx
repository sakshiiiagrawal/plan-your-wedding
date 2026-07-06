import { useMemo } from 'react';
import { buildQrMatrix } from './qr';

export type QrDotShape = 'square' | 'rounded' | 'dot';

interface QrCodeProps {
  value: string;
  size?: number;
  fgColor: string;
  bgColor: string;
  /** Finder-pattern (the three corner squares) color, defaults to fgColor. */
  cornerColor?: string;
  dotShape?: QrDotShape;
}

// Every QR version's three position-detection patterns are a fixed 7x7 block
// in the corners — coloring them separately is what makes "design" presets
// read as distinct without touching the actual encoded data.
const FINDER_SIZE = 7;

function inFinderZone(row: number, col: number, modules: number): boolean {
  return (
    (row < FINDER_SIZE && col < FINDER_SIZE) ||
    (row < FINDER_SIZE && col >= modules - FINDER_SIZE) ||
    (row >= modules - FINDER_SIZE && col < FINDER_SIZE)
  );
}

/** Renders a scannable QR as inline SVG so color/shape can follow the active
 *  palette — no image asset, no canvas, no async round-trip. */
export default function QrCode({
  value,
  size = 160,
  fgColor,
  bgColor,
  cornerColor,
  dotShape = 'square',
}: QrCodeProps) {
  const matrix = useMemo(() => buildQrMatrix(value), [value]);
  const modules = matrix.length;
  const quiet = 2;
  const total = modules + quiet * 2;
  const cell = size / total;

  const shapes = [];
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (!matrix[row]![col]) continue;
      const x = (col + quiet) * cell;
      const y = (row + quiet) * cell;
      const color = inFinderZone(row, col, modules) ? (cornerColor ?? fgColor) : fgColor;
      const key = `${row}-${col}`;
      if (dotShape === 'dot') {
        shapes.push(
          <circle key={key} cx={x + cell / 2} cy={y + cell / 2} r={cell * 0.42} fill={color} />,
        );
      } else if (dotShape === 'rounded') {
        shapes.push(
          <rect key={key} x={x} y={y} width={cell} height={cell} rx={cell * 0.3} fill={color} />,
        );
      } else {
        shapes.push(<rect key={key} x={x} y={y} width={cell} height={cell} fill={color} />);
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR code">
      <rect x={0} y={0} width={size} height={size} fill={bgColor} />
      {shapes}
    </svg>
  );
}
