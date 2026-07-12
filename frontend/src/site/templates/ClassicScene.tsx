import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import type { MotionValue } from 'framer-motion';
import type { Palette } from '../types';
import SceneCanvas, { SceneErrorBoundary } from '../three/SceneCanvas';
import GoldMotes from '../three/GoldMotes';
import { usePaletteMaterials } from '../three/usePaletteMaterials';
import { RIPPLE_PHOTO_VERTEX, RIPPLE_PHOTO_FRAGMENT } from '../three/ripplePhoto.glsl';

/**
 * Classic's "Hall of Mirrors" hero: a vaulted arch of gold-trimmed mirror
 * panels blooms open behind the names, gold motes drift through the volume,
 * and (when the couple has a photo) the full-bleed hero photo becomes a
 * gently rippling plane with the palette scrim baked in. Loaded lazily from
 * Classic.tsx so the three.js chunk never blocks first paint, and only when
 * motion is allowed — the reduced-motion/print path never downloads it.
 */

const PANEL_COUNT = 7;

const MIRROR_VERTEX = /* glsl */ `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// A "mirror" without reflection passes: the palette's hero gradient, lifted
// toward glass, with a slow diagonal sheen sweeping across each panel.
// (drei's MeshReflectorMaterial re-renders the scene once per panel per frame
// — seven extra passes would sink mid-range phones, so we fake it.)
const MIRROR_FRAGMENT = /* glsl */ `
  uniform vec3 uStopA;
  uniform vec3 uStopB;
  uniform vec3 uSheen;
  uniform float uTime;
  uniform float uHeight;
  uniform float uSeed;
  uniform float uOpacity;
  varying vec2 vLocal;

  void main() {
    float ty = clamp(vLocal.y / uHeight + 0.5, 0.0, 1.0);
    vec3 base = mix(uStopB, uStopA, ty) * 1.22;
    float sweep = sin(uTime * 0.4 + uSeed * 6.2832) * 1.3;
    float band = exp(-pow((vLocal.x + vLocal.y * 0.45 - sweep) * 2.4, 2.0));
    vec3 col = base + uSheen * band * 0.45 + uSheen * 0.10 * (1.0 - ty);
    gl_FragColor = vec4(col, uOpacity);
  }
`;

/** Classic arched-mirror silhouette: a rectangle capped by a semicircle. */
function mirrorShape(w: number, h: number): THREE.Shape {
  const r = w / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, -h / 2);
  s.lineTo(r, -h / 2);
  s.lineTo(r, h / 2 - r);
  s.absarc(0, h / 2 - r, r, 0, Math.PI, false);
  s.lineTo(-r, -h / 2);
  return s;
}

interface PanelConfig {
  position: [number, number, number];
  leanZ: number;
  /** -1 left wing … +1 right wing; drives the door-opening direction. */
  dir: number;
  /** Center-out bloom delay (seconds). */
  delay: number;
  width: number;
  height: number;
  seed: number;
}

function buildPanels(): PanelConfig[] {
  const panels: PanelConfig[] = [];
  const radius = 3.6;
  for (let i = 0; i < PANEL_COUNT; i++) {
    const theta = THREE.MathUtils.degToRad(170 - (i * 160) / (PANEL_COUNT - 1));
    const width = 1.02;
    const height = 2.05 + 0.55 * Math.sin(theta);
    panels.push({
      // Behind and around the names — the arch frames the type, never backs it.
      position: [Math.cos(theta) * radius, Math.sin(theta) * radius * 0.92 - 0.9, -2.3],
      leanZ: (theta - Math.PI / 2) * 0.5,
      dir: (i - (PANEL_COUNT - 1) / 2) / ((PANEL_COUNT - 1) / 2),
      delay: 0.14 * Math.abs(i - (PANEL_COUNT - 1) / 2),
      width,
      height,
      seed: i / PANEL_COUNT,
    });
  }
  return panels;
}

const easeOut = (t: number) => 1 - Math.pow(1 - THREE.MathUtils.clamp(t, 0, 1), 3);

function MirrorArch({ palette, progress }: { palette: Palette; progress: MotionValue<number> }) {
  const colors = usePaletteMaterials(palette);
  const { viewport } = useThree();
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const mirrorMats = useRef<(THREE.ShaderMaterial | null)[]>([]);
  const frameMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const startTime = useRef<number | null>(null);

  const panels = useMemo(buildPanels, []);
  const geometries = useMemo(
    () =>
      panels.map((panel) => ({
        mirror: new THREE.ShapeGeometry(mirrorShape(panel.width, panel.height), 24),
        frame: new THREE.ShapeGeometry(mirrorShape(panel.width * 1.09, panel.height * 1.045), 24),
      })),
    [panels],
  );
  const uniformSets = useMemo(
    () =>
      panels.map((panel) => ({
        uStopA: { value: colors.heroStopA.clone() },
        uStopB: { value: colors.heroStopB.clone() },
        uSheen: { value: colors.onHeroSoft.clone() },
        uTime: { value: 0 },
        uHeight: { value: panel.height },
        uSeed: { value: panel.seed },
        uOpacity: { value: 0 },
      })),
    // Uniform holders are created once; values sync every frame below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [panels],
  );

  // Narrow screens (phones, the Studio's mobile preview frame) crop the arch
  // at the edges like a proscenium instead of shrinking it — scaling it down
  // lands the panels in the text column and reads as clutter.
  const fit = THREE.MathUtils.clamp(viewport.width / 10.2, 0.92, 1.1);
  // And on top of the crop, lift the whole arch on narrow screens so the
  // panel bottoms clear the names instead of hanging behind them.
  const lift = THREE.MathUtils.clamp((10.2 - viewport.width) * 0.28, 0, 2);

  useFrame((state) => {
    if (startTime.current === null) startTime.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - startTime.current;
    const scroll = THREE.MathUtils.clamp(progress.get(), 0, 1);

    panels.forEach((panel, i) => {
      const group = groupRefs.current[i];
      const mirror = mirrorMats.current[i];
      const frame = frameMats.current[i];
      if (!group || !mirror || !frame) return;

      // Ceremonial bloom on load, center-out; then the scroll parts the doors.
      const open = easeOut((t - 0.35 - panel.delay) / 1.3);
      const sway = Math.sin(state.clock.elapsedTime * 0.25 + i * 1.7) * 0.015;

      group.position.set(
        panel.position[0] * (1 + scroll * 0.55),
        panel.position[1] * (1 + scroll * 0.3) + scroll * 0.9,
        panel.position[2] - scroll * 1.2,
      );
      group.rotation.set(
        0,
        (1 - open) * 1.25 * (panel.dir || 0.35) + scroll * 1.0 * panel.dir,
        panel.leanZ + sway,
      );
      const scale = 0.65 + 0.35 * open;
      group.scale.set(scale, scale, scale);

      mirror.uniforms.uTime!.value = state.clock.elapsedTime;
      mirror.uniforms.uOpacity!.value = open;
      (mirror.uniforms.uStopA!.value as THREE.Color).copy(colors.heroStopA);
      (mirror.uniforms.uStopB!.value as THREE.Color).copy(colors.heroStopB);
      (mirror.uniforms.uSheen!.value as THREE.Color).copy(colors.onHeroSoft);
      frame.opacity = open;
    });
  });

  return (
    <group scale={[fit, fit, 1]} position={[0, lift, 0]}>
      {panels.map((panel, i) => (
        <group
          key={i}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
        >
          {/* Gold trim: a slightly larger arch shape sitting just behind. */}
          <mesh geometry={geometries[i]!.frame} position={[0, 0, -0.02]}>
            <meshBasicMaterial
              ref={(el) => {
                frameMats.current[i] = el;
              }}
              color={palette.accent}
              transparent
              opacity={0}
            />
          </mesh>
          <mesh geometry={geometries[i]!.mirror}>
            <shaderMaterial
              ref={(el) => {
                mirrorMats.current[i] = el;
              }}
              vertexShader={MIRROR_VERTEX}
              fragmentShader={MIRROR_FRAGMENT}
              uniforms={uniformSets[i]!}
              transparent
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * The couple's photo as a full-bleed, slowly rippling plane. The palette scrim
 * is baked into the shader, so this is pixel-equivalent to the DOM
 * img+overlay it covers — the DOM version stays underneath as the loading
 * state and the reduced-motion/WebGL-failure fallback.
 */
function RipplePhoto({ url, palette }: { url: string; palette: Palette }) {
  const colors = usePaletteMaterials(palette);
  const texture = useLoader(THREE.TextureLoader, url);
  const material = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();

  // Oversize past the viewport so ripple displacement never shows an edge.
  const w = viewport.width * 1.08;
  const h = viewport.height * 1.08;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.05 },
      uMap: { value: texture },
      uStopA: { value: colors.heroStopA.clone() },
      uStopB: { value: colors.heroStopB.clone() },
      uScrim: { value: 0.82 },
      uUvScale: { value: new THREE.Vector2(1, 1) },
      uUvOffset: { value: new THREE.Vector2(0, 0) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [texture],
  );

  useFrame((state) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uTime!.value = state.clock.elapsedTime;
    (m.uniforms.uStopA!.value as THREE.Color).copy(colors.heroStopA);
    (m.uniforms.uStopB!.value as THREE.Color).copy(colors.heroStopB);

    // object-fit: cover with the DOM hero's `center 20%` vertical bias.
    const img = texture.image as { width?: number; height?: number } | undefined;
    if (img?.width && img.height) {
      const planeAspect = w / h;
      const imgAspect = img.width / img.height;
      let sx = 1;
      let sy = 1;
      if (imgAspect > planeAspect) sx = planeAspect / imgAspect;
      else sy = imgAspect / planeAspect;
      (m.uniforms.uUvScale!.value as THREE.Vector2).set(sx, sy);
      (m.uniforms.uUvOffset!.value as THREE.Vector2).set((1 - sx) / 2, (1 - sy) * 0.8);
    }
  });

  return (
    <mesh position={[0, 0, -3]} scale={[1.45, 1.45, 1]}>
      <planeGeometry args={[w, h, 48, 48]} />
      <shaderMaterial
        ref={material}
        vertexShader={RIPPLE_PHOTO_VERTEX}
        fragmentShader={RIPPLE_PHOTO_FRAGMENT}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export default function ClassicHeroScene({
  palette,
  photoUrl,
  progress,
  className,
}: {
  palette: Palette;
  photoUrl: string | null;
  progress: MotionValue<number>;
  className?: string | undefined;
}) {
  return (
    <SceneCanvas className={className}>
      {photoUrl && (
        // Its own boundary: a CORS-blocked photo must not take the arch down.
        <SceneErrorBoundary>
          <Suspense fallback={null}>
            <RipplePhoto url={photoUrl} palette={palette} />
          </Suspense>
        </SceneErrorBoundary>
      )}
      <MirrorArch palette={palette} progress={progress} />
      <GoldMotes palette={palette} count={380} area={[13, 8, 5]} size={34} opacity={0.9} />
    </SceneCanvas>
  );
}

/** Low-density mote veil behind the RSVP form — pauses while the form has focus. */
export function GoldVeil({
  palette,
  className,
  paused,
}: {
  palette: Palette;
  className?: string | undefined;
  paused?: boolean | undefined;
}) {
  return (
    <SceneCanvas className={className} paused={paused}>
      <GoldMotes palette={palette} count={110} area={[15, 8, 4]} size={28} speed={0.6} opacity={0.5} />
    </SceneCanvas>
  );
}
