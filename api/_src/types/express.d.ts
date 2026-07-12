export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  ownerId: string;
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
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
