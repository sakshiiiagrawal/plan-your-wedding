import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import type { MotionValue } from 'framer-motion';
import type { Palette } from '../types';
import SceneCanvas, { SceneErrorBoundary } from '../three/SceneCanvas';

/**
 * Editorial's "Gallery Print" signature: the couple's own photos as matte
 * prints suspended in a gallery volume behind the hero type — ghosted low so
 * the typography always wins, drifting on a slow bob, leaning with the
 * pointer, and rising at depth-dependent rates on scroll. No particles, no
 * shimmer: Editorial's 3D is one idea, precisely.
 */

interface PrintSlot {
  x: number;
  y: number;
  z: number;
  rot: number;
  w: number;
  phase: number;
}

// Placed in the outer margins: the cover headline now runs wide across the
// left column, so prints hug the frame edges and stay clear of the type.
const PRINT_SLOTS: PrintSlot[] = [
  { x: 3.8, y: 1.7, z: -3.5, rot: 0.06, w: 1.55, phase: 0.0 },
  { x: -5.0, y: -1.8, z: -3.0, rot: -0.05, w: 1.4, phase: 1.3 },
  { x: 4.6, y: -2.0, z: -1.6, rot: 0.045, w: 1.2, phase: 2.6 },
  { x: -5.5, y: 2.4, z: -2.3, rot: 0.08, w: 1.3, phase: 3.9 },
  { x: 4.4, y: 3.0, z: -4.6, rot: -0.07, w: 1.5, phase: 5.2 },
  { x: -4.6, y: -3.2, z: -5.2, rot: 0.05, w: 1.7, phase: 0.7 },
];

/** object-fit: cover for a texture going onto a 4:5 print. */
function coverTexture(texture: THREE.Texture, planeAspect: number) {
  const img = texture.image as { width?: number; height?: number } | undefined;
  if (!img?.width || !img.height) return;
  const imgAspect = img.width / img.height;
  if (imgAspect > planeAspect) {
    texture.repeat.set(planeAspect / imgAspect, 1);
    texture.offset.set((1 - texture.repeat.x) / 2, 0);
  } else {
    texture.repeat.set(1, imgAspect / planeAspect);
    texture.offset.set(0, (1 - texture.repeat.y) / 2);
  }
}

function FloatingPrints({
  palette,
  photos,
  progress,
}: {
  palette: Palette;
  photos: string[];
  progress: MotionValue<number>;
}) {
  const urls = photos.slice(0, PRINT_SLOTS.length);
  const textures = useLoader(THREE.TextureLoader, urls);
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const printRefs = useRef<(THREE.Group | null)[]>([]);
  const pointer = useRef({ x: 0, y: 0, cx: 0, cy: 0 });

  useMemo(() => {
    textures.forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      coverTexture(texture, 4 / 5);
    });
  }, [textures]);

  // The canvas is pointer-events: none (decorative contract), so the scene
  // listens to the window for its parallax rather than R3F's pointer state.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Blank sheets when the couple has no photos yet — still a gallery.
  const slots = urls.length > 0 ? PRINT_SLOTS.slice(0, urls.length) : PRINT_SLOTS;

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime;
    const ptr = pointer.current;
    // Ease toward the pointer so the room leans, never jumps.
    ptr.cx += (ptr.x - ptr.cx) * 0.04;
    ptr.cy += (ptr.y - ptr.cy) * 0.04;
    group.rotation.y = ptr.cx * 0.07;
    group.rotation.x = -ptr.cy * 0.045;

    const scroll = THREE.MathUtils.clamp(progress.get(), 0, 1);
    slots.forEach((slot, i) => {
      const print = printRefs.current[i];
      if (!print) return;
      // Deeper prints rise slower — true depth parallax as the hero scrolls.
      const depthRate = 6 + slot.z;
      print.position.set(
        slot.x,
        slot.y + Math.sin(t * 0.35 + slot.phase) * 0.09 + scroll * depthRate * 0.55,
        slot.z,
      );
      print.rotation.z = slot.rot + Math.sin(t * 0.28 + slot.phase) * 0.02;
      print.rotation.y = Math.sin(t * 0.22 + slot.phase * 2) * 0.06;
    });
  });

  // The prints live in the margins around the type. Narrow screens (phones,
  // the Studio's mobile preview) have no margins — clipped half-prints at the
  // edges read as glitches, so below a landscape-ish aspect they don't render.
  if (viewport.width < 7) return null;

  const fit = THREE.MathUtils.clamp(viewport.width / 11, 0.75, 1);

  return (
    <group ref={groupRef} scale={[fit, fit, 1]}>
      {slots.map((slot, i) => {
        const w = slot.w;
        const h = w * 1.25;
        const texture = textures[i];
        return (
          <group
            key={i}
            ref={(el) => {
              printRefs.current[i] = el;
            }}
          >
            {/* Matte paper backing, slightly bottom-weighted like a real print. */}
            <mesh position={[0, -h * 0.035, -0.01]}>
              <planeGeometry args={[w * 1.14, h * 1.16]} />
              <meshBasicMaterial color={palette.surface} transparent opacity={0.4} />
            </mesh>
            {texture ? (
              <mesh>
                <planeGeometry args={[w, h]} />
                <meshBasicMaterial map={texture} transparent opacity={0.32} />
              </mesh>
            ) : (
              // No photo: a hairline-framed blank sheet, ghosted well below the type.
              <>
                <mesh>
                  <planeGeometry args={[w, h]} />
                  <meshBasicMaterial color={palette.accent} transparent opacity={0.22} />
                </mesh>
                <mesh position={[0, 0, 0.005]}>
                  <planeGeometry args={[w * 0.97, h * 0.976]} />
                  <meshBasicMaterial color={palette.surface} transparent opacity={0.5} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

export default function EditorialHeroScene({
  palette,
  photos,
  progress,
  className,
}: {
  palette: Palette;
  photos: string[];
  progress: MotionValue<number>;
  className?: string | undefined;
}) {
  return (
    <SceneCanvas className={className}>
      <SceneErrorBoundary>
        <Suspense fallback={null}>
          <FloatingPrints palette={palette} photos={photos} progress={progress} />
        </Suspense>
      </SceneErrorBoundary>
    </SceneCanvas>
  );
}
