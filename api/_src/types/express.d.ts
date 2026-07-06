export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  ownerId: string;
  slug: string | null;
  emailVerified: boolean;
  currency: string;
  role: 'admin' | 'editor' | 'viewer';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
