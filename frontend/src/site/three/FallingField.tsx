import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { Palette } from '../types';

/**
 * The shared falling-particle field: an instanced mesh per kind (petal /
 * leaf / blossom), volumetric sway and depth cueing, with an optional
 * analytic circular obstacle — particles that would sink into it instead
 * slide down its outside and drop off the sides in one continuous glide.
 * Particles stay pure functions of time (no per-frame state), so the field
 * costs the same whether or not anything collides.
 */

export type FallingKind = 'petal' | 'leaf' | 'blossom';

export interface FallingObstacle {
  /** Circle centre in the field's local space. */
  center: [number, number];
  radius: number;
  /** Particles with |z| beyond this pass in front/behind untouched. */
  zBand: number;
  /** Live radius multiplier (e.g. the arch's scroll swell). */
  getScale?: () => number;
}

/** The CSS `border-radius: 50% 0 50% 50%` petal as a ShapeGeometry. */
function petalGeometry(): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  // Counter-clockwise 270° sweep — clockwise would take the short 90° path
  // and produce a sharp shard instead.
  s.absarc(0, 0, 0.5, Math.PI / 2, Math.PI * 2, false);
  s.lineTo(0.5, 0.5);
  s.lineTo(0, 0.5);
  return new THREE.ShapeGeometry(s, 12);
}

/** A pointed leaf: two mirrored quadratic curves tip-to-tip. */
function leafGeometry(): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0.5);
  s.quadraticCurveTo(0.42, 0.05, 0, -0.5);
  s.quadraticCurveTo(-0.42, 0.05, 0, 0.5);
  return new THREE.ShapeGeometry(s, 10);
}

/** A five-lobed blossom: petal ellipses ringed around the centre. */
function blossomGeometry(): THREE.ShapeGeometry {
  const lobes = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2;
    const s = new THREE.Shape();
    s.absellipse(Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0.2, 0.3, 0, Math.PI * 2, false, a + Math.PI / 2);
    return s;
  });
  return new THREE.ShapeGeometry(lobes, 8);
}

const KIND_SPEC: Record<
  FallingKind,
  {
    geometry: () => THREE.ShapeGeometry;
    /** Tint endpoints as palette keys — lerped per instance. */
    tint: [keyof Palette, keyof Palette];
    opacity: number;
    aspect: number;
  }
> = {
  petal: { geometry: petalGeometry, tint: ['accent', 'onHeroSoft'], opacity: 0.6, aspect: 1.35 },
  leaf: { geometry: leafGeometry, tint: ['accent', 'primary'], opacity: 0.7, aspect: 1.25 },
  blossom: { geometry: blossomGeometry, tint: ['onHeroSoft', 'accent'], opacity: 0.55, aspect: 1 },
};

const DENSITY_COUNT: Record<string, number> = { sparse: 36, normal: 70, lush: 110 };

const FIELD_W = 13;
const FIELD_H = 9.5;
const dummy = new THREE.Object3D();

/** Tiny seeded PRNG (mulberry32) — deterministic particles keep render-phase
 *  purity (and the field identical across re-renders). */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ParticleState {
  x0: number;
  y0: number;
  z: number;
  fall: number;
  swayAmp: number;
  swayFreq: number;
  spin: number;
  phase: number;
  scale: number;
}

function KindField({
  kind,
  count,
  palette,
  obstacle,
}: {
  kind: FallingKind;
  count: number;
  palette: Palette;
  obstacle?: FallingObstacle | undefined;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const spec = KIND_SPEC[kind];

  const { geometry, material, particles } = useMemo(() => {
    const rand = mulberry32(kind.length * 7919 + count);
    const particles: ParticleState[] = Array.from({ length: count }, () => ({
      x0: (rand() - 0.5) * FIELD_W,
      y0: rand() * FIELD_H,
      z: -3 + rand() * 4.2,
      fall: 0.22 + rand() * 0.32,
      swayAmp: 0.25 + rand() * 0.45,
      swayFreq: 0.35 + rand() * 0.55,
      spin: 0.35 + rand() * 0.8,
      phase: rand() * Math.PI * 2,
      scale: 0.07 + rand() * 0.09,
    }));
    return {
      geometry: spec.geometry(),
      material: new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: spec.opacity,
        side: THREE.DoubleSide,
      }),
      particles,
    };
  }, [count, spec, kind]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  // Per-instance tint between two palette tones — "catching light" on every palette.
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const a = new THREE.Color(palette[spec.tint[0]] as string);
    const b = new THREE.Color(palette[spec.tint[1]] as string);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      m.setColorAt(i, c.copy(a).lerp(b, Math.random() * 0.65));
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    // eslint-disable-next-line react-hooks/immutability -- three.js: recompile the program once instanceColor exists
    material.needsUpdate = true;
  }, [palette, material, count, spec]);

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    const R = obstacle ? obstacle.radius * (obstacle.getScale?.() ?? 1) : 0;
    particles.forEach((p, i) => {
      let y = FIELD_H / 2 - ((p.y0 + t * p.fall) % FIELD_H);
      let x = p.x0 + Math.sin(t * p.swayFreq + p.phase) * p.swayAmp;
      let sliding = false;

      // Analytic obstacle: when free fall would sink below the dome's upper
      // half, the excess fall distance is re-mapped 1:1 into arc length down
      // the outside of the circle, so the motion is one continuous glide —
      // no state, no pops. Past ~horizontal it exits and resumes free fall.
      if (obstacle && Math.abs(p.z) < obstacle.zBand) {
        const [cx, cy] = obstacle.center;
        const dx = x - cx;
        if (Math.abs(dx) < R * 0.98) {
          const contactY = cy + Math.sqrt(R * R - dx * dx);
          if (y < contactY) {
            const excess = contactY - y;
            const theta0 = Math.acos(dx / R); // contact angle on the upper half
            const dir = dx >= 0 ? -1 : 1; // slide toward the nearer side
            const thetaExit = dx >= 0 ? 0.1 : Math.PI - 0.1; // just past horizontal
            const arcAvail = Math.abs(theta0 - thetaExit) * R;
            if (excess < arcAvail) {
              const theta = theta0 + dir * (excess / R);
              x = cx + Math.cos(theta) * R;
              y = cy + Math.sin(theta) * R + 0.02; // hug just above the surface
              sliding = true;
            } else {
              // Exited tangentially at the side — vertical fall from there.
              x = cx + Math.cos(thetaExit) * R;
              y = cy + Math.sin(thetaExit) * R - (excess - arcAvail);
            }
          }
        }
      }

      dummy.position.set(x, y, p.z);
      // Mostly face-on with a soft flutter — edge-on particles read as debris.
      // While sliding the flutter damps so the particle hugs the curve.
      const flutter = sliding ? 0.3 : 1;
      dummy.rotation.set(
        Math.sin(t * p.spin * 0.6 + p.phase) * 0.45 * flutter,
        Math.sin(t * p.spin * 0.4 + p.phase * 2) * 0.4 * flutter,
        p.phase + t * p.spin * 0.3,
      );
      // Depth cue: particles nearer the camera render larger.
      const s = p.scale * (1 + (p.z + 3) / 6);
      dummy.scale.set(s, s * spec.aspect, s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />;
}

export default function FallingField({
  kinds,
  density = 'normal',
  palette,
  obstacle,
}: {
  kinds: FallingKind[];
  density?: string;
  palette: Palette;
  obstacle?: FallingObstacle | undefined;
}) {
  if (kinds.length === 0) return null;
  const total = DENSITY_COUNT[density] ?? DENSITY_COUNT.normal!;
  const per = Math.max(1, Math.round(total / kinds.length));
  return (
    <>
      {kinds.map((kind) => (
        <KindField key={kind} kind={kind} count={per} palette={palette} obstacle={obstacle} />
      ))}
    </>
  );
}
