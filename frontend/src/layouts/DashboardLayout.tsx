import { Outlet, NavLink, useNavigate, Navigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useHeroContent } from '../hooks/useApi';
import {
  HiOutlineHome,
  HiOutlineCalendar,
  HiOutlineUserGroup,
  HiOutlineLocationMarker,
  HiOutlineOfficeBuilding,
  HiOutlineBriefcase,
  HiOutlineCurrencyRupee,
  HiOutlineClipboardList,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlinePhotograph,
  HiOutlineGlobe,
  HiOutlineSearch,
  HiOutlineBell,
  HiOutlineChevronRight,
  HiOutlineExternalLink,
} from 'react-icons/hi';
import { useState } from 'react';
import { CornerFlourish } from '../components/ui';

const NAV_ITEMS = [
  { path: '', label: 'Overview', icon: HiOutlineHome, end: true },
  { path: '/venues', label: 'Venues', icon: HiOutlineLocationMarker },
  { path: '/events', label: 'Events', icon: HiOutlineCalendar },
  { path: '/vendors', label: 'Vendors', icon: HiOutlineBriefcase },
  { path: '/guests', label: 'Guests & RSVP', icon: HiOutlineUserGroup },
  { path: '/accommodations', label: 'Accommodations', icon: HiOutlineOfficeBuilding },
  { path: '/expense', label: 'Budget', icon: HiOutlineCurrencyRupee },
  { path: '/tasks', label: 'Tasks', icon: HiOutlineClipboardList },
  { path: '/gallery', label: 'Gallery', icon: HiOutlinePhotograph },
  { path: '/website', label: 'Public Site', icon: HiOutlineGlobe },
];

const CRUMB_MAP: Record<string, string> = {
  '': 'overview',
  '/guests': 'guests & rsvp',
  '/events': 'events',
  '/venues': 'venues',
  '/accommodations': 'accommodations',
  '/vendors': 'vendors',
  '/expense': 'budget',
  '/tasks': 'tasks',
  '/gallery': 'gallery',
  '/website': 'public site',
};

export default function DashboardLayout() {
  const { logout, user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: heroContent } = useHeroContent(slug);
  const brideName = heroContent?.bride_name || 'Bride';
  const groomName = heroContent?.groom_name || 'Groom';
  const weddingDate = heroContent?.wedding_date
    ? new Date(heroContent.wedding_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const basePath = `/${slug}/dashboard`;
  const subPath = location.pathname.replace(basePath, '') || '';
  const currentCrumb = CRUMB_MAP[subPath] ?? subPath.replace('/', '');

  const handleLogout = () => {
    logout();
    navigate(`/${slug}/login`, { replace: true });
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-page)' }}
      >
        <div className="text-center">
          <div
            className="w-14 h-14 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: 'var(--line-soft)', borderTopColor: 'var(--gold)' }}
          />
          <p style={{ color: 'var(--ink-low)', fontSize: 13 }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/${slug}/login`} replace />;
  }

  return (
    <div
      className="flex"
      style={{ background: 'var(--bg-page)', height: '100vh', overflow: 'hidden' }}
    >
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 flex flex-col transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          width: 248,
          flexShrink: 0,
          background: 'var(--bg-panel)',
          borderRight: '1px solid var(--line-soft)',
          height: '100vh',
          overflowY: 'hidden',
        }}
      >
        {/* Brand */}
        <div style={{ padding: '28px 24px 24px', position: 'relative' }}>
          <CornerFlourish
            size={44}
            rotate={0}
            style={{ position: 'absolute', top: 10, right: 10, color: 'var(--gold)', opacity: 0.5 }}
          />
          <div className="uppercase-eyebrow" style={{ marginBottom: 10 }}>
            The Wedding of
          </div>
          <div
            className="display"
            style={{ fontSize: 26, lineHeight: 1.05, color: 'var(--ink-high)' }}
          >
            {brideName}
            <div
              style={{ fontStyle: 'italic', color: 'var(--gold)', fontSize: 20, margin: '2px 0' }}
            >
              &amp;
            </div>
            {groomName}
          </div>
          {weddingDate && (
            <div
              className="mono"
              style={{
                marginTop: 10,
                fontSize: 10,
                letterSpacing: '0.1em',
                color: 'var(--ink-dim)',
                textTransform: 'uppercase',
              }}
            >
              {weddingDate}
            </div>
          )}
        </div>

        <hr className="hairline" style={{ margin: '0 24px' }} />

        {/* Navigation */}
        <nav style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
          {NAV_ITEMS.map((item) => {
            const fullPath = `${basePath}${item.path}`;
            return (
              <NavLink
                key={item.path}
                to={fullPath}
                end={item.end ?? false}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => (isActive ? 'nav-active' : 'nav-inactive')}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '9px 12px',
                  width: '100%',
                  borderRadius: 8,
                  marginBottom: 2,
                  color: isActive ? 'var(--gold-deep)' : 'var(--ink-mid)',
                  background: isActive ? 'var(--gold-glow)' : 'transparent',
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  textAlign: 'left' as const,
                  borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                  transition: 'all 150ms',
                  textDecoration: 'none',
                })}
              >
                <item.icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <hr className="hairline" style={{ margin: '0 24px' }} />

        {/* Footer */}
        <div style={{ padding: '16px 20px' }}>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--ink-dim)',
              letterSpacing: '0.08em',
              marginBottom: 10,
            }}
          >
            {slug}.weds.app
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div
              className="avatar"
              style={{ width: 28, height: 28, fontSize: 11 }}
              title={user?.name}
            >
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--ink-high)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.name}
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: 'var(--ink-dim)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 8px',
              width: '100%',
              borderRadius: 6,
              fontSize: 12,
              color: 'var(--err)',
              background: 'transparent',
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220,38,38,0.07)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <HiOutlineLogout style={{ width: 14, height: 14 }} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Topbar */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '14px 28px',
            borderBottom: '1px solid var(--line-soft)',
            background: 'rgba(255,248,231,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            position: 'sticky',
            top: 0,
            zIndex: 20,
          }}
        >
          {/* Mobile hamburger + Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
              style={{
                padding: 6,
                borderRadius: 6,
                color: 'var(--ink-mid)',
                background: 'transparent',
              }}
            >
              <HiOutlineMenu style={{ width: 20, height: 20 }} />
            </button>
            <div
              className="mono hidden sm:flex"
              style={{ alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-low)' }}
            >
              <span>dashboard</span>
              <HiOutlineChevronRight style={{ width: 12, height: 12 }} />
              <span style={{ color: 'var(--ink-mid)' }}>{currentCrumb}</span>
            </div>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Search */}
            <div className="hidden md:block" style={{ position: 'relative' }}>
              <HiOutlineSearch
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 14,
                  height: 14,
                  color: 'var(--ink-dim)',
                  pointerEvents: 'none',
                }}
              />
              <input
                className="input"
                placeholder="Search guests, tasks…"
                style={{ paddingLeft: 32, width: 220, height: 34, fontSize: 12 }}
              />
            </div>

            {/* Bell */}
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 8,
                color: 'var(--ink-mid)',
                background: 'transparent',
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-raised)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <HiOutlineBell style={{ width: 17, height: 17 }} />
            </button>

            {/* View site */}
            <NavLink
              to={`/${slug}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--ink-mid)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: '5px 10px',
                background: 'transparent',
                transition: 'all 150ms',
                whiteSpace: 'nowrap',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)';
                (e.currentTarget as HTMLElement).style.color = 'var(--ink-high)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--ink-mid)';
              }}
            >
              <HiOutlineExternalLink style={{ width: 13, height: 13 }} />
              View site
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '32px 40px', overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
