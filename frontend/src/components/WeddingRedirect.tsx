import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { isAbsoluteHref, weddingHref } from '../utils/tenant';

interface WeddingRedirectProps {
  slug: string;
  /** Path within the wedding, e.g. '/dashboard'. */
  path?: string;
  replace?: boolean;
}

/**
 * Send the browser into a wedding. `<Navigate>` handles it when the wedding is
 * on this origin; when it lives on its own subdomain only a document load will
 * do, and react-router can't perform one.
 */
export default function WeddingRedirect({ slug, path = '', replace = true }: WeddingRedirectProps) {
  const href = weddingHref(slug, path);
  const crossOrigin = isAbsoluteHref(href);

  useEffect(() => {
    if (!crossOrigin) return;
    if (replace) window.location.replace(href);
    else window.location.assign(href);
  }, [crossOrigin, href, replace]);

  return crossOrigin ? null : <Navigate to={href} replace={replace} />;
}
