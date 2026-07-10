import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { SECTION_LABELS, type WeddingSection } from '@wedding-planner/shared';
import api from '../api/axios';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import {
  usePendingInvites,
  useAcceptPendingInvite,
  useDeclinePendingInvite,
  useResendVerification,
  useWeddings,
} from '../hooks/useApi';

/**
 * Home for accounts that aren't inside a wedding yet (collaborator signups)
 * and for anyone with invites waiting on their email. Accepting from here is
 * authorised by email match, so the email must be verified first.
 */
export default function PendingInvites() {
  const { user, isAuthenticated, loading, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const { data: invites = [], isLoading, isFetching, refetch } = usePendingInvites(isAuthenticated);
  const { data: weddingData } = useWeddings();
  const acceptPending = useAcceptPendingInvite();
  const declinePending = useDeclinePendingInvite();
  const resendVerification = useResendVerification();
  const [inviteToDecline, setInviteToDecline] = useState<{ id: string; label: string } | null>(
    null,
  );

  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to={`/login?next=${encodeURIComponent('/invites')}`} replace />;
  }

  const emailVerified = user?.emailVerified !== false;
  const weddings = weddingData?.weddings ?? [];

  const handleAccept = async (id: string) => {
    try {
      await acceptPending.mutateAsync(id);
      toast.success("You're in! Welcome aboard.");
      const me = await refresh();
      navigate(me?.slug ? `/${me.slug}/dashboard` : '/invites', { replace: true });
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Could not accept the invite');
    }
  };

  const handleResend = async () => {
    try {
      await resendVerification.mutateAsync();
      toast.success('Verification email sent — check your inbox.');
    } catch {
      toast.error('Failed to send verification email');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-800 via-maroon-700 to-gold-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-display font-bold text-maroon-800 text-center mb-1">
          Wedding invites
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Invites sent to <b>{user?.email}</b> show up here.
        </p>

        {!emailVerified && (
          <div className="mb-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="mb-1">Verify your email to accept invites.</p>
            <button
              onClick={handleResend}
              disabled={resendVerification.isPending}
              className="font-medium underline disabled:opacity-50"
            >
              {resendVerification.isPending ? 'Sending...' : 'Resend verification email'}
            </button>
          </div>
        )}

        {isLoading && <p className="text-gray-500 text-sm text-center">Loading…</p>}

        {!isLoading && invites.length === 0 && (
          <div className="text-center space-y-3">
            <p className="text-gray-600 text-sm">No invites yet.</p>
            <p className="text-gray-500 text-sm">
              Ask the couple to invite <b>{user?.email}</b> from their dashboard (Settings →
              Members).
            </p>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="btn-outline px-5 py-2 text-sm disabled:opacity-50"
            >
              {isFetching ? 'Checking…' : 'Check again'}
            </button>
          </div>
        )}

        <div className="space-y-3">
          {invites.map((invite) => (
            <div key={invite.id} className="border border-gray-200 rounded-xl p-4">
              <p className="font-medium text-gray-800">
                {invite.owner?.name || invite.owner?.slug || 'A wedding'}
              </p>
              <p className="text-xs text-gray-500 mb-1">
                Role: <b>{invite.role}</b>
                {invite.allowed_sections && (
                  <>
                    {' · '}
                    {invite.allowed_sections
                      .map((s) => SECTION_LABELS[s as WeddingSection] ?? s)
                      .join(', ')}
                  </>
                )}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => handleAccept(invite.id)}
                  disabled={!emailVerified || acceptPending.isPending}
                  className="btn-primary px-6 py-2 text-sm disabled:opacity-50"
                >
                  {acceptPending.isPending ? 'Accepting...' : 'Accept & open'}
                </button>
                <button
                  onClick={() =>
                    setInviteToDecline({
                      id: invite.id,
                      label: invite.owner?.name || invite.owner?.slug || 'this wedding',
                    })
                  }
                  disabled={!emailVerified || declinePending.isPending}
                  className="text-sm text-gray-500 hover:text-red-600 hover:underline disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>

        <ConfirmDialog
          open={inviteToDecline !== null}
          title="Decline invite?"
          message={`The invite to ${inviteToDecline?.label ?? ''} will be removed. The couple can always invite you again.`}
          confirmLabel="Decline"
          isPending={declinePending.isPending}
          onConfirm={() => {
            if (!inviteToDecline) return;
            declinePending.mutate(inviteToDecline.id, {
              onSuccess: () => toast.success('Invite declined'),
              onError: () => toast.error('Could not decline the invite'),
              onSettled: () => setInviteToDecline(null),
            });
          }}
          onCancel={() => setInviteToDecline(null)}
        />

        {weddings.length > 0 && (
          <div className="mt-6 pt-5 border-t border-gray-100 space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Your weddings</p>
            {weddings.map((w) => (
              <button
                key={w.ownerId}
                onClick={async () => {
                  try {
                    await api.post('/auth/active-wedding', { ownerId: w.ownerId });
                    const me = await refresh();
                    if (me?.slug) navigate(`/${me.slug}/dashboard`);
                  } catch {
                    toast.error('Could not open that wedding');
                  }
                }}
                className="block text-sm text-maroon-700 hover:underline"
              >
                {w.label}
                {w.isOwn ? ' (mine)' : ` · ${w.role}`} →
              </button>
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          <button onClick={() => logout()} className="hover:underline">
            Log out
          </button>
        </p>
      </div>
    </div>
  );
}
