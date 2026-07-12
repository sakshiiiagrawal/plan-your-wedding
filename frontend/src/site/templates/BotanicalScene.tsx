import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { MotionValue } from 'framer-motion';
import type { Palette } from '../types';
import SceneCanvas from '../three/SceneCanvas';

/**
 * Botanical's "Canopy of Petals": the flat hero arch outline grows into a
 * real 3D garden arch — an accent-toned bough with instanced leaves climbing
 * it, swaying as if in a breeze — while a volumetric field of petals falls
 * through the scene with organic sway and true depth cueing (near petals
 * large, far petals small). The DOM names rise through the arch on scroll.
 */

/** The CSS `border-radius: 50% 0 50% 50%` petal as a ShapeGeometry: a
 *  three-quarter circle plus its one square corner. */
function petalGeometry(): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  // Counter-clockwise 270° sweep (top → left → bottom → right); clockwise
  // here would take the short 90° path and produce a sharp shard instead.
  s.absarc(0, 0, 0.5, Math.PI / 2, Math.PI * 2, false);
  s.lineTo(0.5, 0.5);
  s.lineTo(0, 0.5);
  return new THREE.ShapeGeometry(s, 12);
}

const dummy = new THREE.Object3D();

interface PetalState {
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

const PETAL_COUNT = 70;
const FIELD_W = 13;
const FIELD_H = 9.5;

function PetalField({ palette }: { palette: Palette }) {
  const mesh = useRef<THREE.InstancedMesh>(null);

  const { geometry, material, petals } = useMemo(() => {
    const petals: PetalState[] = Array.from({ length: PETAL_COUNT }, () => ({
      x0: (Math.random() - 0.5) * FIELD_W,
      y0: Math.random() * FIELD_H,
      z: -3 + Math.random() * 4.2,
      fall: 0.22 + Math.random() * 0.32,
      swayAmp: 0.25 + Math.random() * 0.45,
      swayFreq: 0.35 + Math.random() * 0.55,
      spin: 0.35 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      scale: 0.07 + Math.random() * 0.09,
    }));
    return {
      geometry: petalGeometry(),
      material: new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      }),
      petals,
    };
  }, []);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  // Per-petal tint between accent and the softer on-hero tone — reads as
  // "petals catching light" on every palette.
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const a = new THREE.Color(palette.accent);
    const b = new THREE.Color(palette.onHeroSoft);
    const c = new THREE.Color();
    for (let i = 0; i < PETAL_COUNT; i++) {
      m.setColorAt(i, c.copy(a).lerp(b, Math.random() * 0.65));
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    material.needsUpdate = true;
  }, [palette, material]);

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    petals.forEach((petal, i) => {
      const y = FIELD_H / 2 - ((petal.y0 + t * petal.fall) % FIELD_H);
      const x = petal.x0 + Math.sin(t * petal.swayFreq + petal.phase) * petal.swayAmp;
      dummy.position.set(x, y, petal.z);
      // Mostly face-on with a soft flutter — edge-on petals read as debris.
      dummy.rotation.set(
        Math.sin(t * petal.spin * 0.6 + petal.phase) * 0.45,
        Math.sin(t * petal.spin * 0.4 + petal.phase * 2) * 0.4,
        petal.phase + t * petal.spin * 0.3,
      );
      // Depth cue: petals nearer the camera render larger.
      const s = petal.scale * (1 + (petal.z + 3) / 6);
      dummy.scale.set(s, s * 1.35, s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, PETAL_COUNT]} frustumCulled={false} />;
}

const LEAF_COUNT = 44;
const ARCH_RADIUS = 2.65;

function GardenArch({ palette, progress }: { palette: Palette; progress: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null);
  const leaves = useRef<THREE.InstancedMesh>(null);

  const { leafGeometry, leafMaterial } = useMemo(
    () => ({
      leafGeometry: petalGeometry(),
      leafMaterial: new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      }),
    }),
    [],
  );

  useEffect(() => () => {
    leafGeometry.dispose();
    leafMaterial.dispose();
  }, [leafGeometry, leafMaterial]);

  // Leaves climb the bough (static matrices) — dense at the crown, sparser
  // down the two stems.
  useEffect(() => {
    const m = leaves.current;
    if (!m) return;
    const a = new THREE.Color(palette.accent);
    const b = new THREE.Color(palette.primary);
    const c = new THREE.Color();
    for (let i = 0; i < LEAF_COUNT; i++) {
      if (i < 32) {
        const angle = (i / 31) * Math.PI;
        const wobble = (Math.random() - 0.5) * 0.16;
        dummy.position.set(
          Math.cos(angle) * (ARCH_RADIUS + wobble),
          Math.sin(angle) * (ARCH_RADIUS + wobble) - 0.35,
          (Math.random() - 0.5) * 0.2,
        );
        dummy.rotation.set(0, 0, angle + (Math.random() - 0.5) * 1.4);
      } else {
        const side = i % 2 === 0 ? 1 : -1;
        const down = ((i - 32) / 12) * 1.7;
        dummy.position.set(
          side * (ARCH_RADIUS + (Math.random() - 0.5) * 0.14),
          -0.35 - down,
          (Math.random() - 0.5) * 0.2,
        );
        dummy.rotation.set(0, 0, Math.random() * Math.PI * 2);
      }
      const s = 0.12 + Math.random() * 0.12;
      dummy.scale.set(s, s * 1.35, s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, c.copy(a).lerp(b, Math.random() * 0.7));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    leafMaterial.needsUpdate = true;
  }, [palette, leafMaterial]);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const scroll = THREE.MathUtils.clamp(progress.get(), 0, 1);
    // A breeze, not a metronome: two slow sines layered.
    g.rotation.z = Math.sin(t * 0.32) * 0.018 + Math.sin(t * 0.13 + 1.7) * 0.01;
    g.position.y = Math.sin(t * 0.5) * 0.04;
    // The arch swells slightly as the names rise through it on scroll.
    const s = 1 + scroll * 0.22;
    g.scale.set(s, s, 1);
  });

  return (
    <group ref={group}>
      {/* The bough: a half-torus crown with two stems reaching the ground. */}
      <mesh position={[0, -0.35, 0]}>
        <torusGeometry args={[ARCH_RADIUS, 0.045, 10, 64, Math.PI]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.9} />
      </mesh>
      <mesh position={[-ARCH_RADIUS, -1.25, 0]}>
        <cylinderGeometry args={[0.045, 0.055, 1.8, 10]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.9} />
      </mesh>
      <mesh position={[ARCH_RADIUS, -1.25, 0]}>
        <cylinderGeometry args={[0.045, 0.055, 1.8, 10]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.9} />
      </mesh>
      <instancedMesh ref={leaves} args={[leafGeometry, leafMaterial, LEAF_COUNT]} />
    </group>
  );
}

function BotanicalScene({ palette, progress }: { palette: Palette; progress: MotionValue<number> }) {
  const { viewport } = useThree();
  // Crop, don't shrink: on narrow screens the legs slide offscreen and the
  // crown stays above the type — shrinking would run the bough through it.
  const fit = THREE.MathUtils.clamp(viewport.width / 8.5, 0.95, 1);
  return (
    <group scale={[fit, fit, 1]}>
      <GardenArch palette={palette} progress={progress} />
      <PetalField palette={palette} />
    </group>
  );
}

export default function BotanicalHeroScene({
  palette,
  progress,
  className,
}: {
  palette: Palette;
  progress: MotionValue<number>;
  className?: string | undefined;
}) {
  return (
    <SceneCanvas className={className}>
      <BotanicalScene palette={palette} progress={progress} />
    </SceneCanvas>
  );
}
