export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'family' | 'friends';
  created_by: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
