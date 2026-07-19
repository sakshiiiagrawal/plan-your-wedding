/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDashboardOverview, useExpenseAlerts } from '../../hooks/useApi';
import {
  HiOutlineUserGroup,
  HiOutlineCurrencyRupee,
  HiOutlineHome,
  HiOutlineGlobe,
  HiOutlinePhotograph,
  HiOutlineChevronRight,
} from 'react-icons/hi';
import { CornerFlourish, Ornament, ProgressRing } from '../../components/ui';
import { formatDate, parseLocalDate } from '../../utils/date';
import { formatCurrencyCompact } from '../../utils/currency';
import { useAuth } from '../../contexts/AuthContext';
import { financeTier } from '@wedding-planner/shared';
import { EVENT_ICONS } from './Events';

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const EVENT_COLORS = ['#6B1F2A', '#8C6D2F', '#5C6BC0', '#2E7D32', '#6A1B9A', '#0277BD'];

const fmtLakh = formatCurrencyCompact;

const QUICK_ACTIONS = [
  { label: 'Add guest', icon: HiOutlineUserGroup, path: '/guests' },
  { label: 'Assign rooms', icon: HiOutlineHome, path: '/accommodations' },
  { label: 'Log expense', icon: HiOutlineCurrencyRupee, path: '/budget' },
  { label: 'Upload to gallery', icon: HiOutlinePhotograph, path: '/gallery' },
  { label: 'Publish website', icon: HiOutlineGlobe, path: '/website' },
];

function RingStat({
  value,
  label,
  caption,
  hint,
}: {
  value: number;
  label: string;
  caption: string;
  hint?: string | undefined;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
      <ProgressRing value={value} size={56} label={`${Math.round(value * 100)}%`} />
      <div>
        <div className="uppercase-eyebrow" style={{ fontSize: 10 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-mid)', marginTop: 2 }}>{caption}</div>
        {hint && <div style={{ fontSize: 10, color: 'var(--ink-low)', marginTop: 1 }}>{hint}</div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const canSeeMoney = financeTier(user) !== 'none';
  const [cd, setCd] = useState<Countdown>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [cdPhase, setCdPhase] = useState<'counting' | 'today' | 'past'>('counting');

  const { data: overview, isLoading } = useDashboardOverview();
  const { data: paymentAlerts } = useExpenseAlerts();
  const stats = overview?.stats;
  const heroContent = overview?.hero;
  const expenseOverview = overview?.expenseOverview ?? [];
  const upcomingTasks = overview?.upcomingTasks ?? [];
  const vendors = overview?.vendors ?? [];
  const guestSummary = overview?.guestSummary;
  const recentActivity = overview?.activity ?? [];

  const brideName = heroContent?.bride_name || 'Bride';
  const groomName = heroContent?.groom_name || 'Groom';
  const tagline = heroContent?.tagline || '';
  const weddingDateStr = heroContent?.wedding_date;

  useEffect(() => {
    if (!weddingDateStr) return;
    const target = parseLocalDate(weddingDateStr).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff > 0) {
        setCdPhase('counting');
        setCd({
          days: Math.floor(diff / 86400000),
          hours: Math.floor((diff % 86400000) / 3600000),
          minutes: Math.floor((diff % 3600000) / 60000),
          seconds: Math.floor((diff % 60000) / 1000),
        });
      } else {
        // The whole wedding day counts as "today"; only after it is it past.
        setCdPhase(diff > -86400000 ? 'today' : 'past');
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [weddingDateStr]);

  const events = overview?.events || [];
  const rsvpConfirmed = guestSummary?.confirmed ?? stats?.rsvp?.confirmed ?? 0;
  const rsvpPending = guestSummary?.pending ?? stats?.rsvp?.pending ?? 0;
  const rsvpDeclined = guestSummary?.declined ?? 0;
  const totalGuests = guestSummary?.total ?? stats?.guests?.total ?? 0;

  const budgetPaid = stats?.expense?.paid ?? 0;
  const budgetPlanned = stats?.expense?.planned ?? 0;
  const budgetAllocated = stats?.expense?.committed ?? 0;
  const budgetOutstanding = stats?.expense?.outstanding ?? 0;
  // Wedding-level budget when set; otherwise fall back to the sum of category
  // budgets (the API field is allocated_amount, not allocated).
  const categoryBudgetTotal = expenseOverview.reduce(
    (s: number, c: any) => s + Number(c.allocated_amount ?? 0),
    0,
  );
  const weddingBudget = Number(stats?.expense?.total ?? 0);
  const budgetTotal = weddingBudget > 0 ? weddingBudget : categoryBudgetTotal;
  const tasksCompleted = stats?.tasks?.completed ?? 0;
  const tasksPending = stats?.tasks?.pending ?? 0;
  const tasksTotal = tasksCompleted + tasksPending;

  // The ring only carries Paid; the hint restores the rest of the money story.
  // Planned is dropped when nothing is pencilled in, so it never reads as ₹0.
  const budgetHint =
    [
      budgetPlanned > 0 ? `${fmtLakh(budgetPlanned)} planned` : null,
      budgetAllocated > 0 ? `${fmtLakh(budgetAllocated)} allocated` : null,
      budgetOutstanding > 0 ? `${fmtLakh(budgetOutstanding)} outstanding` : null,
    ]
      .filter(Boolean)
      .join(' · ') || undefined;

  const rsvpPct = totalGuests > 0 ? rsvpConfirmed / totalGuests : 0;
  const budgetPct = budgetTotal > 0 ? budgetPaid / budgetTotal : 0;
  const tasksPct = tasksTotal > 0 ? tasksCompleted / tasksTotal : 0;

  const vendorsBooked = vendors.filter(
    (v: any) => (v.finance_summary?.committed_amount ?? 0) > 0,
  ).length;

  const isFreshAccount =
    totalGuests === 0 && tasksTotal === 0 && vendors.length === 0 && events.length === 0;

  const formattedDate = weddingDateStr
    ? formatDate(weddingDateStr, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const cdUnits = [
    { value: cd.days, label: 'Days' },
    { value: cd.hours, label: 'Hours' },
    { value: cd.minutes, label: 'Minutes' },
    { value: cd.seconds, label: 'Seconds' },
  ];

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '96px 0',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '3px solid var(--line-soft)',
            borderTopColor: 'var(--gold)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div
        className="card card-ornate fade-up"
        style={{
          padding: 'clamp(24px, 5vw, 40px) clamp(16px, 5vw, 48px)',
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        <CornerFlourish
          size={56}
          rotate={0}
          style={{ position: 'absolute', top: 18, left: 18, color: 'var(--gold)', opacity: 0.6 }}
        />
        <CornerFlourish
          size={56}
          rotate={90}
          style={{ position: 'absolute', top: 18, right: 18, color: 'var(--gold)', opacity: 0.6 }}
        />
        <CornerFlourish
          size={56}
          rotate={270}
          style={{ position: 'absolute', bottom: 18, left: 18, color: 'var(--gold)', opacity: 0.6 }}
        />
        <CornerFlourish
          size={56}
          rotate={180}
          style={{
            position: 'absolute',
            bottom: 18,
            right: 18,
            color: 'var(--gold)',
            opacity: 0.6,
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'clamp(24px, 4vw, 56px)',
            flexWrap: 'wrap',
          }}
        >
        <div style={{ flex: '1 1 340px' }}>
        <div className="uppercase-eyebrow" style={{ marginBottom: 14 }}>
          Together with their families
        </div>
        <Ornament mark="❋" />
        <h1
          className="display"
          style={{
            fontSize: 'clamp(32px, 8vw, 68px)',
            margin: '18px 0 4px',
            fontWeight: 400,
            letterSpacing: '0.01em',
            color: 'var(--ink-high)',
            overflowWrap: 'break-word',
          }}
        >
          {brideName}
          <span
            style={{
              fontStyle: 'italic',
              color: 'var(--gold)',
              fontSize: 'clamp(26px, 6vw, 52px)',
              margin: '0 clamp(8px, 2vw, 16px)',
            }}
          >
            &amp;
          </span>
          {groomName}
        </h1>
        {tagline && (
          <p
            className="display ink-mid"
            style={{ fontStyle: 'italic', fontSize: 18, margin: '4px 0 22px' }}
          >
            {tagline}
          </p>
        )}
        <Ornament mark="◆" />

        {/* Date / Venue / City row */}
        {formattedDate && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 36,
              marginTop: 26,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div className="uppercase-eyebrow">Date</div>
              <div
                className="display"
                style={{ fontSize: 18, marginTop: 3, color: 'var(--ink-high)' }}
              >
                {formattedDate}
              </div>
            </div>
          </div>
        )}

        {/* Countdown */}
        {!weddingDateStr ? (
          <div style={{ marginTop: 34 }}>
            <Link
              to={`/${slug}/dashboard/website`}
              className="display"
              style={{ fontSize: 18, fontStyle: 'italic', color: 'var(--gold-deep)' }}
            >
              Set your wedding date to start the countdown →
            </Link>
          </div>
        ) : cdPhase === 'today' ? (
          <div
            className="display"
            style={{ marginTop: 34, fontSize: 32, color: 'var(--gold-soft)' }}
          >
            Today is the day! 🎊
          </div>
        ) : cdPhase === 'past' ? (
          <div
            className="display"
            style={{ marginTop: 34, fontSize: 32, color: 'var(--gold-soft)' }}
          >
            Just married! 🎉
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 18,
              marginTop: 34,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {cdUnits.map((u, i) => (
              <Fragment key={u.label}>
                <div style={{ textAlign: 'center', minWidth: 'clamp(56px, 15vw, 72px)' }}>
                  <div
                    className="display tnum"
                    style={{
                      fontSize: 'clamp(30px, 7vw, 44px)',
                      lineHeight: 1,
                      color: 'var(--gold-soft)',
                      fontWeight: 500,
                    }}
                  >
                    {String(u.value).padStart(2, '0')}
                  </div>
                  <div
                    className="uppercase-eyebrow"
                    style={{ color: 'var(--ink-low)', fontSize: 10, marginTop: 4 }}
                  >
                    {u.label}
                  </div>
                </div>
                {i < cdUnits.length - 1 && (
                  <div className="display" style={{ color: 'var(--gold)', fontSize: 28 }}>
                    ·
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            borderLeft: '1px solid var(--line-soft)',
            paddingLeft: 'clamp(24px, 3vw, 40px)',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, auto)',
              gap: '20px clamp(24px, 3vw, 40px)',
            }}
          >
            <RingStat
              value={rsvpPct}
              label="RSVP"
              caption={`${rsvpConfirmed} of ${totalGuests}`}
              hint={`${rsvpPending} pending · ${rsvpDeclined} regrets`}
            />
            <RingStat
              value={tasksPct}
              label="Tasks"
              caption={`${tasksCompleted} of ${tasksTotal}`}
            />
            {canSeeMoney && (
              <RingStat
                value={budgetPct}
                label="Budget"
                caption={budgetTotal > 0 ? fmtLakh(budgetPaid) : 'No budget set'}
                hint={budgetHint}
              />
            )}
            <RingStat
              value={vendors.length > 0 ? vendorsBooked / vendors.length : 0}
              label="Vendors"
              caption={`${vendorsBooked} of ${vendors.length}`}
            />
          </div>

          {/* Payments due */}
          {canSeeMoney &&
            paymentAlerts &&
            (paymentAlerts.overdueCount > 0 || paymentAlerts.upcomingCount > 0) && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <div className="uppercase-eyebrow">Payments due</div>
                  <Link
                    to={`/${slug}/dashboard/expense?tab=payments`}
                    style={{ fontSize: 12, color: 'var(--gold-deep)', textDecoration: 'none' }}
                  >
                    →
                  </Link>
                </div>

                {paymentAlerts.overdueCount > 0 && (
                  <Link
                    to={`/${slug}/dashboard/expense?tab=payments`}
                    style={{
                      display: 'block',
                      fontSize: 13,
                      color: '#b91c1c',
                      marginBottom: 10,
                      textDecoration: 'none',
                    }}
                  >
                    {paymentAlerts.overdueCount} overdue ·{' '}
                    {formatCurrencyCompact(paymentAlerts.overdueTotal)}
                  </Link>
                )}

                {paymentAlerts.upcomingPayments.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 0',
                      borderTop: '1px solid var(--line-soft)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--ink-high)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.expense.description}
                      </div>
                      {p.due_date && (
                        <div style={{ fontSize: 11, color: 'var(--ink-low)' }}>
                          Due {formatDate(p.due_date, { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-deep)' }}>
                      {formatCurrencyCompact(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

          {/* Open tasks */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <div className="uppercase-eyebrow">Up next</div>
              <Link
                to={`/${slug}/dashboard/tasks`}
                style={{ fontSize: 12, color: 'var(--gold-deep)', textDecoration: 'none' }}
              >
                →
              </Link>
            </div>

            {upcomingTasks.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ink-dim)', padding: '8px 0' }}>
                {tasksTotal === 0 ? (
                  <>
                    No tasks yet —{' '}
                    <Link to={`/${slug}/dashboard/tasks`} style={{ color: 'var(--gold-deep)' }}>
                      add your first task
                    </Link>
                    .
                  </>
                ) : (
                  'All tasks done! 🎉'
                )}
              </p>
            ) : (
              <div>
                {upcomingTasks.slice(0, 5).map((t: any) => {
                  const isInProgress = t.status === 'in_progress';
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 0',
                        borderTop: '1px solid var(--line-soft)',
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          flexShrink: 0,
                          background: isInProgress ? 'var(--gold)' : 'var(--line-strong)',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            color: 'var(--ink-high)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-low)' }}>{t.assigned_to}</div>
                      </div>
                      {t.due_date && (
                        <span className="pill muted" style={{ fontSize: 10, flexShrink: 0 }}>
                          {formatDate(t.due_date, {
                            month: 'short',
                            day: 'numeric',
                          })}
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

        {/* Quick actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 'clamp(8px, 2vw, 16px)',
            flexWrap: 'wrap',
            marginTop: 32,
            paddingTop: 24,
            borderTop: '1px solid var(--line-soft)',
          }}
        >
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              to={`/${slug}/dashboard${action.path}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid var(--line-soft)',
                background: 'transparent',
                color: 'var(--ink-mid)',
                fontSize: 13,
                textDecoration: 'none',
                transition: 'all 150ms',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)';
                (e.currentTarget as HTMLElement).style.color = 'var(--ink-high)';
              }}
              onMouseLeave={(e) => {
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

      {/* ── First-run guide ─────────────────────────────────────── */}
      {isFreshAccount && (
        <div
          className="card"
          style={{
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div className="uppercase-eyebrow">Getting started</div>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-mid)' }}>
              Welcome! Start by adding your events and guest list — everything else builds on them.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to={`/${slug}/dashboard/events`} className="btn-primary">
              Add an event
            </Link>
            <Link to={`/${slug}/dashboard/guests`} className="btn-outline">
              Add guests
            </Link>
          </div>
        </div>
      )}

      {/* ── Festivities + Recent activity ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Events timeline */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 18,
            }}
          >
            <div>
              <div className="uppercase-eyebrow">The Festivities</div>
              <h2
                className="display"
                style={{
                  margin: '3px 0 0',
                  fontSize: 22,
                  color: 'var(--ink-high)',
                  fontWeight: 500,
                }}
              >
                {events.length > 0
                  ? `${new Set(events.map((ev: any) => ev.event_date)).size} days of celebration`
                  : 'Events & timeline'}
              </h2>
            </div>
            <Link
              to={`/${slug}/dashboard/events`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                color: 'var(--gold-deep)',
                textDecoration: 'none',
              }}
            >
              All events <HiOutlineChevronRight style={{ width: 12, height: 12 }} />
            </Link>
          </div>

          {events.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: 'var(--ink-dim)',
                textAlign: 'center',
                padding: '24px 0',
              }}
            >
              No events yet — add your first event.
            </p>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Vertical timeline gradient line */}
              <div
                style={{
                  position: 'absolute',
                  left: 10,
                  top: 18,
                  bottom: 18,
                  width: 1,
                  background:
                    'linear-gradient(180deg, transparent, var(--gold-glow), var(--gold-glow), transparent)',
                }}
              />
              <div>
                {events.map((ev: any, i: number) => {
                  const color = EVENT_COLORS[i % EVENT_COLORS.length];
                  const dayStr = formatDate(ev.event_date, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });
                  const timeStr = ev.start_time ? ev.start_time.slice(0, 5) : '';
                  return (
                    <div
                      key={ev.id}
                      style={{ display: 'flex', gap: 18, padding: '10px 0', position: 'relative' }}
                    >
                      <div
                        style={{
                          width: 21,
                          height: 21,
                          borderRadius: '50%',
                          background: 'var(--bg-panel)',
                          border: `1.5px solid ${color}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2,
                          zIndex: 1,
                          fontSize: 12,
                        }}
                      >
                        {EVENT_ICONS[ev.event_type as keyof typeof EVENT_ICONS] || '🎊'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 12,
                            alignItems: 'baseline',
                          }}
                        >
                          <span
                            className="display"
                            style={{ fontSize: 18, color: 'var(--ink-high)' }}
                          >
                            {ev.name}
                          </span>
                          <span
                            className="mono ink-low"
                            style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                          >
                            {dayStr.toUpperCase()}
                            {timeStr ? ` · ${timeStr}` : ''}
                          </span>
                        </div>
                        {ev.theme && (
                          <div style={{ fontSize: 12, color: 'var(--ink-low)', marginTop: 2 }}>
                            Theme: {ev.theme}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="uppercase-eyebrow" style={{ marginBottom: 14 }}>
            Recent activity
          </div>
          {recentActivity.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: 'var(--ink-dim)',
                textAlign: 'center',
                padding: '24px 0',
              }}
            >
              No recent activity yet.
            </p>
          ) : (
            recentActivity.map((a, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '9px 0',
                  alignItems: 'center',
                  borderTop: i === 0 ? 0 : '1px solid var(--line-soft)',
                }}
              >
                <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                  {a.actor_name?.[0]?.toUpperCase() ?? '◆'}
                </div>
                <div style={{ flex: 1, fontSize: 13 }}>
                  {a.actor_name && (
                    <span style={{ color: 'var(--ink-high)', fontWeight: 500 }}>
                      {a.actor_name}{' '}
                    </span>
                  )}
                  <span className="ink-low">{a.what}</span>
                </div>
                <div className="mono ink-dim" style={{ fontSize: 11, flexShrink: 0 }}>
                  {a.when}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
