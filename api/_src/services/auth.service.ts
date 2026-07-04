import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database';
import { env } from '../config/env';
import {
  ConflictError,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from '../shared/errors/HttpError';
import { sendEmail } from './mailer';
import { hashToken } from '../shared/utils/token.utils';
import type { RegisterInput, UpdateProfileInput } from '../validators/auth.validator';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  slug: string | null;
  currency?: string;
  password_hash?: string;
  created_at?: string;
}

export function signToken(user: { id: string; email: string }): string {
  return jwt.sign({ id: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface WeddingOption {
  ownerId: string;
  label: string;
  role: 'admin' | 'editor' | 'viewer';
  isOwn: boolean;
}

/** The user's own wedding plus every wedding they're an active member of. */
export async function listUserWeddings(
  userId: string,
): Promise<{ activeOwnerId: string; weddings: WeddingOption[] }> {
  const { data: me, error } = await supabase
    .from('users')
    .select('id, name, slug, active_owner_id')
    .eq('id', userId)
    .single();
  if (error || !me) throw new NotFoundError('User not found');

  const weddings: WeddingOption[] = [
    { ownerId: me.id, label: me.name || me.slug || 'My wedding', role: 'admin', isOwn: true },
  ];

  const { data: memberships } = await supabase
    .from('wedding_members')
    .select('owner_id, role, owner:users!owner_id(name, slug)')
    .eq('member_id', userId)
    .eq('status', 'active');

  for (const m of memberships ?? []) {
    const owner = m.owner as unknown as { name: string | null; slug: string | null } | null;
    weddings.push({
      ownerId: m.owner_id,
      label: owner?.name || owner?.slug || 'Wedding',
      role: m.role as WeddingOption['role'],
      isOwn: false,
    });
  }

  return { activeOwnerId: me.active_owner_id ?? me.id, weddings };
}

/**
 * Switch the user's active wedding. Passing their own id clears the override
 * (back to their own wedding); any other id must be a wedding they're an active
 * member of, otherwise it's rejected.
 */
export async function setActiveWedding(userId: string, targetOwnerId: string): Promise<void> {
  if (targetOwnerId !== userId) {
    const { data: membership } = await supabase
      .from('wedding_members')
      .select('id')
      .eq('member_id', userId)
      .eq('owner_id', targetOwnerId)
      .eq('status', 'active')
      .maybeSingle();
    if (!membership) throw new BadRequestError('You are not an active member of that wedding');
  }

  const { error } = await supabase
    .from('users')
    .update({ active_owner_id: targetOwnerId === userId ? null : targetOwnerId })
    .eq('id', userId);
  if (error) throw error;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, password_hash, slug')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error || !data) return null;
  return data as UserRow;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, slug, currency')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as UserRow;
}

export async function createUser(input: RegisterInput): Promise<UserRow> {
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
      slug,
    })
    .select('id, email, name, slug')
    .single();

  if (userError) throw userError;
  if (!user) throw new Error('Failed to create user');

  const newUser = user as UserRow;

  // Seed every website-content section so fresh accounts never 404 on
  // hero/couple/story/gallery reads (dashboard, editor, and public site all
  // fetch them before the user has saved anything).
  const heroContent =
    (brideName ?? groomName ?? weddingDate)
      ? {
          bride_name: brideName ?? '',
          groom_name: groomName ?? '',
          wedding_date: weddingDate ?? null,
          tagline: `${brideName ?? 'Bride'} & ${groomName ?? 'Groom'} are getting married!`,
        }
      : {};
  const seedSections = [
    { section_name: 'hero', content: heroContent, display_order: 1 },
    { section_name: 'couple', content: {}, display_order: 2 },
    { section_name: 'our_story', content: { story: '' }, display_order: 3 },
    { section_name: 'gallery', content: { images: [] }, display_order: 4 },
  ];
  await supabase
    .from('website_content')
    .upsert(
      seedSections.map((s) => ({ ...s, user_id: newUser.id })),
      { onConflict: 'section_name,user_id' },
    );

  void requestEmailVerification(newUser).catch((err) =>
    console.error('[mailer] verification email failed:', err),
  );

  return newUser;
}

export async function requestEmailVerification(user: { id: string; email: string }): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('email_verifications')
    .insert({ user_id: user.id, token_hash: hashToken(token), expires_at });
  if (error) throw error;

  const link = `${env.FRONTEND_URL ?? ''}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your email',
    html: `<p>Click the link below to verify your email address. This link expires in 24 hours.</p><p><a href="${link}">${link}</a></p>`,
  });
}

export async function verifyEmail(token: string): Promise<void> {
  const { data: row, error } = await supabase
    .from('email_verifications')
    .select('id, user_id, expires_at, used_at')
    .eq('token_hash', hashToken(token))
    .single();

  if (error || !row || row.used_at || new Date(row.expires_at) < new Date()) {
    throw new BadRequestError('This verification link is invalid or has expired');
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ email_verified: true })
    .eq('id', row.user_id);
  if (updateError) throw updateError;

  await supabase
    .from('email_verifications')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await findUserByEmail(email);
  if (!user) return; // no user enumeration — always resolve

  const token = randomBytes(32).toString('hex');
  const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('password_resets')
    .insert({ user_id: user.id, token_hash: hashToken(token), expires_at });
  if (error) throw error;

  // Fire-and-forget: awaiting the SMTP round-trip would make response time a
  // user-enumeration oracle (unknown emails return instantly) and block the UI
  const link = `${env.FRONTEND_URL ?? ''}/reset-password?token=${token}`;
  void sendEmail({
    to: user.email,
    subject: 'Reset your password',
    html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${link}">${link}</a></p>`,
  }).catch((err) => console.error('[mailer] password reset email failed:', err));
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const { data: resetRow, error } = await supabase
    .from('password_resets')
    .select('id, user_id, expires_at, used_at')
    .eq('token_hash', hashToken(token))
    .single();

  if (error || !resetRow || resetRow.used_at || new Date(resetRow.expires_at) < new Date()) {
    throw new BadRequestError('This reset link is invalid or has expired');
  }

  const password_hash = await hashPassword(newPassword);
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash })
    .eq('id', resetRow.user_id);
  if (updateError) throw updateError;

  await supabase
    .from('password_resets')
    .update({ used_at: new Date().toISOString() })
    .eq('id', resetRow.id);
}

export async function updateProfile(
  ownerId: string,
  updates: UpdateProfileInput,
): Promise<UserRow> {
  const { name, email, slug, currency } = updates;

  if (email) {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .neq('id', ownerId)
      .limit(1);
    if (data && data.length > 0) throw new ConflictError('That email is already in use');
  }

  if (slug) {
    const { data } = await supabase.from('users').select('id').eq('slug', slug).neq('id', ownerId).limit(1);
    if (data && data.length > 0) throw new ConflictError('That URL is already taken');
  }

  const patch: Record<string, string> = {};
  if (name) patch.name = name;
  if (email) patch.email = email.toLowerCase().trim();
  if (slug) patch.slug = slug;
  if (currency) patch.currency = currency;

  // PostgREST rejects an empty update — treat "nothing to change" as a no-op
  if (Object.keys(patch).length === 0) {
    const current = await findUserById(ownerId);
    if (!current) throw new UnauthorizedError('User not found');
    return current;
  }

  const { data: user, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', ownerId)
    .select('id, email, name, slug, currency')
    .single();

  if (error) throw error;
  return user as UserRow;
}

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const { data: user, error } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', userId)
    .single();
  if (error || !user) throw new UnauthorizedError('User not found');

  const matches = await comparePasswords(oldPassword, user.password_hash);
  if (!matches) throw new BadRequestError('Current password is incorrect');

  const password_hash = await hashPassword(newPassword);
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash })
    .eq('id', userId);
  if (updateError) throw updateError;
}

export async function deleteAccount(userId: string): Promise<void> {
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) throw error;
}
