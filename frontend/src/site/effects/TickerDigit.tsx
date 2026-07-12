import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/**
 * A countdown number that rolls when its value changes — makes the live
 * countdown feel alive instead of a repainting label.
 */
export default function TickerDigit({
  value,
  pad = 2,
  style,
  className,
}: {
  value: number;
  pad?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const text = String(value).padStart(pad, '0');

  if (reduced) {
    return (
      <span className={className} style={style}>
        {text}
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{ ...style, display: 'inline-block', position: 'relative' }}
    >
      {/* Invisible sizer keeps the box stable and anchors the text baseline.
          NOTE: overflow:hidden must NOT live on this outer inline-block — an
          inline-block with non-visible overflow takes its bottom edge as its
          baseline, which shoves the digits up like superscript. The clip is
          done by the absolutely-positioned wrapper below instead. */}
      <span style={{ visibility: 'hidden' }}>{text}</span>
      <span style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <AnimatePresence initial={false}>
          <motion.span
            key={text}
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
