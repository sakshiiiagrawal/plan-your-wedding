// ---------------------------------------------------------------------------
// Wedding collaboration — member roles and section-scoped access
// ---------------------------------------------------------------------------

export const MEMBER_ROLES = ['admin', 'editor', 'viewer'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

// Section keys a member's access can be limited to. `null` allowed_sections
// means full access (all sections). Keys are shared between each router's
// requireSection mount and the dashboard's nav filter, so they must stay in
// sync with both — see api/_src/routes/index.ts and DashboardLayout.tsx.
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

// Fine-grained grants layered on top of role + allowed_sections. Admins
// implicitly hold every permission regardless of what's stored.
export const MEMBER_PERMISSIONS = ['budget:splits', 'members:manage'] as const;
export type MemberPermission = (typeof MEMBER_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<MemberPermission, string> = {
  'budget:splits': 'See bride/groom cost split',
  'members:manage': 'Invite & manage members',
};

interface Actor {
  role?: string;
  permissions?: string[] | null;
  allowedSections?: string[] | null;
}

/** Admins implicitly hold every permission; others need it in their grant list. */
export function can(u: Actor | null | undefined, p: MemberPermission): boolean {
  return !!u && (u.role === 'admin' || (u.permissions ?? []).includes(p));
}

/** `allowedSections == null` means full access; admins always pass. */
export function canAccessSection(u: Actor | null | undefined, s: WeddingSection): boolean {
  return !!u && (u.role === 'admin' || u.allowedSections == null || u.allowedSections.includes(s));
}

export type FinanceTier = 'full' | 'money' | 'none';

/**
 * Derived, never stored: how much money detail a member sees.
 * full  = has budget access and can see the bride/groom split.
 * money = has budget access but only combined amounts (no side attribution).
 * none  = no budget access at all, so no money anywhere (even other sections).
 */
export function financeTier(u: Actor | null | undefined): FinanceTier {
  if (!canAccessSection(u, 'budget')) return 'none';
  return can(u, 'budget:splits') ? 'full' : 'money';
}
