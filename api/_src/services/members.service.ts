import { randomBytes } from 'crypto';
import { can, canAccessSection, type WeddingSection, type MemberPermission } from '../../../shared/src';
import { supabase } from '../config/database';
import { env } from '../config/env';
import { sendEmail } from './email';
import { inviteEmail } from './email/templates';
import { NotFoundError, ConflictError, BadRequestError, ForbiddenError } from '../shared/errors/HttpError';
import { hashToken } from '../shared/utils/token.utils';
import { invalidateAuthCache } from '../middleware/auth.middleware';
import type { AuthenticatedUser } from '../types/express';

const MEMBER_COLUMNS =
  'id, wedding_id, member_id, invited_email, role, status, allowed_sections, permissions, created_at';

export interface MemberRow {
  id: string;
  wedding_id: string;
  member_id: string | null;
  invited_email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'pending' | 'active';
  /** null = full access; a non-empty array limits the member to those sections */
  allowed_sections: string[] | null;
  permissions: string[];
  created_at: string;
}

export interface MemberWeddingInfo {
  id: string;
  slug: string | null;
  title: string;
}

/** The actor's active wedding, required for any member management call. */
function getActorWeddingId(actor: AuthenticatedUser): string {
  if (!actor.weddingId) {
    throw new ForbiddenError('No active wedding — create or join one first');
  }
  return actor.weddingId;
}

/**
 * Blocks privilege escalation by a non-admin actor delegating member
 * management (`members:manage`). Admins bypass every check here — they can
 * already do all of this via their implicit role. Throws ForbiddenError on
 * the first violation.
 */
function assertCanGrant(
  actor: AuthenticatedUser,
  request: {
    role?: 'admin' | 'editor' | 'viewer' | undefined;
    sections?: string[] | null | undefined;
    permissions?: string[] | undefined;
    target?: MemberRow | undefined;
  },
): void {
  if (actor.role === 'admin') return;

  if (request.role === 'admin') {
    throw new ForbiddenError('Only admins can grant the admin role');
  }

  for (const permission of request.permissions ?? []) {
    if (!can(actor, permission as MemberPermission)) {
      throw new ForbiddenError(`You do not have permission to grant "${permission}"`);
    }
  }

  if (request.sections === null) {
    if (actor.allowedSections !== null) {
      throw new ForbiddenError('You cannot grant full section access');
    }
  } else if (request.sections) {
    for (const section of request.sections) {
      if (!canAccessSection(actor, section as WeddingSection)) {
        throw new ForbiddenError(`You do not have access to the "${section}" section`);
      }
    }
  }

  if (request.target && request.target.role === 'admin') {
    throw new ForbiddenError('Only admins can modify admins');
  }
}

export async function listMembers(weddingId: string): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from('wedding_members')
    .select(MEMBER_COLUMNS)
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MemberRow[];
}

export async function inviteMember(
  actor: AuthenticatedUser,
  email: string,
  role: 'admin' | 'editor' | 'viewer',
  sections?: string[] | null,
  permissions?: string[],
): Promise<MemberRow & { email_sent: boolean }> {
  assertCanGrant(actor, { role, sections, permissions });

  const weddingId = getActorWeddingId(actor);
  const invitedEmail = email.toLowerCase().trim();

  const { data: weddingRow } = await supabase
    .from('weddings')
    .select('id, title, owner:users!owner_id(email)')
    .eq('id', weddingId)
    .single();
  const ownerEmail = (weddingRow?.owner as unknown as { email: string } | null)?.email;
  if (ownerEmail === invitedEmail) {
    throw new BadRequestError('They already have full access to this wedding');
  }

  const { data: existingRows } = await supabase
    .from('wedding_members')
    .select('id, status')
    .eq('wedding_id', weddingId)
    .eq('invited_email', invitedEmail)
    .limit(1);
  const existing = existingRows?.[0];
  if (existing && existing.status === 'active') {
    throw new ConflictError('This person is already a member');
  }

  const token = randomBytes(32).toString('hex');
  // Admins always have full access; sections/permissions only constrain editors/viewers
  const allowed_sections = role === 'admin' ? null : (sections ?? null);
  const grantedPermissions = role === 'admin' ? [] : (permissions ?? []);

  // A still-pending invite gets a fresh token and a new email (resend) instead
  // of erroring — otherwise one failed/lost email leaves the invite stuck forever
  const query = existing
    ? supabase
        .from('wedding_members')
        .update({
          role,
          allowed_sections,
          permissions: grantedPermissions,
          token_hash: hashToken(token),
        })
        .eq('id', existing.id)
    : supabase.from('wedding_members').insert({
        wedding_id: weddingId,
        invited_email: invitedEmail,
        role,
        allowed_sections,
        permissions: grantedPermissions,
        status: 'pending',
        token_hash: hashToken(token),
      });

  const { data, error } = await query.select(MEMBER_COLUMNS).single();
  if (error) throw error;

  // The invite row is already written — an SMTP failure must not surface as a
  // 500 that makes the admin think nothing happened. Report it so the UI can
  // offer a resend (re-inviting the same email refreshes the token).
  const link = `${env.FRONTEND_URL ?? ''}/accept-invite?token=${token}`;
  const inviterName = actor.name || 'Someone';
  let emailSent = true;
  try {
    await sendEmail({ to: email, ...inviteEmail({ inviterName, role, link }) });
  } catch (err) {
    console.error('[mailer] invite email failed:', err);
    emailSent = false;
  }

  return { ...(data as MemberRow), email_sent: emailSent };
}

export interface PendingInviteRow {
  id: string;
  wedding_id: string;
  role: 'admin' | 'editor' | 'viewer';
  allowed_sections: string[] | null;
  created_at: string;
  wedding: { title: string; slug: string | null } | null;
}

/**
 * Invites addressed to this email that haven't been accepted yet — lets an
 * account created without an invite link (collaborator signup) still find
 * invites that were waiting for them, or arrive later.
 */
export async function listPendingInvitesForEmail(email: string): Promise<PendingInviteRow[]> {
  const { data, error } = await supabase
    .from('wedding_members')
    .select(
      'id, wedding_id, role, allowed_sections, created_at, wedding:weddings!wedding_id(title, slug)',
    )
    .eq('invited_email', email.toLowerCase().trim())
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PendingInviteRow[];
}

/** True when the wedding belongs to this user — an invite to it is redundant. */
async function isWeddingOwner(weddingId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('weddings')
    .select('id')
    .eq('id', weddingId)
    .eq('owner_id', userId)
    .maybeSingle();
  return Boolean(data);
}

async function findMemberWedding(weddingId: string): Promise<MemberWeddingInfo> {
  const { data } = await supabase
    .from('weddings')
    .select('id, slug, title')
    .eq('id', weddingId)
    .single();
  return (data as MemberWeddingInfo | null) ?? { id: weddingId, slug: null, title: 'Wedding' };
}

/**
 * Accept a pending invite by row id, authorised by email match instead of the
 * emailed token. The email must be verified — otherwise anyone could register
 * an unverified account with a planner's address and inherit their invites.
 */
export async function acceptPendingInvite(
  user: { id: string; email: string; emailVerified: boolean },
  inviteId: string,
): Promise<MemberRow & { wedding: MemberWeddingInfo }> {
  if (!user.emailVerified) {
    throw new BadRequestError('Verify your email address first, then accept the invite');
  }

  const { data: row, error } = await supabase
    .from('wedding_members')
    .select(MEMBER_COLUMNS)
    .eq('id', inviteId)
    .eq('invited_email', user.email.toLowerCase().trim())
    .eq('status', 'pending')
    .maybeSingle();
  if (error || !row) throw new NotFoundError('This invite is invalid or has already been used');

  if (await isWeddingOwner(row.wedding_id, user.id)) {
    throw new BadRequestError('This is an invite to your own wedding');
  }

  const { data: updated, error: updateError } = await supabase
    .from('wedding_members')
    .update({ member_id: user.id, status: 'active' })
    .eq('id', row.id)
    .select(MEMBER_COLUMNS)
    .single();
  if (updateError) throw updateError;

  // Deliberately NOT switching active_wedding_id here — accepting an invite
  // must never silently yank someone out of the wedding they're working on.
  // The caller gets the wedding back and offers the switch explicitly.
  invalidateAuthCache();

  return { ...(updated as MemberRow), wedding: await findMemberWedding(row.wedding_id) };
}

/**
 * Decline (delete) a pending invite addressed to this user's email. Requires a
 * verified email for the same reason accepting does — an unverified squatter
 * account must not be able to make someone else's invites disappear.
 */
export async function declinePendingInvite(
  user: { email: string; emailVerified: boolean },
  inviteId: string,
): Promise<void> {
  if (!user.emailVerified) {
    throw new BadRequestError('Verify your email address first');
  }

  const { error, count } = await supabase
    .from('wedding_members')
    .delete({ count: 'exact' })
    .eq('id', inviteId)
    .eq('invited_email', user.email.toLowerCase().trim())
    .eq('status', 'pending');
  if (error) throw error;
  if (!count) throw new NotFoundError('This invite is invalid or has already been used');
}

/** Look up a pending invite by its raw token (register-with-invite pre-check). */
export async function findPendingInvite(
  token: string,
): Promise<{ id: string; wedding_id: string; invited_email: string } | null> {
  const { data } = await supabase
    .from('wedding_members')
    .select('id, wedding_id, invited_email')
    .eq('token_hash', hashToken(token))
    .eq('status', 'pending')
    .maybeSingle();
  return data ?? null;
}

export async function acceptInvite(
  userId: string,
  token: string,
): Promise<MemberRow & { wedding: MemberWeddingInfo }> {
  const { data: row, error } = await supabase
    .from('wedding_members')
    .select(MEMBER_COLUMNS)
    .eq('token_hash', hashToken(token))
    .eq('status', 'pending')
    .single();
  if (error || !row) throw new NotFoundError('This invite is invalid or has already been used');

  if (await isWeddingOwner(row.wedding_id, userId)) {
    throw new BadRequestError('This is an invite to your own wedding');
  }

  const { data: updated, error: updateError } = await supabase
    .from('wedding_members')
    .update({ member_id: userId, status: 'active' })
    .eq('id', row.id)
    .select(MEMBER_COLUMNS)
    .single();
  if (updateError) throw updateError;

  // Deliberately NOT switching active_wedding_id — the frontend decides
  // whether to offer the switch (it only auto-switches when the user has no
  // wedding at all, e.g. fresh invite signups).
  invalidateAuthCache();

  return { ...(updated as MemberRow), wedding: await findMemberWedding(row.wedding_id) };
}

async function loadMemberRow(weddingId: string, memberRowId: string): Promise<MemberRow> {
  const { data, error } = await supabase
    .from('wedding_members')
    .select(MEMBER_COLUMNS)
    .eq('id', memberRowId)
    .eq('wedding_id', weddingId)
    .maybeSingle();
  if (error || !data) throw new NotFoundError('Member not found');
  return data as MemberRow;
}

export async function updateMember(
  actor: AuthenticatedUser,
  memberRowId: string,
  updates: { role?: 'admin' | 'editor' | 'viewer'; sections?: string[] | null; permissions?: string[] },
): Promise<MemberRow> {
  const weddingId = getActorWeddingId(actor);
  const target = await loadMemberRow(weddingId, memberRowId);
  assertCanGrant(actor, { ...updates, target });

  const patch: Record<string, unknown> = {};
  if (updates.role !== undefined) patch.role = updates.role;
  if (updates.sections !== undefined) patch.allowed_sections = updates.sections;
  if (updates.permissions !== undefined) patch.permissions = updates.permissions;
  // An admin role wipes any section/permission restriction, whichever field changed
  if (updates.role === 'admin') {
    patch.allowed_sections = null;
    patch.permissions = [];
  }

  const { data, error } = await supabase
    .from('wedding_members')
    .update(patch)
    .eq('id', memberRowId)
    .eq('wedding_id', weddingId)
    .select(MEMBER_COLUMNS)
    .single();
  if (error || !data) throw new NotFoundError('Member not found');
  return data as MemberRow;
}

export async function removeMember(actor: AuthenticatedUser, memberRowId: string): Promise<void> {
  const weddingId = getActorWeddingId(actor);
  if (actor.role !== 'admin') {
    const target = await loadMemberRow(weddingId, memberRowId);
    assertCanGrant(actor, { target });
  }

  const { error } = await supabase
    .from('wedding_members')
    .delete()
    .eq('id', memberRowId)
    .eq('wedding_id', weddingId);
  if (error) throw error;
}
