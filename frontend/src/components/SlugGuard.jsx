import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export default function SlugGuard({ children }) {
  const { slug } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['wedding', slug],
    queryFn: () => api.get(`/weddings/${slug}`).then(r => r.data),
    enabled: !!slug,
  });

  if (isLoading) return null;
  if (!data?.exists) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold text-maroon-800 mb-4">404</h1>
          <p className="text-gray-600 mb-6">Wedding not found</p>
          <a href="/" className="btn-primary px-6 py-3">Go Home</a>
        </div>
      </div>
    );
  }
  return children;
}
