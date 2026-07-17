import { useState, type ImgHTMLAttributes } from 'react';

/**
 * Drop-in <img> for user photos served from Supabase Storage. A plain <img>
 * that hits a transient CDN failure (cold cache / rate limit) renders blank
 * and never retries — that's the "same photo sometimes loads, sometimes
 * doesn't" bug. This retries a couple of times with a cache-busting param,
 * then settles on a soft placeholder instead of an empty box.
 */
export default function SiteImage({ src, style, ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  // ponytail: 2 retries covers transient CDN blips; a truly-gone object stays gone.
  const MAX_RETRIES = 2;

  const bustedSrc =
    typeof src === 'string' && attempt > 0
      ? `${src}${src.includes('?') ? '&' : '?'}retry=${attempt}`
      : src;

  if (failed) {
    return (
      <span
        aria-hidden
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          background: 'color-mix(in srgb, currentColor 8%, transparent)',
          ...style,
        }}
      />
    );
  }

  return (
    <img
      {...rest}
      src={bustedSrc}
      style={style}
      onError={() => {
        if (attempt < MAX_RETRIES) setAttempt((n) => n + 1);
        else setFailed(true);
      }}
    />
  );
}
