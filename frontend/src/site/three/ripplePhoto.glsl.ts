/**
 * Shader pair for a full-bleed hero photo on a gently rippling plane, with the
 * palette's hero-gradient scrim baked into the fragment — so the composite is
 * pixel-equivalent to today's DOM `<img>` + gradient-overlay hero (the text
 * contrast guarantee that layering depends on), plus a slow water-like sway.
 *
 * `uUvScale`/`uUvOffset` implement object-fit: cover with the same
 * `center 20%` bias the DOM hero uses; computed CPU-side from image vs plane
 * aspect (see coverUv in ClassicScene).
 */

export const RIPPLE_PHOTO_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.z += sin(uv.x * 6.0 + uTime * 0.7) * uAmp
           + cos(uv.y * 4.0 + uTime * 0.55) * uAmp;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

export const RIPPLE_PHOTO_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uStopA;
  uniform vec3 uStopB;
  uniform float uScrim;
  uniform vec2 uUvScale;
  uniform vec2 uUvOffset;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv * uUvScale + uUvOffset;
    vec3 tex = texture2D(uMap, uv).rgb;
    // CSS gradient stop A is the top of the hero; uv.y = 1.0 is the top here.
    vec3 grad = mix(uStopB, uStopA, vUv.y);
    gl_FragColor = vec4(mix(tex, grad, uScrim), 1.0);
  }
`;
