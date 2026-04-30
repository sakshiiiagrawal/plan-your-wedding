/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useDashboardStats,
  useDashboardSummary,
  useHeroContent,
  useExpenseOverview,
  useUpcomingTasks,
  useVendors,
  useGuestSummary,
  useRecentActivity,
} from '../../hooks/useApi';
import {
  HiOutlineUserGroup,
  HiOutlineCurrencyRupee,
  HiOutlineClipboardList,
  HiOutlineBriefcase,
  HiOutlineBell,
  HiOutlineHome,
  HiOutlineGlobe,
  HiOutlinePhotograph,
  HiOutlineChevronRight,
} from 'react-icons/hi';
import { CornerFlourish, Ornament, ProgressRing, KPICard } from '../../components/ui';

interface Countdown { days: number; hours: number; minutes: number; seconds: number; }

const EVENT_COLORS = ['#8B0000', '#B8860B', '#5C6BC0', '#2E7D32', '#6A1B9A', '#0277BD'];

function fmtLakh(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

const QUICK_ACTIONS = [
  { label: 'Add guest',         icon: HiOutlineUserGroup,    path: '/guests' },
  { label: 'Send RSVP reminder',icon: HiOutlineBell,         path: '/guests' },
  { label: 'Assign rooms',      icon: HiOutlineHome,         path: '/accommodations' },
  { label: 'Log expense',       icon: HiOutlineCurrencyRupee,path: '/expense' },
  { label: 'Upload to gallery', icon: HiOutlinePhotograph,   path: '/gallery' },
  { label: 'Publish website',   icon: HiOutlineGlobe,        path: '/website' },
];

export default function Dashboard() {
  const { slug } = useParams<{ slug: string }>();
  const [cd, setCd] = useState<Countdown>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const { data: stats } = useDashboardStats();
  const { data: summary } = useDashboardSummary();
  const { data: heroContent } = useHeroContent(slug);
  const { data: expenseOverview = [] } = useExpenseOverview();
  const { data: upcomingTasks = [] } = useUpcomingTasks();
  const { data: vendors = [] } = useVendors();
  const { data: guestSummary } = useGuestSummary();
  const { data: recentActivity = [] } = useRecentActivity();

  const brideName = heroContent?.bride_name || 'Bride';
  const groomName = heroContent?.groom_name || 'Groom';
  const tagline   = heroContent?.tagline || '';
  const weddingDateStr = heroContent?.wedding_date;

  useEffect(() => {
    if (!weddingDateStr) return;
    const target = new Date(weddingDateStr).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff > 0) {
        setCd({
          days:    Math.floor(diff / 86400000),
          hours:   Math.floor((diff % 86400000) / 3600000),
          minutes: Math.floor((diff % 3600000) / 60000),
          seconds: Math.floor((diff % 60000) / 1000),
        });
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [weddingDateStr]);

  const events      = summary?.events || [];
  const rsvpConfirmed = guestSummary?.confirmed ?? stats?.rsvp?.confirmed ?? 0;
  const rsvpPending   = guestSummary?.pending   ?? stats?.rsvp?.pending   ?? 0;
  const rsvpDeclined  = guestSummary?.declined  ?? 0;
  const totalGuests   = guestSummary?.total     ?? stats?.guests?.total   ?? 0;

  const budgetPaid    = stats?.expense?.paid ?? 0;
  const budgetTotal   = expenseOverview.reduce((s: number, c: any) => s + (c.allocated ?? 0), 0);
  const tasksCompleted= stats?.tasks?.completed ?? 0;
  const tasksPending  = stats?.tasks?.pending   ?? 0;
  const tasksTotal    = tasksCompleted + tasksPending;

  const rsvpPct   = totalGuests > 0 ? rsvpConfirmed / totalGuests : 0;
  const budgetPct = budgetTotal > 0 ? budgetPaid / budgetTotal     : 0;
  const tasksPct  = tasksTotal  > 0 ? tasksCompleted / tasksTotal  : 0;

  const formattedDate = weddingDateStr
    ? new Date(weddingDateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const cdUnits = [
    { value: cd.days,    label: 'Days' },
    { value: cd.hours,   label: 'Hours' },
    { value: cd.minutes, label: 'Minutes' },
    { value: cd.seconds, label: 'Seconds' },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div
        className="card card-ornate fade-up"
        style={{ padding: '40px 48px', marginBottom: 28, position: 'relative', overflow: 'hidden', textAlign: 'center' }}
      >
        <CornerFlourish size={56} rotate={0}   style={{ position: 'absolute', top: 18, left: 18,     color: 'var(--gold)', opacity: 0.6 }} />
        <CornerFlourish size={56} rotate={90}  style={{ position: 'absolute', top: 18, right: 18,    color: 'var(--gold)', opacity: 0.6 }} />
        <CornerFlourish size={56} rotate={270} style={{ position: 'absolute', bottom: 18, left: 18,  color: 'var(--gold)', opacity: 0.6 }} />
        <CornerFlourish size={56} rotate={180} style={{ position: 'absolute', bottom: 18, right: 18, color: 'var(--gold)', opacity: 0.6 }} />

        <div className="uppercase-eyebrow" style={{ marginBottom: 14 }}>Together with their families</div>
        <Ornament mark="❋" />
        <h1
          className="display"
          style={{ fontSize: 68, margin: '18px 0 4px', fontWeight: 400, letterSpacing: '0.01em', color: 'var(--ink-high)' }}
        >
          {brideName}
          <span style={{ fontStyle: 'italic', color: 'var(--gold)', fontSize: 52, margin: '0 16px' }}>&amp;</span>
          {groomName}
        </h1>
        {tagline && (
          <p className="display ink-mid" style={{ fontStyle: 'italic', fontSize: 18, margin: '4px 0 22px' }}>
            {tagline}
          </p>
        )}
        <Ornament mark="◆" />

        {/* Date / Venue / City row */}
        {formattedDate && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 36, marginTop: 26, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="uppercase-eyebrow">Date</div>
              <div className="display" style={{ fontSize: 18, marginTop: 3, color: 'var(--ink-high)' }}>{formattedDate}</div>
            </div>
          </div>
        )}

        {/* Countdown */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 34, alignItems: 'center', flexWrap: 'wrap' }}>
          {cdUnits.map((u, i) => (
            <>
              <div key={u.label} style={{ textAlign: 'center', minWidth: 72 }}>
                <div
                  className="display tnum"
                  style={{ fontSize: 44, lineHeight: 1, color: 'var(--gold-soft)', fontWeight: 500 }}
                >
                  {String(u.value).padStart(2, '0')}
                </div>
                <div className="uppercase-eyebrow" style={{ color: 'var(--ink-low)', fontSize: 10, marginTop: 4 }}>
                  {u.label}
                </div>
              </div>
              {i < cdUnits.length - 1 && (
                <div className="display" style={{ color: 'var(--gold)', fontSize: 28 }}>·</div>
              )}
            </>
          ))}
        </div>
      </div>

      {/* ── KPI Strip ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <KPICard
          eyebrow="RSVPs confirmed"
          value={rsvpConfirmed}
          suffix={`of ${totalGuests}`}
          hint={`${rsvpPending} pending · ${rsvpDeclined} regrets`}
          accent
        />
        <KPICard
          eyebrow="Budget spent"
          value={fmtLakh(budgetPaid)}
          {...(budgetTotal > 0 ? { suffix: `of ${fmtLakh(budgetTotal)}` } : {})}
          hint={budgetTotal > 0 ? `${Math.round(budgetPct * 100)}% of total budget` : 'No budget set'}
        />
        <KPICard
          eyebrow="Tasks done"
          value={String(tasksCompleted)}
          suffix={`/ ${tasksTotal}`}
          hint={`${Math.round(tasksPct * 100)}% complete · ${tasksPending} open`}
        />
        <KPICard
          eyebrow="Vendors booked"
          value={vendors.length}
          suffix="total vendors"
          hint={`${vendors.filter((v: any) => (v.finance_summary?.paid_amount ?? 0) > 0).length} with payments logged`}
          accent
        />
      </div>

      {/* ── Two-column: Timeline + Tasks ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 28 }}>

        {/* Events timeline */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <div className="uppercase-eyebrow">The Festivities</div>
              <h2 className="display" style={{ margin: '3px 0 0', fontSize: 22, color: 'var(--ink-high)', fontWeight: 500 }}>
                {events.length > 0 ? `${events.length} days of celebration` : 'Events & timeline'}
              </h2>
            </div>
            <Link
              to={`/${slug}/dashboard/events`}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--gold-deep)', textDecoration: 'none' }}
            >
              All events <HiOutlineChevronRight style={{ width: 12, height: 12 }} />
            </Link>
          </div>

          {events.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-dim)', textAlign: 'center', padding: '24px 0' }}>
              No events yet — add your first event.
            </p>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Vertical timeline gradient line */}
              <div style={{
                position: 'absolute', left: 10, top: 18, bottom: 18, width: 1,
                background: 'linear-gradient(180deg, transparent, var(--gold-glow), var(--gold-glow), transparent)',
              }} />
              <div>
                {events.map((ev: any, i: number) => {
                  const color = EVENT_COLORS[i % EVENT_COLORS.length];
                  const date  = new Date(ev.event_date);
                  const dayStr  = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  const timeStr = ev.start_time ? ev.start_time.slice(0, 5) : '';
                  return (
                    <div key={ev.id} style={{ display: 'flex', gap: 18, padding: '10px 0', position: 'relative' }}>
                      <div style={{
                        width: 21, height: 21, borderRadius: '50%',
                        background: 'var(--bg-panel)', border: `1.5px solid ${color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, marginTop: 2, zIndex: 1, fontSize: 12,
                      }}>
                        {ev.icon || '🎊'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                          <span className="display" style={{ fontSize: 18, color: 'var(--ink-high)' }}>{ev.name}</span>
                          <span className="mono ink-low" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                            {dayStr.toUpperCase()}{timeStr ? ` · ${timeStr}` : ''}
                          </span>
                        </div>
                        {ev.theme && (
                          <div style={{ fontSize: 12, color: 'var(--ink-low)', marginTop: 2 }}>Theme: {ev.theme}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Progress rings + tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Progress rings */}
          <div className="card">
            <div className="uppercase-eyebrow" style={{ marginBottom: 14 }}>Progress</div>
            <div style={{ display: 'flex', gap: 18, justifyContent: 'space-around' }}>
              <ProgressRing value={rsvpPct}   size={76} label={`${Math.round(rsvpPct * 100)}%`}   sublabel="RSVP" />
              <ProgressRing value={budgetPct} size={76} label={`${Math.round(budgetPct * 100)}%`} sublabel="Budget" />
              <ProgressRing value={tasksPct}  size={76} label={`${Math.round(tasksPct * 100)}%`}  sublabel="Tasks" />
            </div>
          </div>

          {/* Open tasks */}
          <div className="card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div className="uppercase-eyebrow">Up next</div>
                <h3 className="display" style={{ margin: '3px 0 0', fontSize: 18, color: 'var(--ink-high)', fontWeight: 500 }}>Open tasks</h3>
              </div>
              <Link to={`/${slug}/dashboard/tasks`} style={{ fontSize: 12, color: 'var(--gold-deep)', textDecoration: 'none' }}>→</Link>
            </div>

            {upcomingTasks.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ink-dim)', textAlign: 'center', padding: '16px 0' }}>All tasks done! 🎉</p>
            ) : (
              <div>
                {upcomingTasks.slice(0, 5).map((t: any) => {
                  const isInProgress = t.status === 'in_progress';
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid var(--line-soft)' }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                        border: `1.5px solid ${isInProgress ? 'var(--gold)' : 'var(--line-strong)'}`,
                        background: isInProgress ? 'var(--gold-glow)' : 'transparent',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: 'var(--ink-high)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-low)' }}>
                          {t.assigned_to}
                        </div>
                      </div>
                      {t.due_date && (
                        <span className="pill muted" style={{ fontSize: 10, flexShrink: 0 }}>
                          {new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom: Activity + Quick Actions ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent activity */}
        <div className="card">
          <div className="uppercase-eyebrow" style={{ marginBottom: 14 }}>Recent activity</div>
          {recentActivity.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-dim)', textAlign: 'center', padding: '24px 0' }}>
              No recent activity yet.
            </p>
          ) : (
            recentActivity.map((a, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, padding: '9px 0', alignItems: 'center',
                borderTop: i === 0 ? 0 : '1px solid var(--line-soft)',
              }}>
                <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                  {a.actor_name ? a.actor_name[0].toUpperCase() : '◆'}
                </div>
                <div style={{ flex: 1, fontSize: 13 }}>
                  {a.actor_name && (
                    <span style={{ color: 'var(--ink-high)', fontWeight: 500 }}>{a.actor_name} </span>
                  )}
                  <span className="ink-low">{a.what}</span>
                </div>
                <div className="mono ink-dim" style={{ fontSize: 11, flexShrink: 0 }}>{a.when}</div>
              </div>
            ))
          )}
        </div>

        {/* Quick actions */}
        <div className="card">
          <div className="uppercase-eyebrow" style={{ marginBottom: 14 }}>Quick actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.label}
                to={`/${slug}/dashboard${action.path}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--line-soft)',
                  background: 'transparent',
                  color: 'var(--ink-mid)',
                  fontSize: 13,
                  textDecoration: 'none',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--ink-high)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--line-soft)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--ink-mid)';
                }}
              >
                <action.icon style={{ width: 15, height: 15, color: 'var(--gold)', flexShrink: 0 }} />
                <span>{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
