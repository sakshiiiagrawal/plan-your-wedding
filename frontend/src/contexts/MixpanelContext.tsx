import { type ReactNode, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { trackPageView, identifyUser } from '../services/analytics/mixpanel.service';

function capitalizeFirst(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** Slug-less routes; anything else is a wedding slug we must not put in the page name. */
const TOP_LEVEL_PAGES: Record<string, string> = {
  login: 'Login Page',
  onboard: 'Onboarding Page',
  hub: 'Hub Page',
  invites: 'Invites Page',
  'forgot-password': 'Forgot Password Page',
  'reset-password': 'Reset Password Page',
  'accept-invite': 'Accept Invite Page',
  'verify-email': 'Verify Email Page',
  weddings: 'New Wedding Page',
  __preview: 'Site Preview Frame',
};

/**
 * Page name from a path. Wedding slugs are unbounded, so they never become part
 * of the name — they travel as the `slug` property instead.
 *
 * /                     -> Marketing Page
 * /login                -> Login Page
 * /:slug                -> Public Wedding Page
 * /:slug/login          -> Login Page
 * /:slug/dashboard      -> Dashboard Page
 * /:slug/dashboard/x    -> X Page
 * /:slug/:pageSlug      -> Public Wedding Page
 */
function getPageNameFromPath(path: string): string {
  const cleanPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
  const segments = cleanPath.split('/').filter(Boolean);

  const [first, second, third] = segments;

  if (!first) return 'Marketing Page';

  const topLevel = TOP_LEVEL_PAGES[first];
  if (topLevel) return topLevel;

  // Everything below is slug-scoped: /:slug/...
  if (!second) return 'Public Wedding Page';
  if (second === 'login') return 'Login Page';
  if (second === 'dashboard') {
    return third ? `${capitalizeFirst(third)} Page` : 'Dashboard Page';
  }
  return 'Public Wedding Page';
}

interface MixpanelProviderProps {
  children: ReactNode;
}

/**
 * Side-effects-only component: handles Mixpanel user identification and page view tracking.
 * Components that need to track events should import trackEvent from mixpanel.service directly.
 */
export function MixpanelProvider({ children }: MixpanelProviderProps) {
  const { isAuthenticated, user, slug } = useAuth();
  const location = useLocation();
  const prevPathRef = useRef<string>('');

  // Identify authenticated users
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      identifyUser(String(user.id), {
        email: user.email || '',
        name: user.name || '',
        wedding_id: user.weddingId || '',
        role: user.role || '',
        is_owner: Boolean(user.isOwner),
        is_authenticated: true,
      });
    }
  }, [isAuthenticated, user]);

  // Track page views when route changes
  useEffect(() => {
    const currentPath = location?.pathname || '';
    if (prevPathRef.current === currentPath) return;

    trackPageView(getPageNameFromPath(currentPath), {
      path: currentPath,
      slug: slug || '',
      is_authenticated: isAuthenticated,
      url: window.location.href,
    });

    prevPathRef.current = currentPath;
  }, [location?.pathname, isAuthenticated, slug]);

  return <>{children}</>;
}
