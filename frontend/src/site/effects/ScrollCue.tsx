import { motion, useReducedMotion } from 'framer-motion';

/**
 * The templates' scroll-down invitation: a letterspaced word over a hairline
 * with a luminous bead sliding down it — quieter and more couture than the
 * classic mouse-outline. Palette-driven; reduced motion renders the static
 * line with no bead.
 */
export default function ScrollCue({
  color,
  label = 'Scroll',
  className = '',
}: {
  color: string;
  label?: string;
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <div
      className={`flex flex-col items-center gap-3 select-none pointer-events-none ${className}`}
      aria-hidden
    >
      <motion.span
        className="uppercase"
        style={{ color, fontSize: 9, letterSpacing: '0.42em', textIndent: '0.42em' }}
        {...(reduced
          ? {}
          : {
              animate: { opacity: [0.55, 1, 0.55] },
              transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
            })}
      >
        {label}
      </motion.span>
      <span
        className="relative block overflow-hidden"
        style={{ width: 1, height: 52, background: `color-mix(in srgb, ${color} 35%, transparent)` }}
      >
        {!reduced && (
          <motion.span
            className="absolute left-1/2 -translate-x-1/2 rounded-full"
            style={{
              width: 3,
              height: 12,
              background: `linear-gradient(180deg, transparent, ${color})`,
              boxShadow: `0 0 8px color-mix(in srgb, ${color} 70%, transparent)`,
            }}
            animate={{ y: [-14, 54] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
          />
        )}
      </span>
    </div>
  );
}
