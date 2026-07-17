import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useResetPassword } from '../hooks/useApi';
import PasswordInput from '../components/ui/PasswordInput';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const resetPassword = useResetPassword();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await resetPassword.mutateAsync({ token, password });
      toast.success('Password updated. Please log in.');
      navigate('/login');
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'This reset link is invalid or has expired');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-800 via-maroon-700 to-gold-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-script text-5xl text-cream mb-2">Wedding Planner</h1>
          <p className="text-gold-300">Set a new password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {!token ? (
            <p className="text-center text-gray-600">This reset link is missing its token.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">New password</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label className="label">Confirm password</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={resetPassword.isPending}
                className="btn-primary w-full py-3 text-sm mt-1 disabled:opacity-50"
              >
                {resetPassword.isPending ? 'Updating...' : 'Reset password'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-cream/70 text-sm">
          <a href="/login" className="hover:text-gold-300">
            ← Back to Sign In
          </a>
        </p>
      </div>
    </div>
  );
}
