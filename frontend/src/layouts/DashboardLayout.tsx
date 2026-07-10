import { Outlet, NavLink, useNavigate, Navigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useHeroContent, useWeddings, useSetActiveWedding } from '../hooks/useApi';
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
  HiOutlineChevronRight,
  HiOutlineExternalLink,
  HiOutlineCog,
  HiOutlinePrinter,
} from 'react-icons/hi';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CornerFlourish } from '../components/ui';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { formatDate } from '../utils/date';

// `section` is the access-control key (WEDDING_SECTIONS in shared); items
// without one (overview, settings) are visible to every member. Must stay in
// sync with SECTION_BY_PREFIX in api/_src/app.ts.
const NAV_ITEMS = [
  { path: '', label: 'Overview', icon: HiOutlineHome, end: true },
  { path: '/venues', label: 'Venues', icon: HiOutlineLocationMarker, section: 'venues' },
  { path: '/events', label: 'Events', icon: HiOutlineCalendar, section: 'events' },
  // Grouped right after Venues — this is room allocation for the venues
  // marked "Has Accommodation" there, not a separate venue type.
  { path: '/guests', label: 'Guests & RSVP', icon: HiOutlineUserGroup, section: 'guests' },
  { path: '/vendors', label: 'Vendors', icon: HiOutlineBriefcase, section: 'vendors' },
  {
    path: '/accommodations',
    label: 'Room Allocation',
    icon: HiOutlineOfficeBuilding,
    section: 'venues',
  },
  { path: '/budget', label: 'Budget', icon: HiOutlineCurrencyRupee, section: 'budget' },
  { path: '/tasks', label: 'Tasks', icon: HiOutlineClipboardList, section: 'tasks' },
  { path: '/gallery', label: 'Gallery', icon: HiOutlinePhotograph, section: 'website' },
  { path: '/website', label: 'Public Site', icon: HiOutlineGlobe, section: 'website' },
  { path: '/settings', label: 'Settings', icon: HiOutlineCog },
];

const CRUMB_MAP: Record<string, string> = {
  '': 'overview',
  '/guests': 'guests & rsvp',
  '/events': 'events',
  '/venues': 'venues',
  '/accommodations': 'room allocation',
  '/vendors': 'vendors',
  '/budget': 'budget',
  '/tasks': 'tasks',
  '/gallery': 'gallery',
  '/website': 'public site',
  '/settings': 'settings',
};

export default function DashboardLayout() {
  const { logout, user, slug: authSlug, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug: urlSlug } = useParams<{ slug: string }>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // The URL slug is cosmetic; the authenticated slug (which accounts for
  // wedding-member access) is the source of truth. Correct the URL if they
  // ever diverge so branding/data can't come from someone else's wedding.
  useEffect(() => {
    if (!loading && isAuthenticated && authSlug && urlSlug && urlSlug !== authSlug) {
      navigate(location.pathname.replace(`/${urlSlug}`, `/${authSlug}`), { replace: true });
    }
  }, [loading, isAuthenticated, authSlug, urlSlug, location.pathname, navigate]);

  const slug = authSlug ?? urlSlug;
  const { data: weddingData } = useWeddings();
  const setActiveWedding = useSetActiveWedding();
  const weddings = weddingData?.weddings ?? [];
  const { data: heroContent } = useHeroContent();
  const brideName = heroContent?.bride_name || 'Bride';
  const groomName = heroContent?.groom_name || 'Groom';
  const weddingDate = heroContent?.wedding_date
    ? formatDate(heroContent.wedding_date, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const basePath = `/${slug}/dashboard`;
  const subPath = location.pathname.replace(basePath, '') || '';
  const currentCrumb = CRUMB_MAP[subPath] ?? subPath.replace('/', '');

  // Section-restricted members (planners granted only some sections) see a
  // trimmed nav; the API enforces the same list, this just keeps UI honest.
  const allowedSections = user?.allowedSections ?? null;
  const visibleNavItems = allowedSections
    ? NAV_ITEMS.filter((item) => !item.section || allowedSections.includes(item.section))
    : NAV_ITEMS;
  const currentNavItem = NAV_ITEMS.find((item) => item.path === subPath);
  const currentSectionBlocked =
    allowedSections !== null &&
    currentNavItem?.section !== undefined &&
    !allowedSections.includes(currentNavItem.section);

  // Deep links into blocked sections bounce to Overview (below) — say why,
  // or the shared link just looks broken.
  useEffect(() => {
    if (currentSectionBlocked) {
      toast.error(
        `You don't have access to ${currentNavItem?.label ?? 'that section'} on this wedding. Ask the couple to widen your access.`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionBlocked]);

  // Switching weddings hard-reloads the app — confirm so mid-edit work isn't
  // silently discarded by a stray dropdown change.
  const [pendingSwitch, setPendingSwitch] = useState<{ ownerId: string; label: string } | null>(
    null,
  );

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

  // Deep link into a section this member can't access → back to Overview
  if (currentSectionBlocked) {
    return <Navigate to={basePath} replace />;
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
        className={`no-print fixed lg:static inset-y-0 left-0 z-30 flex flex-col transform transition-transform duration-200 ease-in-out ${
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
          {visibleNavItems.map((item) => {
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
          {/* Wedding switcher — only when the user collaborates on more than
              their own wedding. Switching reloads to re-scope all data. */}
          {weddings.length > 1 && (
            <div style={{ marginBottom: 12 }}>
              <div className="uppercase-eyebrow" style={{ marginBottom: 6 }}>
                Working on
              </div>
              <select
                value={weddingData?.activeOwnerId ?? ''}
                disabled={setActiveWedding.isPending}
                onChange={(e) => {
                  const target = weddings.find((w) => w.ownerId === e.target.value);
                  if (target) setPendingSwitch({ ownerId: target.ownerId, label: target.label });
                }}
                style={{
                  width: '100%',
                  fontSize: 12,
                  padding: '7px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--line)',
                  background: 'var(--bg-raised)',
                  color: 'var(--ink-high)',
                  cursor: setActiveWedding.isPending ? 'wait' : 'pointer',
                }}
              >
                {weddings.map((w) => (
                  <option key={w.ownerId} value={w.ownerId}>
                    {w.isOwn ? `${w.label} (mine)` : `${w.label} · ${w.role}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div
            className="mono"
            title={`${window.location.host}/${slug}`}
            style={{
              fontSize: 11,
              color: 'var(--ink-dim)',
              letterSpacing: '0.08em',
              marginBottom: 10,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {window.location.host}/{slug}
          </div>
          {/* Working on someone else's wedding — show the granted role so
              members understand why parts of the UI are trimmed or read-only */}
          {user?.ownerId && user.ownerId !== user.id && user.role && (
            <div
              className="mono"
              style={{
                display: 'inline-block',
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--gold-deep)',
                background: 'var(--gold-glow)',
                border: '1px solid var(--gold)',
                borderRadius: 999,
                padding: '2px 8px',
                marginBottom: 10,
              }}
            >
              {user.role === 'viewer' ? 'viewer · read-only' : user.role}
            </div>
          )}
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
          className="no-print"
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
            {/* Print — list pages only; the Site Studio's zoomed live preview
                prints as a clipped mess, so hide it there */}
            {subPath !== '/website' && (
              <button
                onClick={() => window.print()}
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
                  whiteSpace: 'nowrap',
                }}
              >
                <HiOutlinePrinter style={{ width: 13, height: 13 }} />
                Print
              </button>
            )}
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

        {/* Page content — the Site Studio manages its own full-height chrome */}
        <main
          style={{
            flex: 1,
            padding: subPath === '/website' ? 0 : '32px 40px',
            overflow: 'auto',
            minHeight: 0,
          }}
        >
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={pendingSwitch !== null}
        title="Switch wedding?"
        message={`Open ${pendingSwitch?.label ?? ''}? The page will reload and any unsaved changes here will be lost.`}
        confirmLabel="Switch"
        isPending={setActiveWedding.isPending}
        onConfirm={() => {
          if (pendingSwitch) setActiveWedding.mutate(pendingSwitch.ownerId);
        }}
        onCancel={() => setPendingSwitch(null)}
      />
    </div>
  );
}
