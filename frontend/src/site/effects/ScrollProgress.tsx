import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';

/**
 * Thin progress bar on the right edge that fills as the guest scrolls
 * (the guide's "premium touch"), tinted by the active palette.
 */
export default function ScrollProgress({
  color,
  colorSoft,
  right = 0,
}: {
  color: string;
  colorSoft?: string;
  right?: number | string;
}) {
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <motion.div
      className="no-print"
      style={{
        position: 'fixed',
        right,
        top: 0,
        width: 3,
        height: '100vh',
        background: `linear-gradient(180deg, ${color}, ${colorSoft ?? color})`,
        transformOrigin: 'top',
        scaleY,
        zIndex: 70,
      }}
    />
  );
}
