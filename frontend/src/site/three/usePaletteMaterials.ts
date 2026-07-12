import { useMemo } from 'react';
import * as THREE from 'three';
import type { Palette } from '../types';

/**
 * The three.js analog of `siteVars`: templates never write
 * `new THREE.Color('#...')` literals — every 3D material/uniform pulls its
 * color from here, so all palettes reskin a scene with zero code changes.
 *
 * Colors are built with `srgbColor` (below) so their components equal the raw
 * hex values. Custom ShaderMaterials bypass three's colorspace pipeline —
 * feeding them working-space (linear) colors would render darker than the CSS
 * tokens around the canvas. Built-in materials (meshBasicMaterial etc.) do the
 * sRGB round-trip themselves, so pass them the hex *string* instead.
 */

/** Raw-sRGB color for custom shader uniforms — components match the hex. */
export function srgbColor(hex: string): THREE.Color {
  return new THREE.Color().setHex(parseInt(hex.slice(1), 16), THREE.LinearSRGBColorSpace);
}

/**
 * The first and last hex stops of the palette's hero gradient (the same
 * parsing trick `heroIsDark` uses) — lets shaders repaint the CSS gradient.
 */
export function heroGradientStops(p: Palette): [string, string] {
  const hexes = p.heroGradient.match(/#[0-9a-fA-F]{6}/g);
  if (!hexes || hexes.length === 0) return [p.primary, p.primary];
  return [hexes[0]!, hexes[hexes.length - 1]!];
}

export interface PaletteMaterials {
  primary: THREE.Color;
  accent: THREE.Color;
  onHero: THREE.Color;
  onHeroSoft: THREE.Color;
  /** heroGradient's first stop (the "top" of the CSS gradient). */
  heroStopA: THREE.Color;
  /** heroGradient's last stop. */
  heroStopB: THREE.Color;
}

export function usePaletteMaterials(p: Palette): PaletteMaterials {
  return useMemo(() => {
    const [stopA, stopB] = heroGradientStops(p);
    return {
      primary: srgbColor(p.primary),
      accent: srgbColor(p.accent),
      onHero: srgbColor(p.onHero),
      onHeroSoft: srgbColor(p.onHeroSoft),
      heroStopA: srgbColor(stopA),
      heroStopB: srgbColor(stopB),
    };
  }, [p]);
}
