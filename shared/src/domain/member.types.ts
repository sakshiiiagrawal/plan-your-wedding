// ---------------------------------------------------------------------------
// Wedding collaboration — member roles and section-scoped access
// ---------------------------------------------------------------------------

export const MEMBER_ROLES = ['admin', 'editor', 'viewer'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

// Section keys a member's access can be limited to. `null` allowed_sections
// means full access (all sections). Keys are shared between the API's
// path-prefix gate and the dashboard's nav filter, so they must stay in sync
// with both — see api/_src/app.ts and DashboardLayout.tsx.
export const WEDDING_SECTIONS = [
  'venues',
  'events',
  'guests',
  'vendors',
  'budget',
  'tasks',
  'website',
] as const;
export type WeddingSection = (typeof WEDDING_SECTIONS)[number];

export const SECTION_LABELS: Record<WeddingSection, string> = {
  venues: 'Venues & Rooms',
  events: 'Events',
  guests: 'Guests & RSVP',
  vendors: 'Vendors',
  budget: 'Budget',
  tasks: 'Tasks',
  website: 'Public Site & Gallery',
};
