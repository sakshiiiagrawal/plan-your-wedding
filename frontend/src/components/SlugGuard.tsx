import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

interface SlugGuardProps {
  children: React.ReactNode;
}

export default function SlugGuard({ children }: SlugGuardProps) {
  const { slug } = useParams<{ slug: string }>();
  const { data } = useQuery<{ exists: boolean }>({
    queryKey: ['wedding', slug],
    queryFn: () => api.get(`/weddings/${slug}`).then((r) => r.data),
    enabled: !!slug,
  });

  // Render children optimistically instead of blocking the whole page on this
  // round-trip — for a valid slug (the common case) that saves ~one request of
  // latency before the page can even start fetching. Only fall back to 404 once
  // the check has actually confirmed the wedding doesn't exist.
  if (data && !data.exists) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold text-maroon-800 mb-4">404</h1>
          <p className="text-ink-mid mb-6">Wedding not found</p>
          <a href="/" className="btn-primary px-6 py-3">
            Go Home
          </a>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
