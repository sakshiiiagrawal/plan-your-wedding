export const ROUTES = {
  home: '/',
  onboard: '/onboard',
  login: (slug?: string) => (slug ? `/${slug}/login` : '/login'),
  publicSite: (slug: string) => `/${slug}`,
  dashboard: {
    root: (slug: string) => `/${slug}/dashboard`,
    dashboard: (slug: string) => `/${slug}/dashboard`,
    events: (slug: string) => `/${slug}/dashboard/events`,
    guests: (slug: string) => `/${slug}/dashboard/guests`,
    venues: (slug: string) => `/${slug}/dashboard/venues`,
    accommodations: (slug: string) => `/${slug}/dashboard/accommodations`,
    vendors: (slug: string) => `/${slug}/dashboard/vendors`,
    expense: (slug: string) => `/${slug}/dashboard/expense`,
    tasks: (slug: string) => `/${slug}/dashboard/tasks`,
  },
} as const;
