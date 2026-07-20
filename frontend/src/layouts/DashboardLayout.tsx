import { Outlet, NavLink, useNavigate, Navigate, useLocation } from 'react-router-dom';
import WeddingRedirect from '../components/WeddingRedirect';
import { useWeddingSlug } from '../hooks/useWeddingSlug';
import {
  TENANT_SLUG,
  apexHref,
  goToWedding,
  publicSiteLabel,
  weddingHref,
  weddingPath,
} from '../utils/tenant';
import { useAuth } from '../contexts/AuthContext';
import { PageHeaderProvider, useTopbarHeader } from '../contexts/PageHeaderContext';
import {
  useHeroContent,
  useWeddings,
  useSetActiveWedding,
  useReminders,
  type ReminderItem,
} from '../hooks/useApi';
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
  HiOutlineBell,
  HiCheck,
  HiOutlinePlus,
  HiOutlineViewGrid,
} from 'react-icons/hi';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useModalDismiss } from '../hooks/useModalDismiss';
import { formatDate } from '../utils/date';
import { formatCurrency } from '../utils/currency';

// `section` is the access-control key (WEDDING_SECTIONS in shared); items
// without one (overview, settings) are visible to every member. Must stay in
// sync with the requireSection(...) mounts in api/_src/routes/index.ts.
const NAV_ITEMS = [
  { path: '', label: 'Overview', icon: HiOutlineHome, end: true },
  { path: '/venues', label: 'Venues', icon: HiOutlineLocationMarker, section: 'venues' },
  { path: '/events', label: 'Events', icon: HiOutlineCalendar, section: 'events' },
  { path: '/guests', label: 'Guests & RSVP', icon: HiOutlineUserGroup, section: 'guests' },
  { path: '/vendors', label: 'Vendors', icon: HiOutlineBriefcase, section: 'vendors' },
  { path: '/budget', label: 'Budget', icon: HiOutlineCurrencyRupee, section: 'budget' },
  { path: '/gallery', label: 'Gallery', icon: HiOutlinePhotograph, section: 'website' },
  { path: '/website', label: 'Pages', icon: HiOutlineGlobe, section: 'website' },
  { path: '/tasks', label: 'Tasks', icon: HiOutlineClipboardList, section: 'tasks' },
  {
    path: '/accommodations',
    label: 'Room Allocation',
    icon: HiOutlineOfficeBuilding,
    section: 'venues',
  },
  { path: '/settings', label: 'Settings', icon: HiOutlineCog },
];

// Pages where printing yields a useful document (lists/schedules). Overview,
// Gallery, Settings and the Site Studio print as meaningless chrome, so the
// topbar Print button is hidden there.
const PRINTABLE_PATHS = new Set([
  '/guests',
  '/events',
  '/venues',
  '/accommodations',
  '/vendors',
  '/budget',
  '/tasks',
]);

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
  '/website': 'pages',
  '/settings': 'settings',
};

// ── Topbar reminders bell ────────────────────────────────────────────────────
// The feed is a live view (overdue + today + upcoming) with no server-side
// read state — resolving an item is what removes it. "Seen" is a device-local
// layer on top: opening the panel records every visible item in localStorage,
// the badge counts only unseen overdue/today items, and items that were unseen
// at open time stay highlighted until the panel closes. Seen keys include the
// bucket, so an item escalating (upcoming → today → overdue) re-notifies.

function ReminderRow({
  item,
  isNew,
  onOpen,
}: {
  item: ReminderItem;
  isNew: boolean;
  onOpen: (i: ReminderItem) => void;
}) {
  const Icon = item.kind === 'payment' ? HiOutlineCurrencyRupee : HiOutlineClipboardList;
  const restBg = isNew ? 'var(--gold-glow)' : 'transparent';
  return (
    <button
      onClick={() => onOpen(item)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '7px 16px',
        background: restBg,
        cursor: 'pointer',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = restBg;
      }}
    >
      <Icon style={{ width: 14, height: 14, flexShrink: 0, color: 'var(--ink-dim)' }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 12.5,
            color: 'var(--ink-high)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.title}
        </span>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-dim)' }}>
          {formatDate(item.date, { month: 'short', day: 'numeric' })}
          {item.amount != null && ` · ${formatCurrency(item.amount)}`}
        </span>
      </span>
      {isNew && (
        <span
          aria-label="New"
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: 'var(--gold)',
            flexShrink: 0,
          }}
        />
      )}
    </button>
  );
}

function RemindersBell({ basePath }: { basePath: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: feed, refetch } = useReminders();
  useModalDismiss(open, () => setOpen(false));

  // ponytail: seen state is per-device localStorage keyed by wedding — move it
  // server-side only if cross-device read sync is actually asked for.
  const storageKey = `reminders-seen:${basePath}`;
  const [seen, setSeen] = useState<Set<string>>(() => {
    try {
      return new Set<string>(JSON.parse(localStorage.getItem(storageKey) ?? '[]'));
    } catch {
      return new Set();
    }
  });
  // Keys that were unseen when the panel opened — highlighted until close.
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  const groups: Array<[string, ReminderItem[]]> = [
    ['Overdue', feed?.overdue ?? []],
    ['Today', feed?.today ?? []],
    ['Coming up', feed?.upcoming ?? []],
  ];
  const keyOf = (bucket: string, i: ReminderItem) => `${bucket}:${i.kind}:${i.id}`;

  // The badge counts only unseen overdue/today items — viewing clears it.
  const badge = groups
    .slice(0, 2)
    .flatMap(([bucket, items]) => items.map((i) => keyOf(bucket, i)))
    .filter((k) => !seen.has(k)).length;
  const total = groups.reduce((n, [, items]) => n + items.length, 0);

  // While the panel is open, everything visible becomes seen. The stored set is
  // pruned to the current feed (resolved/deleted items needn't be remembered),
  // and whatever was unseen goes into `fresh` so it stays highlighted — this
  // also catches items arriving from the open-triggered refetch.
  useEffect(() => {
    if (!open || !feed) return;
    const keys = groups.flatMap(([bucket, items]) => items.map((i) => keyOf(bucket, i)));
    const unseen = keys.filter((k) => !seen.has(k));
    if (unseen.length > 0) setFresh((prev) => new Set([...prev, ...unseen]));
    setSeen(new Set(keys));
    try {
      localStorage.setItem(storageKey, JSON.stringify(keys));
    } catch {
      // Storage unavailable (private mode) — seen state lasts the session only.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, feed]);

  // Highlights are scoped to one viewing: closing the panel retires them.
  useEffect(() => {
    if (!open) setFresh(new Set());
  }, [open]);

  const go = (item: ReminderItem) => {
    setOpen(false);
    navigate(`${basePath}${item.kind === 'payment' ? '/budget' : '/tasks'}`);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => {
          if (!open) refetch();
          setOpen(!open);
        }}
        title="Reminders"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          borderRadius: 8,
          border: '1px solid var(--line)',
          color: badge > 0 ? 'var(--gold-deep)' : 'var(--ink-mid)',
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        <HiOutlineBell style={{ width: 15, height: 15 }} />
        {badge > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -5,
              right: -5,
              minWidth: 15,
              height: 15,
              borderRadius: 8,
              background: 'var(--gold)',
              color: 'white',
              fontSize: 9,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
            }}
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* click-outside catcher */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 8px)',
              width: 320,
              zIndex: 31,
              background: 'var(--bg-panel)',
              border: '1px solid var(--line-soft)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.14)',
              overflow: 'hidden',
            }}
          >
            <div style={{ maxHeight: 380, overflowY: 'auto', padding: '8px 0' }}>
              {total === 0 ? (
                <div
                  style={{
                    padding: '28px 16px',
                    textAlign: 'center',
                    fontSize: 12.5,
                    fontStyle: 'italic',
                    color: 'var(--ink-dim)',
                  }}
                >
                  You&rsquo;re all caught up.
                </div>
              ) : (
                groups.map(
                  ([label, items]) =>
                    items.length > 0 && (
                      <div key={label} style={{ paddingBottom: 4 }}>
                        <div
                          className="uppercase-eyebrow"
                          style={{
                            fontSize: 9,
                            padding: '8px 16px 4px',
                            color: label === 'Overdue' ? 'var(--err)' : undefined,
                          }}
                        >
                          {label}
                        </div>
                        {items.map((item) => (
                          <ReminderRow
                            key={`${item.kind}-${item.id}`}
                            item={item}
                            isNew={fresh.has(keyOf(label, item))}
                            onOpen={go}
                          />
                        ))}
                      </div>
                    ),
                )
              )}
            </div>
            <button
              onClick={() => {
                setOpen(false);
                navigate(`${basePath}/settings`);
              }}
              style={{
                width: '100%',
                padding: '9px 16px',
                fontSize: 11.5,
                color: 'var(--ink-dim)',
                background: 'var(--bg-raised)',
                borderTop: '1px solid var(--line-soft)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Reminder settings
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Workspace switcher ───────────────────────────────────────────────────────

/** Letter tile that gives each wedding a stable visual identity in lists. */
function WeddingMonogram({ title, size = 26 }: { title: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--gold-glow)',
        border: '1px solid var(--gold-glow)',
        color: 'var(--gold-deep)',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: Math.round(size * 0.54),
        lineHeight: 1,
      }}
    >
      {(title.trim().charAt(0) || 'W').toUpperCase()}
    </span>
  );
}

function RoleChip({ isOwner, role }: { isOwner: boolean; role: string }) {
  return (
    <span
      style={{
        fontSize: 8.5,
        fontWeight: 600,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: 999,
        flexShrink: 0,
        background: isOwner ? 'var(--gold-glow)' : 'var(--bg-raised)',
        color: isOwner ? 'var(--gold-deep)' : 'var(--ink-low)',
      }}
    >
      {isOwner ? 'owner' : role}
    </span>
  );
}

type SwitcherWedding = {
  id: string;
  slug: string | null;
  title: string;
  role: string;
  isOwner: boolean;
};

/**
 * The sidebar brand block doubling as the workspace switcher: the couple's
 * names in display type ARE the trigger (no separate button repeating the
 * wedding title), with a meta line carrying date/role/counts and a popover
 * listing every wedding the user owns or collaborates on (grouped owned/
 * shared), pending-invite count, and the doors to /weddings/new and /hub.
 */
function WeddingSwitcher({
  brideName,
  groomName,
  weddingDate,
  weddings,
  activeWeddingId,
  pendingInviteCount,
  onPick,
}: {
  brideName: string;
  groomName: string;
  weddingDate: string;
  weddings: SwitcherWedding[];
  activeWeddingId: string | null;
  pendingInviteCount: number;
  onPick: (w: { id: string; slug: string | null; title: string }) => void;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useModalDismiss(open, () => setOpen(false));

  // Close on any click outside the switcher — more robust than the backdrop,
  // which sibling UI in a higher stacking context (sidebar nav) can occlude.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const active = weddings.find((w) => w.id === activeWeddingId);
  const shared = weddings.filter((w) => !w.isOwner);
  const owned = weddings.filter((w) => w.isOwner);
  // Eyebrow labels only earn their space once both groups exist.
  const groups: Array<[string | null, SwitcherWedding[]]> =
    shared.length > 0 && owned.length > 0
      ? [
          ['Your weddings', owned],
          ['Shared with you', shared],
        ]
      : [[null, weddings]];

  const hoverable = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.background = 'var(--bg-raised)';
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.background = 'transparent';
    },
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '8px 12px',
    fontSize: 12.5,
    color: 'var(--ink-mid)',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 120ms',
  };

  const weddingRow = (w: SwitcherWedding) => {
    const isActive = w.id === activeWeddingId;
    return (
      <button
        key={w.id}
        {...(isActive ? {} : hoverable)}
        style={{
          ...itemStyle,
          ...(isActive ? { background: 'var(--gold-glow)', cursor: 'default' } : {}),
        }}
        onClick={() => {
          setOpen(false);
          if (!isActive) onPick(w);
        }}
      >
        <WeddingMonogram title={w.title} size={24} />
        <span style={{ minWidth: 0, flex: 1 }}>
          <span
            style={{
              display: 'block',
              fontWeight: isActive ? 600 : 450,
              color: isActive ? 'var(--gold-deep)' : 'var(--ink-high)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {w.title}
          </span>
          <span
            className="mono"
            style={{
              display: 'block',
              fontSize: 10,
              color: 'var(--ink-dim)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {w.slug ? publicSiteLabel(w.slug) : 'no public site yet'}
          </span>
        </span>
        {isActive ? (
          <HiCheck style={{ width: 14, height: 14, flexShrink: 0, color: 'var(--gold-deep)' }} />
        ) : (
          <RoleChip isOwner={w.isOwner} role={w.role} />
        )}
      </button>
    );
  };

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Switch wedding"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: 'block',
          width: '100%',
          padding: '24px 24px 18px',
          textAlign: 'left',
          background: open ? 'var(--bg-raised)' : 'transparent',
          cursor: 'pointer',
          transition: 'background 120ms',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-raised)';
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = 'transparent';
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span className="uppercase-eyebrow">The Wedding of</span>
          <HiOutlineChevronRight
            style={{
              width: 12,
              height: 12,
              flexShrink: 0,
              color: 'var(--ink-dim)',
              transform: open ? 'rotate(-90deg)' : 'rotate(90deg)',
              transition: 'transform 150ms',
            }}
          />
        </span>
        {/* Long name pairs wrap to a second line — never ellipsize the couple */}
        <span
          className="display"
          style={{
            display: 'block',
            fontSize: 21,
            lineHeight: 1.2,
            color: 'var(--ink-high)',
            overflowWrap: 'break-word',
          }}
        >
          {brideName}{' '}
          <span style={{ fontStyle: 'italic', color: 'var(--gold)', fontSize: 17 }}>&amp;</span>{' '}
          {groomName}
        </span>
        <span
          className="mono"
          style={{
            display: 'block',
            marginTop: 7,
            fontSize: 9.5,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: 'var(--ink-dim)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {weddingDate || (active ? (active.isOwner ? 'owner' : active.role) : 'My wedding')}
          {weddingDate && active && !active.isOwner && ` · ${active.role}`}
          {weddings.length > 1 && ` · ${weddings.length} weddings`}
          {pendingInviteCount > 0 && (
            <span style={{ color: 'var(--gold-deep)', fontWeight: 600 }}>
              {' · '}
              {pendingInviteCount} invite{pendingInviteCount === 1 ? '' : 's'}
            </span>
          )}
        </span>
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div
            role="menu"
            style={{
              position: 'absolute',
              top: '100%',
              left: 16,
              right: 16,
              zIndex: 41,
              background: 'var(--bg-panel)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.16)',
              overflow: 'hidden',
            }}
          >
            <div style={{ maxHeight: 300, overflowY: 'auto', padding: '6px 0' }}>
              {groups.map(([label, group]) => (
                <div key={label ?? 'all'}>
                  {label && (
                    <div
                      className="uppercase-eyebrow"
                      style={{ fontSize: 9, padding: '8px 12px 4px' }}
                    >
                      {label}
                    </div>
                  )}
                  {group.map(weddingRow)}
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--line-soft)', padding: '4px 0' }}>
              <button
                {...hoverable}
                style={{ ...itemStyle, color: 'var(--gold-deep)', fontWeight: 500 }}
                onClick={() => {
                  setOpen(false);
                  window.location.assign(apexHref('/weddings/new'));
                }}
              >
                <HiOutlinePlus style={{ width: 14, height: 14, flexShrink: 0, margin: '0 5px' }} />
                Plan a new wedding
              </button>
              <button
                {...hoverable}
                style={itemStyle}
                onClick={() => {
                  setOpen(false);
                  navigate('/hub?manage=1');
                }}
              >
                <HiOutlineViewGrid
                  style={{
                    width: 14,
                    height: 14,
                    flexShrink: 0,
                    margin: '0 5px',
                    color: 'var(--ink-dim)',
                  }}
                />
                <span style={{ flex: 1 }}>All weddings &amp; invites</span>
                {pendingInviteCount > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#fff',
                      background: 'var(--gold-deep)',
                      borderRadius: 999,
                      padding: '1px 7px',
                      flexShrink: 0,
                    }}
                  >
                    {pendingInviteCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <PageHeaderProvider>
      <DashboardLayoutInner />
    </PageHeaderProvider>
  );
}

function DashboardLayoutInner() {
  const { logout, user, slug: authSlug, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const urlSlug = useWeddingSlug();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // The location's slug is cosmetic; the authenticated slug (which accounts
  // for wedding-member access) is the source of truth. Correct the URL if they
  // ever diverge so branding/data can't come from someone else's wedding — on
  // a wedding subdomain that means moving to a different origin.
  useEffect(() => {
    if (loading || !isAuthenticated || !authSlug || !urlSlug || urlSlug === authSlug) return;
    const withinWedding = TENANT_SLUG
      ? location.pathname
      : location.pathname.replace(`/${urlSlug}`, '');
    goToWedding(authSlug, withinWedding, navigate, { replace: true });
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

  const basePath = weddingPath(slug ?? '', '/dashboard');
  const subPath = location.pathname.replace(basePath, '') || '';
  const currentCrumb = CRUMB_MAP[subPath] ?? subPath.replace('/', '');
  // Pages opted into usePageHeader() replace this crumb with their real title
  // (+ inline nav/action) directly in the topbar; others fall back to the crumb.
  const pageHeader = useTopbarHeader();

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
  const [pendingSwitch, setPendingSwitch] = useState<{
    id: string;
    slug: string | null;
    title: string;
  } | null>(null);

  const handleLogout = () => {
    logout();
    if (slug) goToWedding(slug, '/login', navigate, { replace: true });
    else navigate('/login', { replace: true });
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
    return slug ? <WeddingRedirect slug={slug} path="/login" /> : <Navigate to="/login" replace />;
  }

  // Signed in but no wedding (deleted their last one, or membership revoked):
  // the hub is home — it offers create-or-join instead of a broken dashboard.
  if (!authSlug) {
    const hub = apexHref('/hub');
    if (hub.startsWith('/')) return <Navigate to={hub} replace />;
    window.location.replace(hub);
    return null;
  }

  // Deep link into a section this member can't access → back to Overview
  if (currentSectionBlocked) {
    return <Navigate to={basePath} replace />;
  }

  return (
    <div
      className="flex print-expand"
      style={{ background: 'var(--bg-page)', height: '100dvh', overflow: 'hidden' }}
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
          maxWidth: '85vw',
          flexShrink: 0,
          background: 'var(--bg-panel)',
          borderRight: '1px solid var(--line-soft)',
          height: '100dvh',
          overflowY: 'hidden',
        }}
      >
        {/* Brand block = workspace switcher (one unit, no repeated names) */}
        <WeddingSwitcher
          brideName={brideName}
          groomName={groomName}
          weddingDate={weddingDate}
          weddings={weddings}
          activeWeddingId={weddingData?.activeWeddingId ?? null}
          pendingInviteCount={weddingData?.pendingInviteCount ?? 0}
          onPick={(w) => setPendingSwitch(w)}
        />

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
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(179,55,47,0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <HiOutlineLogout style={{ width: 14, height: 14 }} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <div
        className="print-expand"
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh',
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
            gap: 12,
            padding: '14px clamp(12px, 3vw, 28px)',
            borderBottom: '1px solid var(--line-soft)',
            background: 'rgba(250,246,239,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            position: 'sticky',
            top: 0,
            zIndex: 20,
          }}
        >
          {/* Mobile hamburger + page title/nav (pages opt in via usePageHeader;
              others fall back to the plain breadcrumb) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
              style={{
                padding: 6,
                borderRadius: 6,
                color: 'var(--ink-mid)',
                background: 'transparent',
                flexShrink: 0,
              }}
            >
              <HiOutlineMenu style={{ width: 20, height: 20 }} />
            </button>
            {pageHeader ? (
              <>
                <h1
                  className="display"
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.1,
                    margin: 0,
                    color: 'var(--ink-high)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {pageHeader.title}
                </h1>
                {pageHeader.nav && (
                  <nav
                    className="hidden sm:flex overflow-x-auto"
                    style={{ gap: 2, minWidth: 0 }}
                  >
                    {pageHeader.nav}
                  </nav>
                )}
              </>
            ) : (
              <div
                className="mono hidden sm:flex"
                style={{ alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-low)' }}
              >
                <span>dashboard</span>
                <HiOutlineChevronRight style={{ width: 12, height: 12 }} />
                <span style={{ color: 'var(--ink-mid)' }}>{currentCrumb}</span>
              </div>
            )}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {pageHeader?.action}
            <RemindersBell basePath={basePath} />
            {/* Print — only where the page is a printable document (see
                PRINTABLE_PATHS); Overview/Gallery/Settings/Site Studio would
                just print dashboard chrome */}
            {PRINTABLE_PATHS.has(subPath) && (
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
            {/* View site — Overview only; on other tabs it's noise, and the
                Site Studio has its own per-page "Open live" control */}
            {subPath === '' && (
              <NavLink
                to={weddingPath(slug ?? '')}
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
            )}
          </div>
        </header>

        {/* Page content — the Site Studio manages its own full-height chrome */}
        <main
          className="print-expand"
          style={{
            flex: 1,
            padding: subPath === '/website' ? 0 : 'clamp(16px, 3.5vw, 32px) clamp(14px, 4vw, 40px)',
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
        message={`Open ${pendingSwitch?.title ?? ''}? The page will reload and any unsaved changes here will be lost.`}
        confirmLabel="Switch"
        isPending={setActiveWedding.isPending}
        onConfirm={() => {
          if (!pendingSwitch) return;
          setActiveWedding.mutate({
            weddingId: pendingSwitch.id,
            href: pendingSwitch.slug ? weddingHref(pendingSwitch.slug, '/dashboard') : undefined,
          });
        }}
        onCancel={() => setPendingSwitch(null)}
      />
    </div>
  );
}
