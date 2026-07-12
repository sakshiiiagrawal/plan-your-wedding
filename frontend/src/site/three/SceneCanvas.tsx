import { Component, Suspense, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';

/**
 * A WebGL scene can fail for reasons outside our control (no context left,
 * blocked GPU, a texture that refuses CORS). A public wedding site must never
 * white-screen for that — every canvas renders inside this boundary and simply
 * disappears, leaving the DOM fallback that is always painted underneath.
 */
export class SceneErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}

/**
 * The shared R3F canvas wrapper every template scene renders through:
 * - dpr clamped to [1, 2] so 3x mobile screens don't triple the fill cost
 * - stops rendering entirely (`frameloop="never"`) while scrolled offscreen
 *   or while `paused` (e.g. the RSVP backdrop pauses when the form is focused)
 * - `flat` (no tone mapping) so built-in materials keep palette-true color
 * - decorative by contract: pointer-events pass through, hidden from a11y tree
 * - wrapped in SceneErrorBoundary + Suspense so a failed/loading scene leaves
 *   the DOM styling underneath untouched
 */
export default function SceneCanvas({
  children,
  className,
  style,
  camera,
  paused = false,
}: {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  camera?: { position: [number, number, number]; fov: number } | undefined;
  paused?: boolean | undefined;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? false),
      { rootMargin: '80px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className={className} style={{ pointerEvents: 'none', ...style }} aria-hidden>
      <SceneErrorBoundary>
        <Canvas
          dpr={[1, 2]}
          flat
          camera={camera ?? { position: [0, 0, 8], fov: 45 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
          frameloop={visible && !paused ? 'always' : 'never'}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}>{children}</Suspense>
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
}
