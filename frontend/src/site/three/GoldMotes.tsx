import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { Palette } from '../types';
import { usePaletteMaterials } from './usePaletteMaterials';
import { GOLD_MOTES_VERTEX, GOLD_MOTES_FRAGMENT } from './goldShimmer.glsl';

/**
 * A drifting field of luminous motes tinted by the active palette (accent ↔
 * onHeroSoft) — Classic's "gold dust", but any palette reskins it. Additive,
 * depth-read-only, one draw call; density is the caller's dial (~400 for a
 * hero, ~100 for a section backdrop).
 */
export default function GoldMotes({
  palette,
  count = 400,
  area = [12, 8, 5],
  size = 36,
  speed = 1,
  opacity = 1,
}: {
  palette: Palette;
  count?: number;
  /** Extents of the particle volume, centered on the group origin. */
  area?: [number, number, number];
  size?: number;
  speed?: number;
  opacity?: number;
}) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const colors = usePaletteMaterials(palette);
  const [ax, ay, az] = area;

  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * ax;
      positions[i * 3 + 1] = (Math.random() - 0.5) * ay;
      positions[i * 3 + 2] = (Math.random() - 0.5) * az;
      seeds[i] = Math.random();
    }
    return { positions, seeds };
  }, [count, ax, ay, az]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uSize: { value: size },
      uPixelRatio: { value: 1 },
      uArea: { value: new THREE.Vector3(ax, ay, az) },
      uOpacity: { value: opacity },
      uColorA: { value: colors.accent.clone() },
      uColorB: { value: colors.onHeroSoft.clone() },
    }),
    // Created once per remount (the geometry key below); live values sync per-frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uTime!.value = state.clock.elapsedTime;
    m.uniforms.uPixelRatio!.value = state.gl.getPixelRatio();
    m.uniforms.uSpeed!.value = speed;
    m.uniforms.uSize!.value = size;
    m.uniforms.uOpacity!.value = opacity;
    // Palette can change live in the Studio — keep uniforms tracking it.
    (m.uniforms.uColorA!.value as THREE.Color).copy(colors.accent);
    (m.uniforms.uColorB!.value as THREE.Color).copy(colors.onHeroSoft);
    (m.uniforms.uArea!.value as THREE.Vector3).set(ax, ay, az);
  });

  return (
    <points key={`${count}-${ax}-${ay}-${az}`} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        vertexShader={GOLD_MOTES_VERTEX}
        fragmentShader={GOLD_MOTES_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
