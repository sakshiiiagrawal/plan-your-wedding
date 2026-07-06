import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAcceptInvite } from '../hooks/useApi';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { isAuthenticated, loading } = useAuth();
  const acceptInvite = useAcceptInvite();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'done' | 'error'>('pending');

  useEffect(() => {
    if (loading || !token) return;

    if (!isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`);
      return;
    }

    acceptInvite.mutate(token, {
      onSuccess: () => setStatus('done'),
      onError: () => setStatus('error'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated, token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-800 via-maroon-700 to-gold-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
        {!token && <p className="text-gray-600">This invite link is missing its token.</p>}
        {token && status === 'pending' && <p className="text-gray-600">Accepting invite...</p>}
        {token && status === 'done' && (
          <>
            <p className="text-gray-700 mb-4">You&apos;re in! You now have access to this wedding.</p>
            <a href="/login" className="btn-primary inline-block">
              Go to dashboard
            </a>
          </>
        )}
        {token && status === 'error' && (
          <p className="text-red-600">This invite is invalid or has already been used.</p>
        )}
      </div>
    </div>
  );
}
