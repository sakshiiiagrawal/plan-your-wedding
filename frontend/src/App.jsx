import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import PublicLayout from './layouts/PublicLayout';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import Events from './pages/admin/Events';
import Guests from './pages/admin/Guests';
import Venues from './pages/admin/Venues';
import Accommodations from './pages/admin/Accommodations';
import Vendors from './pages/admin/Vendors';
import Budget from './pages/admin/Budget';
import Tasks from './pages/admin/Tasks';
import Team from './pages/admin/Team';
import Login from './pages/Login';
import Onboard from './pages/Onboard';
import Marketing from './pages/Marketing';

// Public Pages
import Home from './pages/public/Home';

// Guards
import SlugGuard from './components/SlugGuard';

// Context
import { AuthProvider } from './contexts/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Marketing landing page */}
            <Route path="/" element={<Marketing />} />

            {/* Onboarding wizard */}
            <Route path="/onboard" element={<Onboard />} />

            {/* Slug-scoped public wedding website */}
            <Route path="/:slug" element={<SlugGuard><PublicLayout /></SlugGuard>}>
              <Route index element={<Home />} />
            </Route>

            {/* Slug-scoped admin login */}
            <Route path="/:slug/login" element={<SlugGuard><Login /></SlugGuard>} />

            {/* Slug-scoped admin dashboard */}
            <Route path="/:slug/admin" element={<SlugGuard><AdminLayout /></SlugGuard>}>
              <Route index element={<Dashboard />} />
              <Route path="events" element={<Events />} />
              <Route path="guests" element={<Guests />} />
              <Route path="venues" element={<Venues />} />
              <Route path="accommodations" element={<Accommodations />} />
              <Route path="vendors" element={<Vendors />} />
              <Route path="budget" element={<Budget />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="team" element={<Team />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#FFF8E7',
              color: '#8B0000',
              border: '1px solid #D4AF37',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
