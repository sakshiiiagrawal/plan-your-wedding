import { useState } from 'react';
import { useSearchParams, Navigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { SECTION_LABELS, type WeddingSection } from '@wedding-planner/shared';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import {
  usePendingInvites,
  useAcceptPendingInvite,
  useDeclinePendingInvite,
  useResendVerification,
  useSetActiveWedding,
  useWeddings,
  type WeddingOption,
} from '../hooks/useApi';

/**
 * The workspace hub: every wedding you own or collaborate on, pending invites
 * addressed to your email, and the door to creating a new wedding. Home for
 * accounts that aren't inside a wedding yet; reachable any time from the
 * dashboard switcher.
 */
export default function Hub() {
  const { user, isAuthenticated, loading, slug, refresh, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const fromPartnerSignup = searchParams.get('partner') === '1';
  // The hub is a deliberate "manage weddings / see invites" destination — the
  // switcher and old /invites links arrive with ?manage=1. A plain visit
  // (bookmark, marketing redirect, a stray /hub) from someone who already has
  // an active workspace should drop them straight into it, never onto this
  // list. partner=1 is an explicit "waiting for my invite" landing too.
  const wantsHub = searchParams.get('manage') === '1' || fromPartnerSignup;
  const { data: invites = [], isLoading, isFetching, refetch } = usePendingInvites(isAuthenticated);
  const { data: weddingData } = useWeddings();
  const acceptPending = useAcceptPendingInvite();
  const declinePending = useDeclinePendingInvite();
  const resendVerification = useResendVerification();
  const setActiveWedding = useSetActiveWedding();
  const [inviteToDecline, setInviteToDecline] = useState<{ id: string; label: string } | null>(
    null,
  );

  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to={`/login?next=${encodeURIComponent('/hub')}`} replace />;
  }
  // slug is the resolved active-workspace slug (from /auth/me, cached in
  // localStorage) — present the instant a returning collaborator loads, so
  // this redirect fires before the hub ever paints. No active workspace →
  // slug is null and the hub renders as the create-or-join home.
  if (slug && !wantsHub) {
    return <Navigate to={`/${slug}/dashboard`} replace />;
  }

  const emailVerified = user?.emailVerified !== false;
  const weddings = weddingData?.weddings ?? [];
  const owned = weddings.filter((w) => w.isOwner);
  const shared = weddings.filter((w) => !w.isOwner);

  const openWedding = async (w: WeddingOption) => {
    if (w.slug) {
      // useSetActiveWedding reloads the page; land directly on the dashboard.
      window.history.replaceState(null, '', `/${w.slug}/dashboard`);
    }
    setActiveWedding.mutate(w.id);
  };

  const handleAccept = async (id: string) => {
    try {
      const { wedding } = await acceptPending.mutateAsync(id);
      // No wedding yet → this one becomes theirs, jump straight in. Otherwise
      // stay put: the wedding lands in "Shared with you" and opening it is an
      // explicit click, never a silent switch.
      if (weddings.length === 0 && wedding?.slug) {
        toast.success("You're in! Welcome aboard.");
        window.history.replaceState(null, '', `/${wedding.slug}/dashboard`);
        setActiveWedding.mutate(wedding.id);
      } else {
        toast.success(`You joined ${wedding?.title ?? 'the wedding'} — open it below.`);
        await refresh();
      }
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

  const weddingCard = (w: WeddingOption) => {
    const isCurrent = w.id === weddingData?.activeWeddingId;
    return (
      <button
        key={w.id}
        onClick={() => openWedding(w)}
        disabled={setActiveWedding.isPending}
        className="group w-full flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 text-left transition-all hover:border-gold-300 hover:shadow-md disabled:opacity-50"
      >
        <span className="w-10 h-10 rounded-lg bg-gold-50 border border-gold-100 text-gold-700 font-display font-semibold text-lg flex items-center justify-center shrink-0">
          {(w.title.trim().charAt(0) || 'W').toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-medium text-gray-800 truncate">{w.title}</span>
            {isCurrent && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gold-700 bg-gold-50 rounded-full px-2 py-0.5 shrink-0">
                Current
              </span>
            )}
          </span>
          <span className="block text-xs text-gray-500 truncate">
            {w.slug ? `/${w.slug}` : 'No public site yet'}
            {!w.isOwner && (
              <>
                {' · '}
                <span className="capitalize">{w.role}</span>
              </>
            )}
          </span>
        </span>
        <span className="text-sm font-medium text-maroon-700 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
          Open →
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-800 via-maroon-700 to-gold-600 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-display font-bold text-maroon-800 text-center mb-1">
          Your weddings
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Signed in as <b>{user?.email}</b>
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

        {/* Owned weddings + create */}
        {shared.length > 0 && (
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Yours</p>
        )}
        <div className="space-y-3 mb-6">
          {owned.map(weddingCard)}
          {owned.length === 0 && weddings.length === 0 && !fromPartnerSignup && (
            <p className="text-gray-600 text-sm text-center">
              You haven&apos;t set up a wedding yet — it takes two minutes.
            </p>
          )}
          <Link
            to="/weddings/new"
            className="block w-full text-center border-2 border-dashed border-gold-300 rounded-xl px-4 py-3 text-sm font-medium text-maroon-700 hover:border-gold-500 hover:bg-cream transition-colors"
          >
            + Plan a new wedding
          </Link>
        </div>

        {/* Weddings shared with this account */}
        {shared.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Shared with you</p>
            <div className="space-y-3">{shared.map(weddingCard)}</div>
          </div>
        )}

        {/* Pending invites */}
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Invitations</p>
        {isLoading && <p className="text-gray-500 text-sm">Loading…</p>}

        {!isLoading && invites.length === 0 && (
          <div className="space-y-2 mb-2">
            <p className="text-gray-500 text-sm">
              {fromPartnerSignup ? (
                <>
                  Ask your partner to invite you from Settings → Members using <b>{user?.email}</b>{' '}
                  — the invite will appear here.
                </>
              ) : (
                <>
                  No invites yet. Invites sent to <b>{user?.email}</b> show up here.
                </>
              )}
            </p>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-sm text-maroon-700 hover:underline disabled:opacity-50"
            >
              {isFetching ? 'Checking…' : 'Check again'}
            </button>
          </div>
        )}

        <div className="space-y-3">
          {invites.map((invite) => (
            <div key={invite.id} className="border border-gray-200 rounded-xl p-4">
              <p className="font-medium text-gray-800">
                {invite.wedding?.title || 'A wedding'}
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
                  {acceptPending.isPending ? 'Accepting...' : 'Accept'}
                </button>
                <button
                  onClick={() =>
                    setInviteToDecline({
                      id: invite.id,
                      label: invite.wedding?.title || 'this wedding',
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

        <p className="mt-6 text-center text-sm text-gray-500">
          <button onClick={() => logout()} className="hover:underline">
            Log out
          </button>
        </p>
      </div>
    </div>
  );
}
