import type { CSSProperties, ReactNode } from 'react';
import {
  motion,
  useTransform,
  type MotionStyle,
  type MotionValue,
} from 'framer-motion';

/**
 * A layer that drifts with the cursor tracked by `useMouseParallax`.
 * Positive `depth` moves with the pointer (feels near), negative moves
 * against it (feels far); the magnitude is the max travel in px.
 */
export function ParallaxLayer({
  x,
  y,
  depth = 10,
  children,
  className,
  style,
}: {
  x: MotionValue<number>;
  y: MotionValue<number>;
  depth?: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const tx = useTransform(x, (v) => v * depth);
  const ty = useTransform(y, (v) => v * depth);
  return (
    <motion.div className={className} style={{ ...style, x: tx, y: ty } as MotionStyle}>
      {children}
    </motion.div>
  );
}
