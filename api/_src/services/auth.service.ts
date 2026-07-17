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
import { sendEmail } from './email';
import { verificationEmail, passwordResetEmail } from './email/templates';
import { acceptInvite, findPendingInvite } from './members.service';
import {
  assertSlugAvailable,
  createWedding,
  purgeWeddingData,
  listOwnedWeddingIds,
} from './weddings.service';
import { withPgTransaction } from '../config/postgres';
import { hashToken } from '../shared/utils/token.utils';
import { invalidateAuthCache } from '../middleware/auth.middleware';
import type { RegisterInput, UpdateProfileInput } from '../validators/auth.validator';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  slug: string | null;
  currency?: string;
  email_verified?: boolean;
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
  id: string;
  slug: string | null;
  title: string;
  currency: string;
  role: 'admin' | 'editor' | 'viewer';
  isOwner: boolean;
}

/**
 * Every wedding the user owns plus every wedding they're an active member of,
 * with the pending-invite count for the switcher/hub badge. activeWeddingId
 * mirrors the middleware's resolution (explicit choice, else oldest owned,
 * else first membership) so the UI never disagrees with the API's scoping.
 */
export async function listUserWeddings(userId: string): Promise<{
  activeWeddingId: string | null;
  weddings: WeddingOption[];
  pendingInviteCount: number;
}> {
  const { data: me, error } = await supabase
    .from('users')
    .select('id, email, active_wedding_id')
    .eq('id', userId)
    .single();
  if (error || !me) throw new NotFoundError('User not found');

  const [ownedRes, membershipRes, pendingRes] = await Promise.all([
    supabase
      .from('weddings')
      .select('id, slug, title, currency')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('wedding_members')
      .select('wedding_id, role, wedding:weddings!wedding_id(id, slug, title, currency)')
      .eq('member_id', userId)
      .eq('status', 'active')
      // Match the auth middleware's stable ordering so the UI's resolved
      // activeWeddingId fallback never disagrees with the API's scoping.
      .order('created_at', { ascending: true }),
    supabase
      .from('wedding_members')
      .select('id', { count: 'exact', head: true })
      .eq('invited_email', me.email)
      .eq('status', 'pending'),
  ]);

  const weddings: WeddingOption[] = (ownedRes.data ?? []).map((w) => ({
    id: w.id as string,
    slug: (w.slug as string | null) ?? null,
    title: (w.title as string) || 'My wedding',
    currency: (w.currency as string) ?? 'INR',
    role: 'admin' as const,
    isOwner: true,
  }));

  for (const m of membershipRes.data ?? []) {
    const w = m.wedding as unknown as {
      id: string;
      slug: string | null;
      title: string;
      currency: string | null;
    } | null;
    if (!w) continue;
    weddings.push({
      id: w.id,
      slug: w.slug,
      title: w.title || 'Wedding',
      currency: w.currency ?? 'INR',
      role: m.role as WeddingOption['role'],
      isOwner: false,
    });
  }

  const explicit = weddings.find((w) => w.id === me.active_wedding_id);
  const activeWeddingId = explicit?.id ?? weddings[0]?.id ?? null;

  return { activeWeddingId, weddings, pendingInviteCount: pendingRes.count ?? 0 };
}

/**
 * Switch the user's active wedding — any wedding they own or are an active
 * member of. Revoked/stale choices fall back via the middleware's default
 * resolution, so a bad stored id can never lock anyone out.
 */
export async function setActiveWedding(userId: string, weddingId: string): Promise<void> {
  const { data: owned } = await supabase
    .from('weddings')
    .select('id')
    .eq('id', weddingId)
    .eq('owner_id', userId)
    .maybeSingle();

  if (!owned) {
    const { data: membership } = await supabase
      .from('wedding_members')
      .select('id')
      .eq('member_id', userId)
      .eq('wedding_id', weddingId)
      .eq('status', 'active')
      .maybeSingle();
    if (!membership) throw new BadRequestError('You are not a member of that wedding');
  }

  const { error } = await supabase
    .from('users')
    .update({ active_wedding_id: weddingId })
    .eq('id', userId);
  if (error) throw error;
  invalidateAuthCache();
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
  const { name, email, password, slug, inviteToken, brideName, groomName, weddingDate } = input;

  // Joining an existing wedding: validate the invite BEFORE creating the
  // account so a dead link doesn't leave behind an orphaned, wedding-less user.
  let pendingInvite: Awaited<ReturnType<typeof findPendingInvite>> = null;
  if (inviteToken) {
    pendingInvite = await findPendingInvite(inviteToken);
    if (!pendingInvite) {
      throw new BadRequestError('This invite link is invalid or has already been used');
    }
  }

  // Legacy one-shot register (couple wizard bundles account + wedding into one
  // call for a release of compat): validate the slug before the user insert so
  // a conflict doesn't leave an orphaned, wedding-less account behind.
  if (slug) await assertSlugAvailable(slug);

  const password_hash = await hashPassword(password);
  const normalizedEmail = email.toLowerCase().trim();
  // The invite email proved inbox ownership — no separate verification needed
  const verifiedViaInvite = pendingInvite?.invited_email === normalizedEmail;

  // Accounts no longer carry a slug — weddings do (users.slug is legacy, kept
  // until 045 for pre-cutover deploys; new accounts never write it).
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      name,
      email: normalizedEmail,
      password_hash,
      ...(verifiedViaInvite ? { email_verified: true } : {}),
    })
    .select('id, email, name, slug')
    .single();

  if (userError) throw userError;
  if (!user) throw new Error('Failed to create user');

  const newUser = user as UserRow;

  if (slug) {
    const wedding = await createWedding(newUser.id, { slug, brideName, groomName, weddingDate });
    // The register response's slug drives the old wizard's redirect.
    newUser.slug = wedding.slug;
  }

  if (inviteToken) {
    // Membership activates; with no wedding of their own, the middleware's
    // default resolution lands them in the inviter's wedding on first load.
    await acceptInvite(newUser.id, inviteToken);
  }

  if (!verifiedViaInvite) {
    void requestEmailVerification(newUser).catch((err) =>
      console.error('[mailer] verification email failed:', err),
    );
  }

  return newUser;
}

export async function requestEmailVerification(user: {
  id: string;
  email: string;
  name?: string;
}): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('email_verifications')
    .insert({ user_id: user.id, token_hash: hashToken(token), expires_at });
  if (error) throw error;

  const link = `${env.FRONTEND_URL ?? ''}/verify-email?token=${token}`;
  await sendEmail({ to: user.email, ...verificationEmail({ name: user.name, link }) });
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
  void sendEmail({ to: user.email, ...passwordResetEmail({ name: user.name, link }) }).catch(
    (err) => console.error('[mailer] password reset email failed:', err),
  );
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
  // password_changed_at invalidates every JWT issued before this moment —
  // account recovery is exactly when a stolen session must stop working.
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash, password_changed_at: new Date().toISOString() })
    .eq('id', resetRow.user_id);
  if (updateError) throw updateError;
  invalidateAuthCache();

  // Burn this token AND any other outstanding reset tokens for the user
  await supabase
    .from('password_resets')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', resetRow.user_id)
    .is('used_at', null);
}

export async function updateProfile(
  ownerId: string,
  updates: UpdateProfileInput,
): Promise<UserRow & { verification_email_sent?: boolean }> {
  // slug/currency are wedding settings now — PATCH /weddings/:id owns them.
  const { name, email, reminder_prefs } = updates;

  const current = await findUserById(ownerId);
  if (!current) throw new UnauthorizedError('User not found');

  const normalizedEmail = email?.toLowerCase().trim();
  const emailChanged = normalizedEmail !== undefined && normalizedEmail !== current.email;

  if (emailChanged) {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .neq('id', ownerId)
      .limit(1);
    if (data && data.length > 0) throw new ConflictError('That email is already in use');
  }

  const patch: Record<string, string | boolean | object> = {};
  if (name) patch.name = name;
  if (reminder_prefs) patch.reminder_prefs = reminder_prefs;
  if (emailChanged) {
    patch.email = normalizedEmail;
    // A changed address is unproven until re-verified — pending-invite
    // acceptance authorises by (email + email_verified), so leaving the flag
    // set would let anyone claim invites addressed to someone else's inbox.
    patch.email_verified = false;
  }

  // PostgREST rejects an empty update — treat "nothing to change" as a no-op
  if (Object.keys(patch).length === 0) {
    return current;
  }

  const { data: user, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', ownerId)
    // email_verified included so the client sees the flag flip on email change
    .select('id, email, name, slug, currency, email_verified, reminder_prefs')
    .single();

  if (error) throw error;

  if (emailChanged) {
    // Awaited so a failed send is reported, not swallowed — the user is now
    // unverified and needs to know whether a link is actually in their inbox.
    let verificationEmailSent = true;
    try {
      await requestEmailVerification({ id: ownerId, email: normalizedEmail, name: current.name });
    } catch (err) {
      console.error('[mailer] verification email failed:', err);
      verificationEmailSent = false;
    }
    return { ...(user as UserRow), verification_email_sent: verificationEmailSent };
  }

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
  // Invalidates all existing sessions; the controller issues the caller a
  // fresh token so their own session survives the change.
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash, password_changed_at: new Date().toISOString() })
    .eq('id', userId);
  if (updateError) throw updateError;
  invalidateAuthCache();
}

/**
 * Deletes the account and every wedding it owns (finance chains cleared
 * explicitly — see purgeWeddingData). Weddings the user merely collaborates
 * on are untouched; their membership rows cascade away with the user.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const ownedIds = await listOwnedWeddingIds(userId);
  await withPgTransaction(async (client) => {
    for (const weddingId of ownedIds) {
      await purgeWeddingData(client, weddingId);
    }
    await client.query('DELETE FROM weddings WHERE owner_id = $1', [userId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
  });
  invalidateAuthCache();
}
