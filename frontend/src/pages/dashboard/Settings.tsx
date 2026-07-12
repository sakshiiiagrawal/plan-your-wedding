import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  WEDDING_SECTIONS,
  SECTION_LABELS,
  MEMBER_PERMISSIONS,
  PERMISSION_LABELS,
  can,
  canAccessSection,
  type WeddingSection,
  type MemberPermission,
} from '@wedding-planner/shared';
import { SectionHeader, Checkbox } from '../../components/ui';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatDate } from '../../utils/date';
import { useAuth } from '../../contexts/AuthContext';
import { CURRENCY_OPTIONS } from '../../utils/currency';
import {
  useUpdateProfile,
  useChangePassword,
  useDeleteAccount,
  useMembers,
  useInviteMember,
  useUpdateMember,
  useRemoveMember,
  useResendVerification,
} from '../../hooks/useApi';

type MemberRole = 'admin' | 'editor' | 'viewer';

/** Checkbox grid for limiting an editor/viewer to specific sections. */
function SectionPicker({
  value,
  onChange,
  disabledSections,
}: {
  value: string[];
  onChange: (sections: string[]) => void;
  /** Sections the acting user can't grant — rendered checked-off and disabled. */
  disabledSections?: Set<string> | undefined;
}) {
  const toggle = (section: WeddingSection) => {
    if (disabledSections?.has(section)) return;
    onChange(value.includes(section) ? value.filter((s) => s !== section) : [...value, section]);
  };

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {WEDDING_SECTIONS.map((section) => (
        <label
          key={section}
          className="flex items-center gap-1.5"
          style={{
            fontSize: 12,
            color: disabledSections?.has(section) ? 'var(--ink-dim)' : 'var(--ink-mid)',
            cursor: disabledSections?.has(section) ? 'not-allowed' : 'pointer',
          }}
        >
          <Checkbox
            checked={value.includes(section)}
            disabled={disabledSections?.has(section)}
            onChange={() => toggle(section)}
          />
          {SECTION_LABELS[section]}
        </label>
      ))}
    </div>
  );
}

/** Checkbox grid for granting fine-grained permissions (budget:splits, members:manage). */
function PermissionPicker({
  value,
  onChange,
  disabledPermissions,
  sectionsIncludeBudget,
}: {
  value: string[];
  onChange: (permissions: string[]) => void;
  /** Permissions the acting user can't grant — rendered checked-off and disabled. */
  disabledPermissions?: Set<string> | undefined;
  /** budget:splits is meaningless without budget section access. */
  sectionsIncludeBudget: boolean;
}) {
  const toggle = (permission: MemberPermission) => {
    if (disabledPermissions?.has(permission)) return;
    if (permission === 'budget:splits' && !sectionsIncludeBudget) return;
    onChange(
      value.includes(permission) ? value.filter((p) => p !== permission) : [...value, permission],
    );
  };

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {MEMBER_PERMISSIONS.map((permission) => {
        const disabled =
          disabledPermissions?.has(permission) ||
          (permission === 'budget:splits' && !sectionsIncludeBudget);
        return (
          <label
            key={permission}
            className="flex items-center gap-1.5"
            style={{
              fontSize: 12,
              color: disabled ? 'var(--ink-dim)' : 'var(--ink-mid)',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <Checkbox
              checked={value.includes(permission)}
              disabled={disabled}
              onChange={() => toggle(permission)}
            />
            {PERMISSION_LABELS[permission]}
          </label>
        );
      })}
    </div>
  );
}

const DEFAULT_INVITE_SECTIONS = WEDDING_SECTIONS.filter((s) => s !== 'budget');

function MembersPanel() {
  const { user } = useAuth();
  const isActorAdmin = user?.role === 'admin';
  // Non-admin manager: only offer controls within what they themselves hold —
  // the server enforces this too, but hiding dead-end options avoids 403s.
  const disabledSections = isActorAdmin
    ? undefined
    : new Set(WEDDING_SECTIONS.filter((s) => !canAccessSection(user, s)));
  const disabledPermissions = isActorAdmin
    ? undefined
    : new Set(MEMBER_PERMISSIONS.filter((p) => !can(user, p)));

  const { data: members = [] } = useMembers();
  const inviteMember = useInviteMember();
  const updateMember = useUpdateMember();
  const removeMember = useRemoveMember();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('viewer');
  const [sections, setSections] = useState<string[]>(
    DEFAULT_INVITE_SECTIONS as unknown as string[],
  );
  const [permissions, setPermissions] = useState<string[]>([]);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; email: string } | null>(null);

  const normalizeSections = (list: string[]): string[] | null =>
    list.length === WEDDING_SECTIONS.length ? null : list;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'admin' && sections.length === 0) {
      toast.error('Select at least one section');
      return;
    }
    try {
      const created = (await inviteMember.mutateAsync({
        email,
        role,
        sections: role === 'admin' ? null : normalizeSections(sections),
        permissions: role === 'admin' ? [] : permissions,
      })) as { email_sent?: boolean };
      if (created.email_sent === false) {
        toast.error(
          'Invite created, but the email failed to send — invite the same address again to resend.',
        );
      } else {
        toast.success('Invite sent');
      }
      setEmail('');
      setSections(DEFAULT_INVITE_SECTIONS as unknown as string[]);
      setPermissions([]);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Failed to send invite');
    }
  };

  // Re-inviting the same address refreshes the token and re-sends the email
  const handleResendInvite = async (m: {
    invited_email: string;
    role: string;
    allowed_sections: string[] | null;
    permissions: string[];
  }) => {
    try {
      const created = (await inviteMember.mutateAsync({
        email: m.invited_email,
        role: m.role,
        sections: m.allowed_sections,
        permissions: m.permissions,
      })) as { email_sent?: boolean };
      if (created.email_sent === false) {
        toast.error('The invite email failed to send — try again in a moment.');
      } else {
        toast.success('Invite email re-sent');
      }
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Failed to resend the invite');
    }
  };

  return (
    <Card title="Members & collaborators">
      <p style={{ color: 'var(--ink-low)', fontSize: 13, marginBottom: 16 }}>
        Invite your partner as an <b>admin</b> so you both manage the same wedding. Invite a wedding
        planner or family as <b>editor</b> (can make changes) or <b>viewer</b> (read-only) —
        optionally limited to just the sections they need.
      </p>

      <form onSubmit={handleInvite} className="mb-5 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <input
            className="input flex-1"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <select
            className="input"
            style={{ width: 120 }}
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            {isActorAdmin && <option value="admin">Admin</option>}
          </select>
          <button type="submit" disabled={inviteMember.isPending} className="btn-primary">
            {inviteMember.isPending ? 'Sending...' : 'Invite'}
          </button>
        </div>
        {role !== 'admin' && (
          <div className="space-y-3">
            <div>
              <p style={{ fontSize: 12, color: 'var(--ink-mid)', marginBottom: 4 }}>
                Sections this person can access
              </p>
              <SectionPicker
                value={sections}
                onChange={setSections}
                disabledSections={disabledSections}
              />
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'var(--ink-mid)', marginBottom: 4 }}>
                Extra permissions
              </p>
              <PermissionPicker
                value={permissions}
                onChange={setPermissions}
                disabledPermissions={disabledPermissions}
                sectionsIncludeBudget={sections.includes('budget')}
              />
            </div>
          </div>
        )}
      </form>

      <div className="space-y-3">
        {members.length === 0 && (
          <p style={{ color: 'var(--ink-low)', fontSize: 13 }}>No members invited yet.</p>
        )}
        {members.map((m) => {
          // A non-admin manager can't touch admin rows — the server 403s it,
          // so don't offer edit/remove controls that would just fail.
          const targetIsUntouchableAdmin = !isActorAdmin && m.role === 'admin';
          return (
            <div
              key={m.id}
              style={{
                border: '1px solid var(--line-soft)',
                borderRadius: 8,
                padding: '10px 12px',
              }}
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <div style={{ minWidth: 0 }}>
                  <span>{m.invited_email}</span>{' '}
                  <span style={{ color: 'var(--ink-low)', fontSize: 12 }}>
                    {m.status === 'pending'
                      ? `(invited ${formatDate(m.created_at, { month: 'short', day: 'numeric' })} · not accepted yet)`
                      : '(active)'}
                  </span>
                </div>
                {targetIsUntouchableAdmin ? (
                  <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>Admin</span>
                ) : (
                  <div className="flex items-center gap-2">
                    {m.status === 'pending' && (
                      <button
                        onClick={() => handleResendInvite(m)}
                        disabled={inviteMember.isPending}
                        className="btn-outline"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                      >
                        Resend
                      </button>
                    )}
                    <select
                      className="input"
                      style={{ width: 110, padding: '4px 8px' }}
                      value={m.role}
                      onChange={(e) => updateMember.mutate({ id: m.id, role: e.target.value })}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      {isActorAdmin && <option value="admin">Admin</option>}
                    </select>
                    <button
                      onClick={() => setMemberToRemove({ id: m.id, email: m.invited_email })}
                      className="btn-outline"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              {m.role !== 'admin' && (
                <div style={{ marginTop: 8 }}>
                  <label
                    className="flex items-center gap-1.5 mb-1.5"
                    style={{ fontSize: 12, color: 'var(--ink-mid)', cursor: 'pointer' }}
                  >
                    <Checkbox
                      checked={m.allowed_sections !== null}
                      onChange={(e) =>
                        updateMember.mutate({
                          id: m.id,
                          sections: e.target.checked ? [...WEDDING_SECTIONS] : null,
                        })
                      }
                    />
                    Limit access to specific sections
                  </label>
                  {m.allowed_sections !== null && (
                    <SectionPicker
                      value={m.allowed_sections}
                      onChange={(next) => {
                        if (next.length === 0) {
                          toast.error('Keep at least one section, or turn off the limit');
                          return;
                        }
                        updateMember.mutate({ id: m.id, sections: next });
                      }}
                      disabledSections={disabledSections}
                    />
                  )}
                  <p style={{ fontSize: 12, color: 'var(--ink-mid)', margin: '10px 0 4px' }}>
                    Extra permissions
                  </p>
                  <PermissionPicker
                    value={m.permissions}
                    onChange={(next) => updateMember.mutate({ id: m.id, permissions: next })}
                    disabledPermissions={disabledPermissions}
                    sectionsIncludeBudget={
                      m.allowed_sections === null || m.allowed_sections.includes('budget')
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={memberToRemove !== null}
        title="Remove member?"
        message={`${memberToRemove?.email ?? ''} will immediately lose access to this wedding. You can invite them again later.`}
        confirmLabel="Remove"
        isPending={removeMember.isPending}
        onConfirm={() => {
          if (!memberToRemove) return;
          removeMember.mutate(memberToRemove.id, {
            onSettled: () => setMemberToRemove(null),
          });
        }}
        onCancel={() => setMemberToRemove(null)}
      />
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--line-soft)',
        borderRadius: 12,
        padding: 24,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-high)', marginBottom: 16 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  // Working on someone else's wedding: the slug/currency shown belong to that
  // wedding, and member management is the owner's (admins') business.
  const onOwnWedding = !user?.ownerId || user.ownerId === user.id;
  const canManageMembers = can(user, 'members:manage');

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [newSlug, setNewSlug] = useState(slug ?? '');
  const [currency, setCurrency] = useState(user?.currency ?? 'INR');
  const updateProfile = useUpdateProfile();

  const [emailDigest, setEmailDigest] = useState(user?.reminderPrefs?.email_digest !== false);
  const [paymentLeadDays, setPaymentLeadDays] = useState(
    user?.reminderPrefs?.payment_lead_days ?? 7,
  );

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const changePassword = useChangePassword();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteAccount = useDeleteAccount();
  const resendVerification = useResendVerification();

  const handleResendVerification = async () => {
    try {
      await resendVerification.mutateAsync();
      toast.success('Verification email sent — check your inbox.');
    } catch {
      toast.error('Failed to send verification email');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // On someone else's wedding the slug/currency fields are hidden AND
      // omitted here — newSlug holds that wedding's slug, not this user's.
      const updated = await updateProfile.mutateAsync(
        onOwnWedding ? { name, email, slug: newSlug, currency } : { name, email },
      );
      toast.success('Profile updated');
      if (updated.slug && updated.slug !== slug) {
        localStorage.setItem('slug', updated.slug);
        // Full reload so AuthContext re-reads the new slug from storage
        window.location.href = `/${updated.slug}/dashboard/settings`;
      } else if (updated.email_verified === false && user?.emailVerified !== false) {
        // Email changed → the address is unverified again. Reload so AuthContext
        // picks up the flag and the verify banner (with its resend button) shows —
        // the banner also covers the case where the verification email failed to send.
        window.location.reload();
      } else if (updated.currency && updated.currency !== user?.currency) {
        // Full reload so AuthContext (and every money display) picks up the change
        window.location.reload();
      }
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await changePassword.mutateAsync({ oldPassword, newPassword });
      toast.success('Password changed');
      setOldPassword('');
      setNewPassword('');
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Failed to change password');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount.mutateAsync();
      logout();
      navigate('/');
    } catch {
      toast.error('Failed to delete account');
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Account"
        title="Settings"
        description="Manage your profile, password, and account."
      />

      <Card title="Profile">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {onOwnWedding && (
            <>
              <div>
                <label className="label">Wedding URL</label>
                <input
                  className="input"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Currency</label>
                <select
                  className="input"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <button type="submit" disabled={updateProfile.isPending} className="btn-primary">
            {updateProfile.isPending ? 'Saving...' : 'Save changes'}
          </button>
        </form>
        {user?.emailVerified === false && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span>Your email address isn&apos;t verified yet.</span>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendVerification.isPending}
              className="font-medium underline whitespace-nowrap disabled:opacity-50"
            >
              {resendVerification.isPending ? 'Sending...' : 'Resend email'}
            </button>
          </div>
        )}
      </Card>

      <Card title="Reminders">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await updateProfile.mutateAsync({
                reminder_prefs: { email_digest: emailDigest, payment_lead_days: paymentLeadDays },
              });
              toast.success('Reminder settings saved');
            } catch {
              toast.error('Failed to save reminder settings');
            }
          }}
          className="space-y-4"
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={emailDigest}
              onChange={(e) => setEmailDigest(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>
              <span style={{ display: 'block', fontSize: 14, color: 'var(--ink-high)' }}>
                Daily email digest
              </span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-dim)' }}>
                One morning email with anything overdue, due, or coming up.
              </span>
            </span>
          </label>
          <div>
            <label className="label">Payment heads-up</label>
            <select
              className="input"
              value={paymentLeadDays}
              onChange={(e) => setPaymentLeadDays(Number(e.target.value))}
            >
              <option value={7}>1 week before due</option>
              <option value={3}>3 days before due</option>
              <option value={1}>1 day before due</option>
            </select>
          </div>
          <button type="submit" disabled={updateProfile.isPending} className="btn-primary">
            {updateProfile.isPending ? 'Saving...' : 'Save reminder settings'}
          </button>
        </form>
      </Card>

      {/* Member management needs members:manage (admins hold it implicitly); the API enforces the same */}
      {canManageMembers && <MembersPanel />}

      <Card title="Change password">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input
              className="input"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              className="input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <button type="submit" disabled={changePassword.isPending} className="btn-primary">
            {changePassword.isPending ? 'Updating...' : 'Change password'}
          </button>
        </form>
      </Card>

      <Card title="Danger zone">
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} className="btn-outline text-red-600">
            Delete account
          </button>
        ) : (
          <div className="space-y-3">
            <p style={{ color: 'var(--err)', fontSize: 13 }}>
              This permanently deletes your account and any wedding data you own (collaborators lose
              access to it). Weddings you collaborate on are not deleted — you just leave them. This
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-outline">
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteAccount.isPending}
                className="btn-primary"
                style={{ background: 'var(--err)' }}
              >
                {deleteAccount.isPending ? 'Deleting...' : 'Yes, delete my account'}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
