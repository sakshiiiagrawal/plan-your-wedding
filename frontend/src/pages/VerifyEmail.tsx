import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVerifyEmail } from '../hooks/useApi';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const verifyEmail = useVerifyEmail();
  const [status, setStatus] = useState<'pending' | 'done' | 'error'>('pending');

  useEffect(() => {
    if (!token) return;
    verifyEmail.mutate(token, {
      onSuccess: () => setStatus('done'),
      onError: () => setStatus('error'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-800 via-maroon-700 to-gold-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
        {!token && <p className="text-gray-600">This verification link is missing its token.</p>}
        {token && status === 'pending' && <p className="text-gray-600">Verifying your email...</p>}
        {token && status === 'done' && (
          <>
            <p className="text-gray-700 mb-4">Your email is verified!</p>
            <a href="/login" className="btn-primary inline-block">
              Go to login
            </a>
          </>
        )}
        {token && status === 'error' && (
          <p className="text-red-600">This verification link is invalid or has expired.</p>
        )}
      </div>
    </div>
  );
}
