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
      style={{ ...style, display: 'inline-block', position: 'relative', overflow: 'hidden' }}
    >
      {/* Invisible sizer keeps the box stable while digits animate */}
      <span style={{ visibility: 'hidden' }}>{text}</span>
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
  );
}
