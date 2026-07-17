import { useEffect, useState } from 'react';

/**
 * True below the given viewport width (default 768px, matching the CSS
 * mobile layer in index.css). For layouts that are computed in JS —
 * pixel-positioned canvases, fixed-width panes — where the m-* CSS
 * utilities can't reach.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const query = `(max-width: ${breakpoint - 1}px)`;
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return isMobile;
}
