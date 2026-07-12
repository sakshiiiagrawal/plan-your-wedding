/**
 * Shared Framer Motion variants — the animation vocabulary every template
 * speaks (ported from the original weddingplannerdesign invite guide).
 * Use with: <motion.div variants={fadeUp} {...inViewProps}>.
 */
import type { Variants } from 'framer-motion';

export const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export const fadeLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

/** Parent wrapper: children with `fadeUp`/`fadeLeft`/`scaleIn` cascade in. */
export const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

/** Draw a rule/divider in from the left. Pair with transformOrigin: 'left'. */
export const drawLine = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const } },
};

/** Tighter cascade than `stagger` — for dense grids (gallery tiles, plaques). */
export const staggerTight = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

/** Clip-path wipe from the left — a curtain reveal for photos and panels. */
export const revealClip = {
  hidden: { clipPath: 'inset(0 100% 0 0)' },
  visible: {
    clipPath: 'inset(0 0% 0 0)',
    transition: { duration: 1.0, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/** 3D card flip-in. Give the parent `perspective` for real depth. */
export const flipIn = {
  hidden: { opacity: 0, rotateY: 75 },
  visible: {
    opacity: 1,
    rotateY: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export const inViewProps = {
  initial: 'hidden' as const,
  whileInView: 'visible' as const,
  viewport: { once: true, margin: '-80px' },
};

/**
 * Section-entrance intensity behind the shared `scrollAnim` effect control.
 * `full` returns today's exports untouched; `gentle` shrinks offsets and
 * durations; `off` makes both variant states identical, so everything is
 * statically visible. Templates shadow their imports with the preset:
 *   const { fadeUp, stagger, inViewProps } = motionPreset(value);
 */
export function motionPreset(intensity: string): {
  fadeUp: Variants;
  scaleIn: Variants;
  drawLine: Variants;
  stagger: Variants;
  inViewProps: typeof inViewProps;
  /** True when the couple picked "Off" — for entrance animations that live
   *  outside the variants system (SVG path draws, inline initial/animate). */
  still: boolean;
} {
  if (intensity === 'off') {
    const flat = { opacity: 1, y: 0 };
    return {
      fadeUp: { hidden: flat, visible: flat },
      scaleIn: { hidden: { opacity: 1, scale: 1 }, visible: { opacity: 1, scale: 1 } },
      drawLine: { hidden: { scaleX: 1 }, visible: { scaleX: 1 } },
      stagger: { hidden: {}, visible: {} },
      inViewProps,
      still: true,
    };
  }
  if (intensity === 'gentle') {
    return {
      fadeUp: {
        hidden: { opacity: 0, y: 14 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
        },
      },
      scaleIn: {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
      },
      drawLine: {
        hidden: { scaleX: 0 },
        visible: { scaleX: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
      },
      stagger: { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } },
      inViewProps,
      still: false,
    };
  }
  return { fadeUp, scaleIn, drawLine, stagger, inViewProps, still: false };
}
