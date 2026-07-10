import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useHeroContent } from '../hooks/useApi';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  const { data: heroContent } = useHeroContent(slug);
  const brideName = heroContent?.bride_name || 'Bride';
  const groomName = heroContent?.groom_name || 'Groom';

  useEffect(() => {
    if (sessionStorage.getItem('sessionExpired')) {
      sessionStorage.removeItem('sessionExpired');
      toast.error('Your session expired. Please log in again.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { slug: returnedSlug } = await login(email, password);
      toast.success('Welcome to Wedding Planner!');
      // Resume an interrupted flow (e.g. invite acceptance); in-app paths only
      const next = searchParams.get('next');
      const targetSlug = slug || returnedSlug;
      if (next && next.startsWith('/')) {
        navigate(next);
      } else if (targetSlug) {
        navigate(`/${targetSlug}/dashboard`);
      } else {
        // No wedding yet (collaborator account) — invites live here
        navigate('/invites');
      }
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-800 via-maroon-700 to-gold-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {slug ? (
            <>
              <h1 className="font-script text-5xl text-cream mb-2">
                {brideName} & {groomName}
              </h1>
              <p className="text-gold-300">Wedding Planner</p>
            </>
          ) : (
            <>
              <h1 className="font-script text-5xl text-cream mb-2">Wedding Planner</h1>
              <p className="text-gold-300">Sign in to your account</p>
            </>
          )}
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
                placeholder="your@email.com"
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

          <p className="mt-4 text-center text-sm">
            <Link to="/forgot-password" className="text-maroon-700 hover:underline">
              Forgot password?
            </Link>
          </p>

          <p className="mt-3 text-center text-sm text-gray-600">
            New here?{' '}
            <Link to="/onboard" className="text-maroon-700 font-medium hover:underline">
              Start planning your wedding
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-cream/70 text-sm">
          {slug ? (
            <Link to={`/${slug}`} className="hover:text-gold-300">
              ← Back to Wedding Website
            </Link>
          ) : (
            <Link to="/" className="hover:text-gold-300">
              ← Back to Home
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
