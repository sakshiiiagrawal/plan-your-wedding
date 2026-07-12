import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { MotionValue } from 'framer-motion';
import type { Palette } from '../types';
import SceneCanvas from '../three/SceneCanvas';
import FallingField, { type FallingKind, type FallingObstacle } from '../three/FallingField';

/**
 * Botanical's "Canopy of Petals": the flat hero arch outline grows into a
 * real 3D garden arch — an accent-toned bough crowned with instanced leaves,
 * swaying as if in a breeze — while a volumetric field of petals/leaves/
 * blossoms (the couple's `falling` pick) drifts through the scene. With the
 * arch in "catch" mode the particles settle on the crown and slide off its
 * sides. The DOM names rise through the arch on scroll.
 */

/** The CSS `border-radius: 50% 0 50% 50%` petal as a ShapeGeometry. */
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

const LEAF_COUNT = 40;
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

  // Leaves densely cluster the crown (static matrices).
  useEffect(() => {
    const m = leaves.current;
    if (!m) return;
    const a = new THREE.Color(palette.accent);
    const b = new THREE.Color(palette.primary);
    const c = new THREE.Color();
    for (let i = 0; i < LEAF_COUNT; i++) {
      const angle = (i / (LEAF_COUNT - 1)) * Math.PI;
      const wobble = (Math.random() - 0.5) * 0.16;
      dummy.position.set(
        Math.cos(angle) * (ARCH_RADIUS + wobble),
        Math.sin(angle) * (ARCH_RADIUS + wobble) - 0.35,
        (Math.random() - 0.5) * 0.2,
      );
      dummy.rotation.set(0, 0, angle + (Math.random() - 0.5) * 1.4);
      const s = 0.12 + Math.random() * 0.12;
      dummy.scale.set(s, s * 1.35, s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, c.copy(a).lerp(b, Math.random() * 0.7));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    // eslint-disable-next-line react-hooks/immutability -- three.js: recompile the program once instanceColor exists
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
      {/* The bough: a floating half-torus crown. */}
      <mesh position={[0, -0.35, 0]}>
        <torusGeometry args={[ARCH_RADIUS, 0.045, 10, 64, Math.PI]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.9} />
      </mesh>
      <instancedMesh ref={leaves} args={[leafGeometry, leafMaterial, LEAF_COUNT]} />
    </group>
  );
}

const FALLING_KINDS: Record<string, FallingKind[]> = {
  petals: ['petal'],
  leaves: ['leaf'],
  blossoms: ['blossom'],
  mixed: ['petal', 'leaf', 'blossom'],
  none: [],
};

function BotanicalScene({
  palette,
  progress,
  falling,
  density,
  arch,
}: {
  palette: Palette;
  progress: MotionValue<number>;
  falling: string;
  density: string;
  arch: string;
}) {
  const { viewport } = useThree();
  // Crop, don't shrink: on narrow screens the arch sides slide offscreen and
  // the crown stays above the type — shrinking would run the bough through it.
  const fit = THREE.MathUtils.clamp(viewport.width / 8.5, 0.95, 1);
  const showArch = arch !== 'hidden';
  // "Catch" is the arch behaving as an obstacle; "sway" lets particles drift
  // straight through (the pre-collision look). Tracks the scroll swell so
  // particles keep hugging the crown as it grows.
  const obstacle: FallingObstacle | undefined =
    showArch && arch === 'catch'
      ? {
          center: [0, -0.35],
          radius: ARCH_RADIUS,
          zBand: 0.6,
          getScale: () => 1 + THREE.MathUtils.clamp(progress.get(), 0, 1) * 0.22,
        }
      : undefined;
  return (
    <group scale={[fit, fit, 1]}>
      {showArch && <GardenArch palette={palette} progress={progress} />}
      <FallingField
        kinds={FALLING_KINDS[falling] ?? FALLING_KINDS.petals!}
        density={density}
        palette={palette}
        obstacle={obstacle}
      />
    </group>
  );
}

export default function BotanicalHeroScene({
  palette,
  progress,
  className,
  falling = 'petals',
  density = 'normal',
  arch = 'catch',
}: {
  palette: Palette;
  progress: MotionValue<number>;
  className?: string | undefined;
  falling?: string;
  density?: string;
  arch?: string;
}) {
  return (
    <SceneCanvas className={className}>
      <BotanicalScene
        palette={palette}
        progress={progress}
        falling={falling}
        density={density}
        arch={arch}
      />
    </SceneCanvas>
  );
}
