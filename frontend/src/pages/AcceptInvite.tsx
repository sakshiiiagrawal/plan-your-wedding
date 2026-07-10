import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useAcceptInvite } from '../hooks/useApi';

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
  const { isAuthenticated, loading, register, refresh } = useAuth();
  const acceptInvite = useAcceptInvite();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'error'>('pending');
  // StrictMode runs effects twice in dev; the second accept would find the
  // invite already consumed and falsely report it invalid.
  const fired = useRef(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const goToDashboard = (slug: string | null | undefined) => {
    navigate(slug ? `/${slug}/dashboard` : '/invites', { replace: true });
  };

  // Already signed in: accept straight away and enter the wedding
  useEffect(() => {
    if (loading || !token || !isAuthenticated || fired.current) return;
    fired.current = true;

    acceptInvite.mutate(token, {
      onSuccess: async () => {
        toast.success("You're in! Welcome aboard.");
        // Accepting switched the active wedding server-side; re-resolve the
        // session so the slug/role point at the new wedding before navigating.
        const me = await refresh();
        goToDashboard(me?.slug);
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

        {token && isAuthenticated && status === 'pending' && (
          <p className="text-gray-600 text-center">Accepting invite...</p>
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
