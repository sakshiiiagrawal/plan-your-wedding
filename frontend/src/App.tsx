import { lazy, Suspense, useEffect } from 'react';
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
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AcceptInvite from './pages/AcceptInvite';
import VerifyEmail from './pages/VerifyEmail';

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
const Gallery = lazy(() => import('./pages/dashboard/Gallery'));
const Website = lazy(() => import('./pages/dashboard/Website'));
const Settings = lazy(() => import('./pages/dashboard/Settings'));

function App() {
  // Scrolling over a focused number input silently changes its value —
  // dangerous for money fields. Blur before the wheel event reaches the input.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement &&
        active.type === 'number' &&
        e.target instanceof Node &&
        active.contains(e.target)
      ) {
        active.blur();
      }
    };
    document.addEventListener('wheel', onWheel, { capture: true, passive: true });
    return () => document.removeEventListener('wheel', onWheel, { capture: true });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Marketing landing page */}
            <Route path="/" element={<Marketing />} />

            {/* Global login (slug-less) */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

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
                path="budget"
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
              {/* Old bookmarks/links */}
              <Route path="expense" element={<Navigate to="../budget" replace />} />
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
              <Route
                path="gallery"
                element={
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center py-12 text-gray-500">
                        Loading...
                      </div>
                    }
                  >
                    <Gallery />
                  </Suspense>
                }
              />
              <Route
                path="website"
                element={
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center py-12 text-gray-500">
                        Loading...
                      </div>
                    }
                  >
                    <Website />
                  </Suspense>
                }
              />
              <Route
                path="settings"
                element={
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center py-12 text-gray-500">
                        Loading...
                      </div>
                    }
                  >
                    <Settings />
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
          containerStyle={{ top: 72 }}
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
