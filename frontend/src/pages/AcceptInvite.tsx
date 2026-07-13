import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import {
  useAcceptInvite,
  useSetActiveWedding,
  type AcceptedInviteWedding,
} from '../hooks/useApi';

/**
 * Landing page for invite emails. Three cases:
 *  - logged in → accept immediately, then jump into the wedding's dashboard
 *  - no account → lightweight signup (no wedding/slug of their own) that
 *    registers with the invite token, which activates the membership server-side
 *  - has an account but logged out → link to login that returns here after
 */
export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { user, isAuthenticated, loading, register, refresh } = useAuth();
  const acceptInvite = useAcceptInvite();
  const setActiveWedding = useSetActiveWedding();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'error'>('pending');
  // Set when the user already had an active wedding: joining must never
  // silently switch them, so we ask instead.
  const [joined, setJoined] = useState<AcceptedInviteWedding | null>(null);
  // StrictMode runs effects twice in dev; the second accept would find the
  // invite already consumed and falsely report it invalid.
  const fired = useRef(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const goToDashboard = (slug: string | null | undefined) => {
    navigate(slug ? `/${slug}/dashboard` : '/hub', { replace: true });
  };

  const openJoinedWedding = (wedding: AcceptedInviteWedding) => {
    // useSetActiveWedding reloads on success; point the URL at the new
    // wedding's dashboard first so the reload lands there.
    if (wedding.slug) window.history.replaceState(null, '', `/${wedding.slug}/dashboard`);
    setActiveWedding.mutate(wedding.id);
  };

  // Already signed in: accept straight away
  useEffect(() => {
    if (loading || !token || !isAuthenticated || fired.current) return;
    fired.current = true;

    const hadWedding = Boolean(user?.weddingId);
    acceptInvite.mutate(token, {
      onSuccess: ({ wedding }) => {
        toast.success("You're in! Welcome aboard.");
        // No wedding before this → the new one is simply theirs, jump in.
        // Otherwise stay put and offer the switch explicitly below.
        if (!hadWedding) openJoinedWedding(wedding);
        else setJoined(wedding);
      },
      onError: () => setStatus('error'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated, token]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { slug } = await register({ name, email, password, inviteToken: token });
      toast.success('Account created — welcome aboard!');
      goToDashboard(slug);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Could not create your account');
    } finally {
      setSubmitting(false);
    }
  };

  const loginHref = `/login?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-800 via-maroon-700 to-gold-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        {!token && (
          <p className="text-gray-600 text-center">This invite link is missing its token.</p>
        )}

        {token && isAuthenticated && status === 'pending' && !joined && (
          <p className="text-gray-600 text-center">Accepting invite...</p>
        )}

        {joined && (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-display font-bold text-maroon-800">
              You&apos;ve joined {joined.title}
            </h1>
            <p className="text-sm text-gray-500">
              You&apos;re currently working on <b>{user?.weddingTitle ?? 'your wedding'}</b>.
              Switch now, or keep going — {joined.title} stays in your wedding switcher.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => openJoinedWedding(joined)}
                disabled={setActiveWedding.isPending}
                className="btn-primary px-6 py-3 disabled:opacity-50"
              >
                Open {joined.title} →
              </button>
              <button
                onClick={async () => {
                  await refresh();
                  goToDashboard(user?.slug);
                }}
                className="btn-secondary px-6 py-3"
              >
                Keep working on {user?.weddingTitle ?? 'my wedding'}
              </button>
            </div>
          </div>
        )}

        {token && status === 'error' && (
          <div className="text-center space-y-3">
            <p className="text-red-600">This invite is invalid or has already been used.</p>
            <p className="text-sm text-gray-500">
              Ask the couple to send a fresh invite from their dashboard settings.
            </p>
          </div>
        )}

        {token && !loading && !isAuthenticated && status === 'pending' && (
          <>
            <h1 className="text-2xl font-display font-bold text-maroon-800 text-center mb-1">
              You&apos;re invited!
            </h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              Create an account to join this wedding — you won&apos;t need to set up a wedding of
              your own.
            </p>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="label">Your name</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="The address the invite was sent to"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Use the address the invite was sent to — a different one works too, but
                  you&apos;ll need to verify it before future invites appear automatically.
                </p>
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-3 disabled:opacity-50"
              >
                {submitting ? 'Joining...' : 'Create account & join'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link to={loginHref} className="text-maroon-700 font-medium hover:underline">
                Log in to accept
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
