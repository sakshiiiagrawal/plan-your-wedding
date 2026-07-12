import type { PointerEvent } from 'react';
import { useSpring, type MotionValue } from 'framer-motion';

/**
 * Shared cursor-parallax vocabulary for templates: this hook tracks the
 * pointer over a section as normalized springs (-1…1), and any number of
 * `ParallaxLayer`s (MouseParallax.tsx) translate against it at their own
 * depth. Pointer-type guarded (touch never jitters) and inert when the caller
 * passes `disabled` (reduced motion), so layers render static exactly where
 * they'd rest.
 */
export interface MouseParallaxControls {
  x: MotionValue<number>;
  y: MotionValue<number>;
  /** Spread onto the section that should own the tracking. */
  bind: {
    onPointerMove: (e: PointerEvent<HTMLElement>) => void;
    onPointerLeave: () => void;
  };
}

export function useMouseParallax(disabled = false): MouseParallaxControls {
  const x = useSpring(0, { stiffness: 50, damping: 16, mass: 0.6 });
  const y = useSpring(0, { stiffness: 50, damping: 16, mass: 0.6 });

  return {
    x,
    y,
    bind: {
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        if (disabled || e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set(((e.clientX - r.left) / r.width - 0.5) * 2);
        y.set(((e.clientY - r.top) / r.height - 0.5) * 2);
      },
      onPointerLeave: () => {
        x.set(0);
        y.set(0);
      },
    },
  };
}
