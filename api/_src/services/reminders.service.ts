import { supabase } from '../config/database';
import { withPgClient } from '../config/postgres';
import { env } from '../config/env';
import * as tasksRepo from '../repositories/tasks.repository';
import { sendEmail } from './email';
import { digestEmail, escapeHtml } from './email/templates';

// ---------------------------------------------------------------------------
// Feed — the single source for the topbar bell and the daily email digest.
// A reminder is a *view* over tasks + scheduled payments, never stored state
// (see REMINDERS_PLAN.md): no read flags, no notification rows.
// ---------------------------------------------------------------------------

export interface ReminderItem {
  kind: 'task' | 'payment';
  id: string;
  title: string;
  /** The date the item is anchored to (due date, or fire date for undated tasks). */
  date: string;
  amount?: number;
}

export interface RemindersFeed {
  overdue: ReminderItem[];
  today: ReminderItem[];
  upcoming: ReminderItem[];
}

// Calendar dates are compared in IST — the product's default audience
// (bom1 region, INR default currency). ponytail: fixed offset, add a
// users.timezone column before serving other timezones.
const IST_OFFSET_MS = 5.5 * 3_600_000;

export function todayIST(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysUntil(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

const TASK_WINDOW_DAYS = 7;

interface FeedOptions {
  includeTasks: boolean;
  includePayments: boolean;
  /** How far ahead scheduled payments enter the feed (users.reminder_prefs). */
  paymentLeadDays: number;
}

export async function buildFeed(ownerId: string, opts: FeedOptions): Promise<RemindersFeed> {
  const today = todayIST();
  const feed: RemindersFeed = { overdue: [], today: [], upcoming: [] };

  if (opts.includeTasks) {
    const horizon = addDays(today, TASK_WINDOW_DAYS);
    for (const t of await tasksRepo.findOpenForReminders(ownerId)) {
      const due = t.due_date;
      // Effective fire date: absolute date wins, else offset back from due date.
      const fire =
        t.reminder_date ??
        (due && t.reminder_offset_days != null ? addDays(due, -t.reminder_offset_days) : null);
      const item: ReminderItem = {
        kind: 'task',
        id: t.id,
        title: t.title,
        date: due ?? fire ?? today,
      };

      if (due && due < today) feed.overdue.push(item);
      else if (
        due === today ||
        fire === today ||
        // 'daily' keeps nagging from its fire date until the task is closed
        (fire && fire <= today && t.reminder_repeat === 'daily')
      )
        feed.today.push(item);
      else if ((fire && fire > today && fire <= horizon) || (due && due > today && due <= horizon))
        feed.upcoming.push(item);
    }
  }

  if (opts.includePayments) {
    const horizon = addDays(today, opts.paymentLeadDays);
    const rows = await withPgClient(async (client) => {
      const { rows } = await client.query<{
        id: string;
        amount: string;
        due_date: string;
        description: string;
      }>(
        `
          SELECT p.id, p.amount, p.due_date::text AS due_date, e.description
          FROM payments p
          JOIN expenses e ON e.id = p.expense_id
          WHERE e.user_id = $1
            AND e.status = 'active'
            AND p.status = 'scheduled'
            AND p.due_date IS NOT NULL
          ORDER BY p.due_date ASC
        `,
        [ownerId],
      );
      return rows;
    });

    for (const p of rows) {
      const item: ReminderItem = {
        kind: 'payment',
        id: p.id,
        title: p.description,
        date: p.due_date,
        amount: parseFloat(p.amount),
      };
      if (p.due_date < today) feed.overdue.push(item);
      else if (p.due_date === today) feed.today.push(item);
      else if (p.due_date <= horizon) feed.upcoming.push(item);
    }
  }

  for (const bucket of [feed.overdue, feed.today, feed.upcoming]) {
    bucket.sort((a, b) => a.date.localeCompare(b.date));
  }
  return feed;
}

// ---------------------------------------------------------------------------
// Daily email digest — one email per opted-in user, only when there is
// something to say. Fired by Vercel Cron (see /api/v1/cron/daily-digest).
// ---------------------------------------------------------------------------

interface ReminderPrefs {
  email_digest?: boolean;
  payment_lead_days?: number;
}

const PAYMENT_THRESHOLDS = [7, 3, 1];

/**
 * The digest is threshold-based where the bell is window-based: an upcoming
 * payment appears only on the day it crosses 7/3/1 days out (capped by the
 * user's lead-day pref), so nothing shows up every day for a week. Upcoming
 * tasks are excluded entirely — they get their day when the reminder fires.
 */
function toDigest(feed: RemindersFeed, leadDays: number, today: string): RemindersFeed {
  const thresholds = new Set(PAYMENT_THRESHOLDS.filter((d) => d <= leadDays));
  return {
    overdue: feed.overdue,
    today: feed.today,
    upcoming: feed.upcoming.filter(
      (i) => i.kind === 'payment' && thresholds.has(daysUntil(today, i.date)),
    ),
  };
}

function fmtAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-IN')}`;
  }
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function itemLine(i: ReminderItem, currency: string): string {
  const amount = i.amount != null ? ` — ${fmtAmount(i.amount, currency)}` : '';
  const label = i.kind === 'payment' ? 'Payment: ' : '';
  return `${label}${i.title}${amount} (${fmtDate(i.date)})`;
}

function renderSection(heading: string, items: ReminderItem[], currency: string): string {
  if (items.length === 0) return '';
  const rows = items
    .map(
      (i) =>
        `<li style="margin:4px 0">${escapeHtml(itemLine(i, currency)).replace(/\(([^)]+)\)$/, '<span style="color:#8a7a6b">($1)</span>')}</li>`,
    )
    .join('');
  return `<h3 style="margin:20px 0 4px;font-size:15px;letter-spacing:0.5px;text-transform:uppercase;color:#7e6227">${heading}</h3><ul style="margin:4px 0;padding-left:20px">${rows}</ul>`;
}

function renderSectionText(heading: string, items: ReminderItem[], currency: string): string {
  if (items.length === 0) return '';
  return `${heading}:\n${items.map((i) => `  - ${itemLine(i, currency)}`).join('\n')}\n\n`;
}

export interface DigestRunResult {
  processed: number;
  sent: number;
}

export async function sendDailyDigests(): Promise<DigestRunResult> {
  const today = todayIST();
  // One digest per WEDDING, emailed to its owner — an owner of two weddings
  // gets one per wedding, each scoped and linked to that wedding's dashboard.
  // ponytail: single unpaginated fetch — revisit past ~1000 weddings.
  const { data: weddings, error } = await supabase
    .from('weddings')
    .select('id, slug, title, currency, owner:users!owner_id(id, email, name, reminder_prefs)');
  if (error) throw error;

  let processed = 0;
  let sent = 0;

  for (const w of weddings ?? []) {
    const owner = w.owner as unknown as {
      id: string;
      email: string;
      name: string | null;
      reminder_prefs: ReminderPrefs | null;
    } | null;
    if (!owner) continue;
    const prefs = owner.reminder_prefs ?? {};
    if (prefs.email_digest === false) continue;
    processed += 1;

    try {
      // Insert-first claim: a cron retry or double-fire can't double-email.
      const { data: claimed, error: claimError } = await supabase
        .from('wedding_digest_log')
        .upsert({ wedding_id: w.id, sent_on: today }, { ignoreDuplicates: true })
        .select();
      if (claimError) throw claimError;
      if (!claimed || claimed.length === 0) continue; // already sent today

      const leadDays = prefs.payment_lead_days ?? 7;
      // Digest v1 goes to wedding owners about their wedding — owners see
      // everything, so no section filtering here (members: phase 4).
      const feed = await buildFeed(w.id, {
        includeTasks: true,
        includePayments: true,
        paymentLeadDays: leadDays,
      });
      const digest = toDigest(feed, leadDays, today);
      const count = digest.overdue.length + digest.today.length + digest.upcoming.length;
      if (count === 0) continue;

      const currency = (w.currency as string | null) ?? 'INR';
      const sectionsHtml =
        renderSection('Overdue', digest.overdue, currency) +
        renderSection('Due today', digest.today, currency) +
        renderSection('Coming up', digest.upcoming, currency);
      const sectionsText =
        renderSectionText('Overdue', digest.overdue, currency) +
        renderSectionText('Due today', digest.today, currency) +
        renderSectionText('Coming up', digest.upcoming, currency);

      await sendEmail({
        to: owner.email,
        ...digestEmail({
          name: owner.name ?? undefined,
          count,
          sectionsHtml,
          sectionsText,
          dashboardLink: `${env.FRONTEND_URL ?? ''}/${w.slug ?? ''}/dashboard`,
        }),
      });
      sent += 1;
    } catch (err) {
      // One wedding's failure must not kill the whole run.
      console.error(`[digest] failed for wedding ${w.id}:`, err);
    }
  }

  return { processed, sent };
}
