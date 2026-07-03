import { randomBytes, createHash } from 'crypto';
import { supabase } from '../config/database';
import { env } from '../config/env';
import { sendEmail } from './mailer';
import { NotFoundError, ConflictError } from '../shared/errors/HttpError';

export interface MemberRow {
  id: string;
  owner_id: string;
  member_id: string | null;
  invited_email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'pending' | 'active';
  created_at: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
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
  const { data: existing } = await supabase
    .from('wedding_members')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('invited_email', email.toLowerCase().trim())
    .limit(1);
  if (existing && existing.length > 0) {
    throw new ConflictError('This person has already been invited');
  }

  const token = randomBytes(32).toString('hex');

  const { data, error } = await supabase
    .from('wedding_members')
    .insert({
      owner_id: ownerId,
      invited_email: email.toLowerCase().trim(),
      role,
      status: 'pending',
      token_hash: hashToken(token),
    })
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
