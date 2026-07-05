import type { CSSProperties, ReactNode } from 'react';

/**
 * Gold-sheen text (the guide's shimmer effect). Colors default to the classic
 * gold ramp; pass `colors` to tint toward the active palette's accent.
 * The `site-shimmer` keyframes live in index.css.
 */
export default function ShimmerText({
  children,
  colors,
  style,
  className,
}: {
  children: ReactNode;
  colors?: [string, string, string];
  style?: CSSProperties;
  className?: string;
}) {
  const [dark, mid, light] = colors ?? ['#8B6210', '#c9942a', '#ffe8a0'];

  return (
    <span
      className={className}
      style={{
        background: `linear-gradient(90deg, ${dark}, ${mid}, ${light}, ${mid}, ${dark})`,
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        animation: 'site-shimmer 3s linear infinite',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
