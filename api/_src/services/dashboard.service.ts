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
