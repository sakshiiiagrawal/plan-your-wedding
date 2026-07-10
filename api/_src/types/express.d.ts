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
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
