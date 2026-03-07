import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Welcome to Wedding Planner!');
      navigate('/admin');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-800 via-maroon-700 to-gold-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-script text-5xl text-cream mb-2">Sakshi & Ayush</h1>
          <p className="text-gold-300">Wedding Planner Admin</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-display font-bold text-maroon-800 text-center mb-6">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="admin@wedding.com"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center mb-3">Login Credentials:</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-maroon-50 rounded-lg">
                <div>
                  <span className="font-medium text-maroon-800">Admin</span>
                  <span className="text-gray-500 ml-2">(Full Access)</span>
                </div>
                <code className="text-gray-600">admin@wedding.com / SakshiAyush2026</code>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                <div>
                  <span className="font-medium text-blue-800">Family</span>
                  <span className="text-gray-500 ml-2">(View Only)</span>
                </div>
                <code className="text-gray-600">family@wedding.com / Family2026</code>
              </div>
              <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                <div>
                  <span className="font-medium text-green-800">Friends</span>
                  <span className="text-gray-500 ml-2">(View Only, No Finance)</span>
                </div>
                <code className="text-gray-600">friends@wedding.com / Friends2026</code>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-cream/70 text-sm">
          <a href="/" className="hover:text-gold-300">← Back to Wedding Website</a>
        </p>
      </div>
    </div>
  );
}
