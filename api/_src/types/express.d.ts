export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  /** The active wedding's id — null when the account has no wedding yet (create or join first). */
  weddingId: string | null;
  /** Display label of the active wedding (weddings.title). */
  weddingTitle: string | null;
  /** True when the logged-in user owns the active wedding. */
  isOwner: boolean;
  slug: string | null;
  emailVerified: boolean;
  currency: string;
  role: 'admin' | 'editor' | 'viewer';
  /** null = full access; a non-empty array limits the member to those sections */
  allowedSections: string[] | null;
  /** Fine-grained grants (e.g. 'budget:splits', 'members:manage'). Admins implicitly hold all. */
  permissions: string[];
  /** Reminder settings (users.reminder_prefs). Always the logged-in user's own, never the wedding owner's. */
  reminderPrefs: { email_digest?: boolean; payment_lead_days?: number } | null;
  /** Last-used view/tab per page (users.view_prefs), e.g. { 'tasks.viewMode': 'kanban' }. */
  viewPrefs: Record<string, unknown>;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
