import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useForgotPassword } from '../hooks/useApi';
import AuthShell from '../components/ui/AuthShell';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const forgotPassword = useForgotPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await forgotPassword.mutateAsync(email);
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  };

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a reset link">
      {sent ? (
        <p className="text-center text-gray-600">
          If that email exists, a reset link has been sent. Check your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="your@email.com"
              required
            />
          </div>
          <button
            type="submit"
            disabled={forgotPassword.isPending}
            className="btn-primary w-full py-3 text-sm mt-1 disabled:opacity-50"
          >
            {forgotPassword.isPending ? 'Sending...' : 'Send reset link'}
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
