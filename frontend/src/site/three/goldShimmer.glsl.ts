/**
 * Shader pair for the drifting "gold mote" particle field (GoldMotes.tsx).
 * Palette-safe by construction: the two colors arrive as uniforms sourced from
 * `usePaletteMaterials` (accent / onHeroSoft), never baked into the GLSL.
 *
 * Motion model: each point rises slowly (wrapping inside `uArea.y`), sways on
 * x/z with a per-particle phase from `aSeed`, and twinkles. Alpha fades near
 * the wrap boundary so respawning particles never pop.
 */

export const GOLD_MOTES_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec3 uArea;
  attribute float aSeed;
  varying float vGlow;

  void main() {
    vec3 pos = position;
    float rise = uTime * uSpeed * (0.10 + aSeed * 0.28);
    pos.y = mod(pos.y + rise + uArea.y * 0.5, uArea.y) - uArea.y * 0.5;
    pos.x += sin(uTime * (0.22 + aSeed * 0.5) + aSeed * 43.7) * 0.35;
    pos.z += cos(uTime * (0.18 + aSeed * 0.4) + aSeed * 61.3) * 0.25;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float twinkle = 0.55 + 0.45 * sin(uTime * (1.2 + aSeed * 2.8) + aSeed * 21.0);
    // Fade out near the vertical wrap edges so recycled motes don't pop in.
    float edge = smoothstep(0.5, 0.4, abs(pos.y / uArea.y));
    vGlow = twinkle * edge;

    gl_PointSize = uSize * uPixelRatio * (0.35 + aSeed * 0.65) * (0.6 + 0.4 * twinkle)
      / max(0.001, -mv.z);
  }
`;

export const GOLD_MOTES_FRAGMENT = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  varying float vGlow;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    // A hard bright core inside a faint halo reads as glinting dust; one wide
    // soft falloff reads as blurry petals — which is exactly the complaint
    // this shape fixes.
    float core = smoothstep(0.16, 0.0, d);
    float halo = smoothstep(0.5, 0.1, d) * 0.3;
    float alpha = (core + halo) * vGlow * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(mix(uColorA, uColorB, vGlow), alpha);
  }
`;
