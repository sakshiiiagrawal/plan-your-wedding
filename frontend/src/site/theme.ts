import type { CSSProperties } from 'react';
import type { Palette } from './types';

/**
 * Every template exposes its active palette as `--site-*` custom properties at
 * its root, so shared blocks (RsvpForm, effects, Lightbox) inherit the theme.
 * Centralized here so all ten templates stay in lockstep as the token set grows
 * — previously each template inlined its own (drifting) copy of this block.
 */
export function siteVars(p: Palette): CSSProperties {
  return {
    '--site-bg': p.bg,
    '--site-surface': p.surface,
    '--site-ink': p.ink,
    '--site-ink-soft': p.inkSoft,
    '--site-line': p.line,
    '--site-primary': p.primary,
    '--site-accent': p.accent,
    '--site-on-accent': p.onAccent,
    '--site-on-hero': p.onHero,
    '--site-on-hero-soft': p.onHeroSoft,
  } as CSSProperties;
}

/**
 * A shimmer ramp guaranteed to read on the palette's OWN hero gradient. It
 * sweeps between the two on-hero tokens — both of which the palette contract
 * guarantees contrast with `heroGradient` — so hero names never wash out when
 * the couple switches to a palette the template wasn't "designed" for. This is
 * the fix for the whole "hero text disappears when the color changes" bug
 * family: templates must never feed `ShimmerText` a `primary`/hardcoded ramp
 * over the gradient, only this.
 */
export function heroShimmer(p: Palette): [string, string, string] {
  return [p.onHeroSoft, p.onHero, p.onHeroSoft];
}

/**
 * Gold sheen for names set over a photo — safe because every photo hero lays a
 * dark scrim under the text, so a warm-gold ramp always contrasts.
 */
export const PHOTO_SHIMMER: [string, string, string] = ['#8B6210', '#c9942a', '#ffe8a0'];

/**
 * True when the palette's hero gradient is dark enough that white text reads on
 * it directly (used by photo-less heroes that want a luminous, high-contrast
 * treatment). Derived from the gradient's darkest declared stop.
 */
export function heroIsDark(p: Palette): boolean {
  const hexes = p.heroGradient.match(/#[0-9a-fA-F]{6}/g);
  if (!hexes || hexes.length === 0) return p.tone === 'dark';
  // Average luminance of the gradient stops; < 0.5 → treat as dark.
  const lum = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const avg = hexes.reduce((s, h) => s + lum(h), 0) / hexes.length;
  return avg < 0.5;
}
