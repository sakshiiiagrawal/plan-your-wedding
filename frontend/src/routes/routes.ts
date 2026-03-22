export const ROUTES = {
  home: '/',
  onboard: '/onboard',
  login: (slug: string) => `/${slug}/login`,
  publicSite: (slug: string) => `/${slug}`,
  admin: {
    root: (slug: string) => `/${slug}/admin`,
    dashboard: (slug: string) => `/${slug}/admin`,
    events: (slug: string) => `/${slug}/admin/events`,
    guests: (slug: string) => `/${slug}/admin/guests`,
    venues: (slug: string) => `/${slug}/admin/venues`,
    accommodations: (slug: string) => `/${slug}/admin/accommodations`,
    vendors: (slug: string) => `/${slug}/admin/vendors`,
    expense: (slug: string) => `/${slug}/admin/expense`,
    tasks: (slug: string) => `/${slug}/admin/tasks`,
    team: (slug: string) => `/${slug}/admin/team`,
  },
} as const;
