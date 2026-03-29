import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './layouts/PublicLayout';

// Static imports (small, needed immediately)
import Login from './pages/Login';
import Onboard from './pages/Onboard';
import Marketing from './pages/Marketing';
import Home from './pages/public/Home';
import SlugGuard from './components/SlugGuard';

// Context
import { AuthProvider } from './contexts/AuthContext';

// Lazy-loaded pages (code-split for performance)
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Events = lazy(() => import('./pages/dashboard/Events'));
const Guests = lazy(() => import('./pages/dashboard/Guests'));
const Venues = lazy(() => import('./pages/dashboard/Venues'));
const Accommodations = lazy(() => import('./pages/dashboard/Accommodations'));
const Vendors = lazy(() => import('./pages/dashboard/Vendors'));
const Expense = lazy(() => import('./pages/dashboard/Expense'));
const Tasks = lazy(() => import('./pages/dashboard/Tasks'));

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
            <Route
              path="/:slug"
              element={
                <SlugGuard>
                  <PublicLayout />
                </SlugGuard>
              }
            >
              <Route index element={<Home />} />
            </Route>

            {/* Slug-scoped login */}
            <Route
              path="/:slug/login"
              element={
                <SlugGuard>
                  <Login />
                </SlugGuard>
              }
            />

            {/* Slug-scoped dashboard */}
            <Route
              path="/:slug/dashboard"
              element={
                <SlugGuard>
                  <DashboardLayout />
                </SlugGuard>
              }
            >
              <Route
                index
                element={
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center py-12 text-gray-500">
                        Loading...
                      </div>
                    }
                  >
                    <Dashboard />
                  </Suspense>
                }
              />
              <Route
                path="events"
                element={
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center py-12 text-gray-500">
                        Loading...
                      </div>
                    }
                  >
                    <Events />
                  </Suspense>
                }
              />
              <Route
                path="guests"
                element={
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center py-12 text-gray-500">
                        Loading...
                      </div>
                    }
                  >
                    <Guests />
                  </Suspense>
                }
              />
              <Route
                path="venues"
                element={
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center py-12 text-gray-500">
                        Loading...
                      </div>
                    }
                  >
                    <Venues />
                  </Suspense>
                }
              />
              <Route
                path="accommodations"
                element={
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center py-12 text-gray-500">
                        Loading...
                      </div>
                    }
                  >
                    <Accommodations />
                  </Suspense>
                }
              />
              <Route
                path="vendors"
                element={
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center py-12 text-gray-500">
                        Loading...
                      </div>
                    }
                  >
                    <Vendors />
                  </Suspense>
                }
              />
              <Route
                path="expense"
                element={
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center py-12 text-gray-500">
                        Loading...
                      </div>
                    }
                  >
                    <Expense />
                  </Suspense>
                }
              />
              <Route
                path="tasks"
                element={
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center py-12 text-gray-500">
                        Loading...
                      </div>
                    }
                  >
                    <Tasks />
                  </Suspense>
                }
              />
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
