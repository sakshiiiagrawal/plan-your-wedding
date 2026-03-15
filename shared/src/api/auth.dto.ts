import type { UserRole } from '../domain/user.types';

// ---------------------------------------------------------------------------
// Auth DTOs — request/response shapes for /api/v1/auth/* endpoints
// ---------------------------------------------------------------------------

// --- Login ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// --- Register (onboarding) ---

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  /** Bride/groom names and wedding date stored as hero website_content. */
  bride_name: string;
  groom_name: string;
  wedding_date?: string | null;
  tagline?: string;
}

export interface RegisterResponse {
  token: string;
  user: AuthUser;
}

// ---------------------------------------------------------------------------
// Shared authenticated user shape (JWT payload + safe profile fields)
// ---------------------------------------------------------------------------

/**
 * The user object embedded in API responses and decoded from the JWT.
 * password_hash is never included.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  slug: string | null;
  created_at: string;
}
