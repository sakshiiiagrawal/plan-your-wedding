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
import Login from './pages/Login';

// Public Pages
import Home from './pages/public/Home';

// Context
import { AuthProvider } from './contexts/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
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
            {/* Public Wedding Website */}
            <Route path="/" element={<PublicLayout />}>
              <Route index element={<Home />} />
            </Route>

            {/* Admin Login */}
            <Route path="/login" element={<Login />} />

            {/* Admin Dashboard */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="events" element={<Events />} />
              <Route path="guests" element={<Guests />} />
              <Route path="venues" element={<Venues />} />
              <Route path="accommodations" element={<Accommodations />} />
              <Route path="vendors" element={<Vendors />} />
              <Route path="budget" element={<Budget />} />
              <Route path="tasks" element={<Tasks />} />
            </Route>

            {/* Catch all - redirect to home */}
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
