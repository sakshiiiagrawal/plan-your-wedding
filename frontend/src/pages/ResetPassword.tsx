import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useResetPassword } from '../hooks/useApi';
import PasswordInput from '../components/ui/PasswordInput';
import AuthShell from '../components/ui/AuthShell';

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
    <AuthShell title="Set a new password">
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

      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="text-maroon-700 hover:underline">
          ← Back to Sign In
        </Link>
      </p>
    </AuthShell>
  );
}
