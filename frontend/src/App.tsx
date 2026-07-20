import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Static imports (small, needed immediately)
import Login from './pages/Login';
import Onboard from './pages/Onboard';
import Marketing from './pages/Marketing';
import PublicPage from './pages/public/PublicPage';
import SlugGuard from './components/SlugGuard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AcceptInvite from './pages/AcceptInvite';
import Hub from './pages/Hub';
import VerifyEmail from './pages/VerifyEmail';

// Context
import { AuthProvider } from './contexts/AuthContext';
import { MixpanelProvider } from './contexts/MixpanelContext';

import { TENANT_SLUG } from './utils/tenant';

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
const PreviewFrame = lazy(() => import('./pages/dashboard/website/PreviewFrame'));

const page = (node: ReactNode) => (
  <Suspense
    fallback={
      <div className="flex items-center justify-center py-12 text-gray-500">Loading...</div>
    }
  >
    {node}
  </Suspense>
);

/** The dashboard's child routes, mounted under `/dashboard` on a wedding
 *  subdomain and under `/:slug/dashboard` on path-scoped hosts. One copy so
 *  the two trees can't drift. */
const dashboardChildren = (
  <>
    <Route index element={page(<Dashboard />)} />
    <Route path="events" element={page(<Events />)} />
    <Route path="guests" element={page(<Guests />)} />
    {/* WhatsApp lives inside Guests now */}
    <Route path="whatsapp" element={<Navigate to="../guests?tab=conversations" replace />} />
    <Route path="venues" element={page(<Venues />)} />
    <Route path="accommodations" element={page(<Accommodations />)} />
    <Route path="vendors" element={page(<Vendors />)} />
    <Route path="budget" element={page(<Expense />)} />
    {/* Old bookmarks/links */}
    <Route path="expense" element={<Navigate to="../budget" replace />} />
    <Route path="tasks" element={page(<Tasks />)} />
    <Route path="gallery" element={page(<Gallery />)} />
    <Route path="website" element={page(<Website />)} />
    <Route path="settings" element={page(<Settings />)} />
  </>
);

/** Site Studio preview iframe — fed by PreviewCanvas through expandos on the
 *  iframe element; renders nothing standalone. Must stay same-origin with the
 *  dashboard, so both trees carry it. */
const previewRoute = (
  <Route
    path="/__preview"
    element={
      <Suspense fallback={null}>
        <PreviewFrame />
      </Suspense>
    }
  />
);

/** The host already names the wedding (`ayush-sakshi.shaadi.diy`), so every
 *  path is wedding-relative: no `/:slug` segment anywhere. */
function TenantRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <SlugGuard>
            <PublicPage />
          </SlugGuard>
        }
      />
      <Route
        path="/login"
        element={
          <SlugGuard>
            <Login />
          </SlugGuard>
        }
      />
      <Route
        path="/dashboard"
        element={
          <SlugGuard>
            <DashboardLayout />
          </SlugGuard>
        }
      >
        {dashboardChildren}
      </Route>
      {previewRoute}
      {/* Additional public pages (e.g. /invite) — the static segments above
        outrank :pageSlug */}
      <Route
        path="/:pageSlug"
        element={
          <SlugGuard>
            <PublicPage />
          </SlugGuard>
        }
      />
      {/* Account/marketing routes live on the apex, not here */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Apex, and any host without wildcard DNS (Vercel previews, plain
 *  localhost): weddings are path-scoped under `/:slug`. */
function ApexRoutes() {
  return (
    <Routes>
      {/* Marketing landing page */}
      <Route path="/" element={<Marketing />} />

      {/* Global login (slug-less) */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      {/* Workspace hub: your weddings, shared weddings, pending invites.
        /invites is the pre-hub URL (old invite emails/bookmarks). */}
      <Route path="/hub" element={<Hub />} />
      <Route path="/invites" element={<Navigate to="/hub?manage=1" replace />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Onboarding wizard; /weddings/new is the same wizard for a
        logged-in account adding a(nother) wedding */}
      <Route path="/onboard" element={<Onboard />} />
      <Route path="/weddings/new" element={<Onboard createOnly />} />

      {/* Slug-scoped public wedding pages — each page owns all chrome.
        Static segments (login/dashboard below) outrank :pageSlug. */}
      <Route
        path="/:slug"
        element={
          <SlugGuard>
            <PublicPage />
          </SlugGuard>
        }
      />

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
        {dashboardChildren}
      </Route>

      {/* Additional public pages (e.g. /:slug/invite) — static segments
        above (login, dashboard) win route ranking over :pageSlug */}
      <Route
        path="/:slug/:pageSlug"
        element={
          <SlugGuard>
            <PublicPage />
          </SlugGuard>
        }
      />

      {previewRoute}

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

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
          <MixpanelProvider>{TENANT_SLUG ? <TenantRoutes /> : <ApexRoutes />}</MixpanelProvider>
        </BrowserRouter>
        <Toaster
          position="top-right"
          containerStyle={{ top: 72 }}
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--bg-panel)',
              color: 'var(--primary)',
              border: '1px solid var(--gold)',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
