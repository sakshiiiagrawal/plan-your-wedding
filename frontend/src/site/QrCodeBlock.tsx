import { motion } from 'framer-motion';
import QrCode from './QrCode';
import { getQrDesign } from './qrDesigns';
import { fadeUp, inViewProps, scaleIn, stagger } from './motion';
import type { SiteData } from './types';

/** Frame chrome per design — colors always drawn from the active palette so
 *  every preset stays in step with whatever template/palette is active. */
function frameStyle(frame: 'card' | 'stamp' | 'seal' | 'none', p: SiteData['palette']) {
  switch (frame) {
    case 'card':
      return {
        background: p.surface,
        border: `1px solid ${p.line}`,
        borderRadius: 20,
        padding: '28px 28px 22px',
        boxShadow: '0 20px 44px -24px rgba(0,0,0,0.35)',
      };
    case 'stamp':
      return {
        background: p.surface,
        border: `2px dashed ${p.accent}`,
        borderRadius: 14,
        padding: '24px 24px 20px',
      };
    case 'none':
    default:
      return { background: 'transparent', padding: '4px 0 0' };
  }
}

/** Rendered once, at the foot of every template (invite or website), whenever
 *  the page has a QR code enabled — appended outside each template's own
 *  markup so it doesn't need per-template wiring across the design catalog. */
export default function QrCodeBlock({ data }: { data: SiteData }) {
  if (!data.qrCode?.enabled) return null;
  const p = data.palette;
  const design = getQrDesign(data.qrCode.style);
  const chrome = frameStyle(design.frame, p);
  const qrBg = design.frame === 'none' ? p.bg : p.surface;

  return (
    <section
      className="flex flex-col items-center text-center px-8"
      style={{ padding: '56px 24px 64px', background: p.bg }}
    >
      <motion.div
        variants={stagger}
        {...inViewProps}
        className="flex flex-col items-center"
        style={{ gap: 16 }}
      >
        <motion.div variants={scaleIn} style={{ ...chrome, display: 'inline-flex' }}>
          <QrCode
            value={data.qrCode.url}
            size={152}
            fgColor={p.ink}
            bgColor={qrBg}
            cornerColor={p.accent}
            dotShape={design.dotShape}
          />
        </motion.div>
        <motion.p
          variants={fadeUp}
          className="uppercase"
          style={{ fontSize: 10, letterSpacing: '0.35em', color: p.inkSoft }}
        >
          Scan to open
        </motion.p>
      </motion.div>
    </section>
  );
}
