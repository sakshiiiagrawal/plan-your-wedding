import QRCode from 'qrcode';

/** Boolean module grid for `value` — true = dark module. Synchronous: `qrcode`'s
 *  `create` runs the encoding step without touching canvas/Node APIs. */
export function buildQrMatrix(value: string): boolean[][] {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const { size, data } = modules;
  const matrix: boolean[][] = [];
  for (let row = 0; row < size; row++) {
    const line: boolean[] = [];
    for (let col = 0; col < size; col++) {
      line.push(!!data[row * size + col]);
    }
    matrix.push(line);
  }
  return matrix;
}
