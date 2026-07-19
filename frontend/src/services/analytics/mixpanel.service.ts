/// <reference types="vite/client" />

import mixpanel from 'mixpanel-browser';

/**
 * Minimal Mixpanel tracking — enable via env as documented in `.env.example`.
 */

const ANALYTICS_PROJECT_TOKEN_ENV = ['VITE', 'MIXPANEL', 'TOKEN'].join('_');
const ANALYTICS_TRACK_EVENTS_ENV = ['VITE', 'TRACK', 'EVENTS'].join('_');
const ANALYTICS_DEBUG_ENV = ['VITE', 'DEBUG'].join('_');

function envString(key: string): string | undefined {
  return (import.meta.env as Record<string, string | undefined>)[key];
}

let isInitialized = false;

function readAnalyticsDebugFlag(): boolean {
  return envString(ANALYTICS_DEBUG_ENV) === 'true';
}

function readTrackingFlag(): boolean {
  return envString(ANALYTICS_TRACK_EVENTS_ENV) === 'true';
}

function tryInitialize(): void {
  if (isInitialized) return;

  const token = envString(ANALYTICS_PROJECT_TOKEN_ENV);
  const isPlaceholderToken =
    !token || token === 'your-mixpanel-project-token' || token.startsWith('your-');

  if (isPlaceholderToken || !readTrackingFlag()) {
    return;
  }

  const enableLogs = readAnalyticsDebugFlag();

  try {
    mixpanel.init(token, {
      debug: enableLogs,
      track_pageview: false,
      persistence: 'localStorage',
    });

    mixpanel.opt_in_tracking();

    if (enableLogs) {
      mixpanel.track('__test_event', { timestamp: new Date().toISOString() });
    }

    isInitialized = true;
  } catch (error) {
    if (enableLogs) {
      console.error('[Mixpanel] Failed to initialize:', error);
    }
    isInitialized = false;
  }
}

/**
 * Track an event with properties
 */
export function trackEvent(eventName: string, properties: Record<string, unknown> = {}): void {
  if (!eventName) return;

  tryInitialize();

  const enableLogs = readAnalyticsDebugFlag();

  if (isInitialized && readTrackingFlag()) {
    try {
      mixpanel.track(eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (enableLogs) {
        console.error(`[Mixpanel] Error tracking event "${eventName}":`, error);
      }
    }
  }
}

/**
 * Track a page view
 */
export function trackPageView(pageName: string, properties: Record<string, unknown> = {}): void {
  trackEvent('Page View', {
    page_name: pageName,
    url: window.location.href,
    path: window.location.pathname,
    ...properties,
  });
}

/**
 * Identify a user
 */
export function identifyUser(userId: string, traits: Record<string, unknown> = {}): void {
  if (!userId) {
    return;
  }

  tryInitialize();

  const enableLogs = readAnalyticsDebugFlag();

  if (!isInitialized || !readTrackingFlag()) {
    return;
  }

  try {
    mixpanel.identify(userId);
    mixpanel.people.set({
      ...traits,
      $last_seen: new Date().toISOString(),
    });
  } catch (error) {
    if (enableLogs) {
      console.error('[Mixpanel] Error identifying user:', error);
    }
  }
}

/**
 * Reset the current user (useful for logout)
 */
export function resetUser(): void {
  tryInitialize();

  const enableLogs = readAnalyticsDebugFlag();

  if (isInitialized && readTrackingFlag()) {
    try {
      mixpanel.reset();
    } catch (error) {
      if (enableLogs) {
        console.error('[Mixpanel] Error resetting user:', error);
      }
    }
  }
}

// Utility exports
export const Mixpanel = {
  get isInitialized() {
    tryInitialize();
    return isInitialized;
  },
  get shouldTrack() {
    return readTrackingFlag();
  },
  track: trackEvent,
  page: trackPageView,
  identify: identifyUser,
  reset: resetUser,
};
