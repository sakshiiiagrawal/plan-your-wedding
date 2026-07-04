import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { SectionHeader } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { CURRENCY_OPTIONS } from '../../utils/currency';
import {
  useUpdateProfile,
  useChangePassword,
  useDeleteAccount,
  useMembers,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  useResendVerification,
} from '../../hooks/useApi';

function MembersPanel() {
  const { data: members = [] } = useMembers();
  const inviteMember = useInviteMember();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteMember.mutateAsync({ email, role });
      toast.success('Invite sent');
      setEmail('');
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Failed to send invite');
    }
  };

  return (
    <Card title="Members">
      <form onSubmit={handleInvite} className="flex gap-2 mb-4 flex-wrap">
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
          onChange={(e) => setRole(e.target.value as 'admin' | 'editor' | 'viewer')}
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" disabled={inviteMember.isPending} className="btn-primary">
          Invite
        </button>
      </form>

      <div className="space-y-2">
        {members.length === 0 && (
          <p style={{ color: 'var(--ink-low)', fontSize: 13 }}>No members invited yet.</p>
        )}
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 text-sm">
            <div>
              <span>{m.invited_email}</span>{' '}
              <span style={{ color: 'var(--ink-low)', fontSize: 12 }}>
                ({m.status === 'pending' ? 'invite pending' : 'active'})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="input"
                style={{ width: 110, padding: '4px 8px' }}
                value={m.role}
                onChange={(e) =>
                  updateRole.mutate({ id: m.id, role: e.target.value as 'admin' | 'editor' | 'viewer' })
                }
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={() => removeMember.mutate(m.id)}
                className="btn-outline"
                style={{ padding: '4px 10px', fontSize: 12 }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
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

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [newSlug, setNewSlug] = useState(slug ?? '');
  const [currency, setCurrency] = useState(user?.currency ?? 'INR');
  const updateProfile = useUpdateProfile();

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
      const updated = await updateProfile.mutateAsync({ name, email, slug: newSlug, currency });
      toast.success('Profile updated');
      if (updated.slug && updated.slug !== slug) {
        localStorage.setItem('slug', updated.slug);
        // Full reload so AuthContext re-reads the new slug from storage
        window.location.href = `/${updated.slug}/dashboard/settings`;
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

      <MembersPanel />

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
              This permanently deletes your account and all wedding data. This cannot be undone.
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
