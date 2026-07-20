import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWeddingSlug } from '../hooks/useWeddingSlug';
import { apexHref, goToWedding } from '../utils/tenant';
import { useAuth } from '../contexts/AuthContext';
import { useHeroContent } from '../hooks/useApi';
import PasswordInput from '../components/ui/PasswordInput';
import AuthShell from '../components/ui/AuthShell';
import ApexLink from '../components/ui/ApexLink';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const slug = useWeddingSlug();
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
        goToWedding(targetSlug, '/dashboard', navigate);
      } else {
        // No wedding yet (collaborator account) — invites live here
        window.location.assign(apexHref('/hub'));
      }
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={slug ? `${brideName} & ${groomName}` : 'Welcome back'}
      subtitle={slug ? 'Sign in to your wedding planner' : 'Sign in to your account'}
    >
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
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 text-sm mt-1 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        <ApexLink to="/forgot-password" className="text-maroon-700 hover:underline">
          Forgot password?
        </ApexLink>
      </p>

      <p className="mt-3 text-center text-sm text-gray-600">
        New here?{' '}
        <ApexLink to="/onboard" className="text-maroon-700 font-medium hover:underline">
          Start planning your wedding
        </ApexLink>
      </p>
    </AuthShell>
  );
}
