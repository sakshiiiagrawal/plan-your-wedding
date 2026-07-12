import type { TargetAndTransition } from 'framer-motion';

/**
 * Photo hover presets behind the shared `galleryHover` effect control.
 * `wrap` spreads onto the motion button/card; `imgClass` goes on the <img>
 * (zoom is CSS so it stays cheap and works on plain markup).
 */
export function hoverPreset(style: string): {
  wrap: { whileHover?: TargetAndTransition };
  imgClass: string;
} {
  switch (style) {
    case 'tilt':
      return { wrap: { whileHover: { rotate: 2, scale: 1.02 } }, imgClass: '' };
    case 'lift':
      return { wrap: { whileHover: { y: -8, scale: 1.01 } }, imgClass: '' };
    case 'none':
      return { wrap: {}, imgClass: '' };
    default: // zoom — the designed default
      return {
        wrap: {},
        imgClass: 'group-hover:scale-105 transition-transform duration-500',
      };
  }
}
