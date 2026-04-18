import type { HeroContent } from '@wedding-planner/shared';
import * as repo from '../repositories/dashboard.repository';
import { getFinanceDashboardTotals, getScheduledPayments } from './finance.service';

export async function getCountdown(ownerId: string) {
  const heroRow = await repo.findHeroContent(ownerId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content = (heroRow?.content ?? {}) as Partial<HeroContent> & Record<string, any>;

  const brideName = content['bride_name'] ?? 'Bride';
  const groomName = content['groom_name'] ?? 'Groom';
  const weddingDateStr = content['wedding_date'] as string | null | undefined;

  if (!weddingDateStr) {
    return {
      bride: brideName,
      groom: groomName,
      weddingDate: null,
      countdown: null,
      totalDays: null,
      isPast: false,
    };
  }

  const weddingDate = new Date(weddingDateStr);
  const diff = weddingDate.getTime() - Date.now();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return {
    bride: brideName,
    groom: groomName,
    weddingDate: weddingDate.toISOString(),
    countdown: {
      days,
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    },
    totalDays: days,
    isPast: diff < 0,
  };
}

export async function getStats(ownerId: string) {
  const [guests, rsvps, tasks, expense, finance] = await Promise.all([
    repo.findGuestSides(ownerId),
    repo.findRsvpStatuses(ownerId),
    repo.findTaskStatuses(ownerId),
    repo.findExpenseSummary(ownerId),
    getFinanceDashboardTotals(ownerId),
  ]);

  const totalExpense = parseFloat(String(expense?.total_expense ?? 0));

  return {
    guests: {
      total: guests.length,
      bride: guests.filter((g) => g.side === 'bride').length,
      groom: guests.filter((g) => g.side === 'groom').length,
    },
    rsvp: {
      confirmed: rsvps.filter((r) => r.rsvp_status === 'confirmed').length,
      pending: rsvps.filter((r) => r.rsvp_status === 'pending').length,
    },
    tasks: {
      pending: tasks.filter((t) => t.status === 'pending').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
    },
    expense: {
      total: totalExpense,
      committed: finance.committed,
      paid: finance.paid,
      outstanding: finance.outstanding,
      remaining: totalExpense - finance.committed,
    },
  };
}

export async function getSummary(ownerId: string) {
  const [events, upcomingTasks, scheduledPayments] = await Promise.all([
    repo.findUpcomingEvents(ownerId),
    repo.findUpcomingTasks(ownerId),
    getScheduledPayments(ownerId),
  ]);

  return { events, upcomingTasks, pendingPayments: scheduledPayments };
}

function fmtTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 2) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export async function getRecentActivity(ownerId: string) {
  const { guests, vendors, tasksCompleted, payments } = await repo.findRecentActivity(ownerId);

  type ActivityItem = { what: string; when: string; ts: number; actor_name: string | null };
  const items: ActivityItem[] = [];

  for (const g of guests) {
    const guestName = [g.first_name, g.last_name].filter(Boolean).join(' ');
    items.push({
      what: `added ${guestName} to the guest list`,
      ts: new Date(g.created_at).getTime(),
      actor_name: g.actor_name,
      when: fmtTimeAgo(g.created_at),
    });
  }
  for (const v of vendors) {
    items.push({
      what: `added ${v.name} as a vendor`,
      ts: new Date(v.created_at).getTime(),
      actor_name: v.actor_name,
      when: fmtTimeAgo(v.created_at),
    });
  }
  for (const t of tasksCompleted) {
    items.push({
      what: `completed task: ${t.title}`,
      ts: new Date(t.updated_at).getTime(),
      actor_name: t.actor_name,
      when: fmtTimeAgo(t.updated_at),
    });
  }
  for (const p of payments) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vendorName = (p.vendors as any)?.name ?? 'vendor';
    items.push({
      what: `logged a payment for ${vendorName}`,
      ts: new Date(p.created_at).getTime(),
      actor_name: null,
      when: fmtTimeAgo(p.created_at),
    });
  }

  items.sort((a, b) => b.ts - a.ts);

  return items.slice(0, 8).map(({ what, when, actor_name }) => ({ what, when, actor_name }));
}
