import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database';
import { env } from '../config/env';
import { ConflictError } from '../shared/errors/HttpError';
import type { RegisterInput } from '../validators/auth.validator';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'family' | 'friends';
  slug: string | null;
  created_by: string | null;
  password_hash?: string;
  created_at?: string;
}

export function signToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, password_hash, slug, created_by')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error || !data) return null;
  return data as UserRow;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, slug, created_by')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as UserRow;
}

export async function createAdminUser(input: RegisterInput): Promise<UserRow> {
  const { name, email, password, slug, brideName, groomName, weddingDate } = input;

  // Check slug uniqueness
  const { data: slugConflict } = await supabase
    .from('users')
    .select('id')
    .eq('slug', slug)
    .limit(1);

  if (slugConflict && slugConflict.length > 0) {
    throw new ConflictError('That URL is already taken. Please choose another.');
  }

  const password_hash = await hashPassword(password);

  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      name,
      email: email.toLowerCase().trim(),
      password_hash,
      role: 'admin',
      slug,
    })
    .select('id, email, name, role, slug')
    .single();

  if (userError) throw userError;
  if (!user) throw new Error('Failed to create user');

  const newUser = user as UserRow;

  // Upsert hero content with wedding details if provided
  if (brideName ?? groomName ?? weddingDate) {
    const heroContent = {
      bride_name: brideName ?? '',
      groom_name: groomName ?? '',
      wedding_date: weddingDate ?? null,
      tagline: `${brideName ?? 'Bride'} & ${groomName ?? 'Groom'} are getting married!`,
    };

    await supabase.from('website_content').upsert(
      {
        section_name: 'hero',
        content: heroContent,
        display_order: 1,
        user_id: newUser.id,
      },
      { onConflict: 'section_name,user_id' },
    );
  }

  return newUser;
}

export async function findAdminByCreatedBy(
  userId: string,
): Promise<{ slug: string | null } | null> {
  const { data, error } = await supabase.from('users').select('slug').eq('id', userId).single();

  if (error || !data) return null;
  return data as { slug: string | null };
}
