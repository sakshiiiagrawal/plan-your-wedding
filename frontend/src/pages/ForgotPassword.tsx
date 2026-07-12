import { useState } from 'react';
import toast from 'react-hot-toast';
import { useForgotPassword } from '../hooks/useApi';

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
    <div className="min-h-screen bg-gradient-to-br from-maroon-800 via-maroon-700 to-gold-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-script text-5xl text-cream mb-2">Wedding Planner</h1>
          <p className="text-gold-300">Reset your password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
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
