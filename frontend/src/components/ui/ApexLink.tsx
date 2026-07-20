import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { apexHref, isAbsoluteHref } from '../../utils/tenant';

interface ApexLinkProps {
  /** Apex-relative path, e.g. `/`, `/onboard`, `/forgot-password`. */
  to: string;
  className?: string;
  children: ReactNode;
}

/**
 * A link to an account or marketing destination. These routes only exist on
 * the apex host — from a wedding subdomain the same path means the couple's
 * public site, so `apexHref` rewrites it to an absolute URL and we drop to a
 * plain anchor: crossing origins needs a real document load.
 */
export default function ApexLink({ to, className, children }: ApexLinkProps) {
  const href = apexHref(to);
  if (isAbsoluteHref(href)) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}
