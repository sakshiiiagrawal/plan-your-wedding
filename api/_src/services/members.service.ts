import { randomBytes } from 'crypto';
import { supabase } from '../config/database';
import { env } from '../config/env';
import { sendEmail } from './mailer';
import { NotFoundError, ConflictError } from '../shared/errors/HttpError';
import { hashToken } from '../shared/utils/token.utils';

export interface MemberRow {
  id: string;
  owner_id: string;
  member_id: string | null;
  invited_email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'pending' | 'active';
  created_at: string;
}

export async function listMembers(ownerId: string): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from('wedding_members')
    .select('id, owner_id, member_id, invited_email, role, status, created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MemberRow[];
}

export async function inviteMember(
  ownerId: string,
  email: string,
  role: 'admin' | 'editor' | 'viewer',
): Promise<MemberRow> {
  const invitedEmail = email.toLowerCase().trim();
  const { data: existingRows } = await supabase
    .from('wedding_members')
    .select('id, status')
    .eq('owner_id', ownerId)
    .eq('invited_email', invitedEmail)
    .limit(1);
  const existing = existingRows?.[0];
  if (existing && existing.status === 'active') {
    throw new ConflictError('This person is already a member');
  }

  const token = randomBytes(32).toString('hex');

  // A still-pending invite gets a fresh token and a new email (resend) instead
  // of erroring — otherwise one failed/lost email leaves the invite stuck forever
  const query = existing
    ? supabase
        .from('wedding_members')
        .update({ role, token_hash: hashToken(token) })
        .eq('id', existing.id)
    : supabase.from('wedding_members').insert({
        owner_id: ownerId,
        invited_email: invitedEmail,
        role,
        status: 'pending',
        token_hash: hashToken(token),
      });

  const { data, error } = await query
    .select('id, owner_id, member_id, invited_email, role, status, created_at')
    .single();
  if (error) throw error;

  const link = `${env.FRONTEND_URL ?? ''}/accept-invite?token=${token}`;
  await sendEmail({
    to: email,
    subject: "You've been invited to help plan a wedding",
    html: `<p>You've been invited as a <b>${role}</b>. Click below to accept:</p><p><a href="${link}">${link}</a></p>`,
  });

  return data as MemberRow;
}

export async function acceptInvite(userId: string, token: string): Promise<MemberRow> {
  const { data: row, error } = await supabase
    .from('wedding_members')
    .select('id, owner_id, member_id, invited_email, role, status, created_at')
    .eq('token_hash', hashToken(token))
    .eq('status', 'pending')
    .single();
  if (error || !row) throw new NotFoundError('This invite is invalid or has already been used');

  const { data: updated, error: updateError } = await supabase
    .from('wedding_members')
    .update({ member_id: userId, status: 'active' })
    .eq('id', row.id)
    .select('id, owner_id, member_id, invited_email, role, status, created_at')
    .single();
  if (updateError) throw updateError;

  // Accepting is an explicit "take me into this wedding" — switch their active
  // wedding to it. They can switch back to their own via the wedding switcher.
  await supabase.from('users').update({ active_owner_id: row.owner_id }).eq('id', userId);

  return updated as MemberRow;
}

export async function updateMemberRole(
  ownerId: string,
  memberRowId: string,
  role: 'admin' | 'editor' | 'viewer',
): Promise<MemberRow> {
  const { data, error } = await supabase
    .from('wedding_members')
    .update({ role })
    .eq('id', memberRowId)
    .eq('owner_id', ownerId)
    .select('id, owner_id, member_id, invited_email, role, status, created_at')
    .single();
  if (error || !data) throw new NotFoundError('Member not found');
  return data as MemberRow;
}

export async function removeMember(ownerId: string, memberRowId: string): Promise<void> {
  const { error } = await supabase
    .from('wedding_members')
    .delete()
    .eq('id', memberRowId)
    .eq('owner_id', ownerId);
  if (error) throw error;
}
