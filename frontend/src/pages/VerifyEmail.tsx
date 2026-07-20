import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { weddingHref } from '../utils/tenant';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useResendVerification, useVerifyEmail } from '../hooks/useApi';
import AuthShell from '../components/ui/AuthShell';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const verifyEmail = useVerifyEmail();
  const resendVerification = useResendVerification();
  const { isAuthenticated, slug, refresh } = useAuth();
  const [status, setStatus] = useState<'pending' | 'done' | 'error'>('pending');
  // StrictMode runs effects twice in dev; the second POST would find the
  // single-use token already consumed and falsely report "invalid or expired".
  const fired = useRef(false);

  useEffect(() => {
    if (!token || fired.current) return;
    fired.current = true;
    verifyEmail.mutate(token, {
      onSuccess: () => {
        setStatus('done');
        // A logged-in session still holds emailVerified=false — refresh it so
        // the "verify your email" banners disappear without a manual reload.
        void refresh();
      },
      onError: () => setStatus('error'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Where "continue" leads depends on the session: dashboard for couples,
  // invites for collaborator accounts, login for logged-out visitors.
  const nextHref = isAuthenticated
    ? slug
      ? weddingHref(slug, '/dashboard')
      : '/hub'
    : '/login';
  const nextLabel = isAuthenticated
    ? slug
      ? 'Go to dashboard'
      : 'View your invites'
    : 'Go to login';

  const handleResend = async () => {
    try {
      await resendVerification.mutateAsync();
      toast.success('Verification email sent — check your inbox.');
    } catch {
      toast.error('Failed to send verification email');
    }
  };

  return (
    <AuthShell
      title="Verify your email"
      cardClassName="bg-white rounded-2xl shadow-[0_28px_70px_-28px_rgba(64,48,32,0.4)] ring-1 ring-[#eadfce] p-8 text-center"
    >
      {!token && <p className="text-gray-600">This verification link is missing its token.</p>}
      {token && status === 'pending' && <p className="text-gray-600">Verifying your email...</p>}
      {token && status === 'done' && (
        <>
          <p className="text-gray-700 mb-4">Your email is verified!</p>
          <Link to={nextHref} className="btn-primary inline-block">
            {nextLabel}
          </Link>
        </>
      )}
      {token && status === 'error' && (
        <div className="space-y-3">
          <p className="text-red-600">This verification link is invalid or has expired.</p>
          {isAuthenticated ? (
            <button
              onClick={handleResend}
              disabled={resendVerification.isPending}
              className="btn-primary disabled:opacity-50"
            >
              {resendVerification.isPending ? 'Sending...' : 'Send a new verification email'}
            </button>
          ) : (
            <p className="text-sm text-gray-500">
              <Link to="/login" className="text-maroon-700 font-medium hover:underline">
                Log in
              </Link>{' '}
              and use &ldquo;Resend email&rdquo; in Settings to get a fresh link.
            </p>
          )}
        </div>
      )}
    </AuthShell>
  );
}
