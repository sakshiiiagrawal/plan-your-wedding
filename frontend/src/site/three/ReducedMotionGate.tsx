import type { ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Every 3D scene must degrade to a static/2D equivalent — the accessibility
 * bar TickerDigit/ScrollProgress already set. Render the scene as children and
 * pass today's flat treatment as `fallback`; `alsoWhen` lets callers fold in
 * extra "no 3D" conditions (e.g. `?print=1`) without duplicating the branch.
 */
export default function ReducedMotionGate({
  children,
  fallback = null,
  alsoWhen = false,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  alsoWhen?: boolean;
}) {
  const reduced = useReducedMotion();
  return <>{reduced || alsoWhen ? fallback : children}</>;
}
