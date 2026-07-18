import { BadRequestError, NotFoundError } from '../shared/errors/HttpError';
import { supabase } from '../config/database';
import { env } from '../config/env';
import * as client from './whatsapp/client';
import { TEMPLATE_CATALOG, type CampaignContext } from './whatsapp/templates';
import * as waRepo from '../repositories/whatsapp.repository';
import * as guestsRepo from '../repositories/guests.repository';
import * as eventsRepo from '../repositories/events.repository';
import { aggregateRsvpStatus } from './guests.service';
import type { GuestEventRsvpInsert } from '../../../shared/src';

function assertConfigured(): void {
  if (!client.isConfigured()) {
    throw new BadRequestError(
      'WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_WABA_ID.',
    );
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'soon';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  const [h = '0', m = '00'] = t.split(':');
  const hour = Number(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${((hour + 11) % 12) + 1}:${m} ${ampm}`;
}

type EventLite = Awaited<ReturnType<typeof eventsRepo.findAllByOwner>>[number] & {
  venues?: {
    name?: string;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
};

async function getWedding(weddingId: string): Promise<{ title: string; slug: string | null }> {
  const { data } = await supabase
    .from('weddings')
    .select('title, slug')
    .eq('id', weddingId)
    .single();
  return { title: data?.title ?? 'our wedding', slug: data?.slug ?? null };
}

function siteUrl(slug: string): string {
  return `${env.FRONTEND_URL ?? 'https://shaadi.diy'}/${slug}`;
}

// ---------------------------------------------------------------------------
// Templates (admin)
// ---------------------------------------------------------------------------

export async function getTemplates() {
  assertConfigured();
  const meta = await client.listMetaTemplates();
  const metaByName = new Map(meta.map((t) => [t.name, t]));
  // Catalog templates first (the ones the app can actually drive), then any
  // extra templates that exist on the WABA (sendable, no variables filled).
  const known = Object.entries(TEMPLATE_CATALOG).map(([name, spec]) => {
    const m = metaByName.get(name);
    return {
      name,
      known: true,
      status: m?.status ?? 'NOT_CREATED',
      category: m?.category ?? (spec.definition.category as string),
      body: m?.components.find((c) => c.type === 'BODY')?.text ?? spec.description,
      buttons:
        m?.components.find((c) => c.type === 'BUTTONS')?.buttons?.map((b) => b.text) ?? [],
      description: spec.description,
      startsRsvpFlow: spec.startsRsvpFlow,
      needsEvent: spec.needsEvent,
    };
  });
  const extra = meta
    .filter((t) => !(t.name in TEMPLATE_CATALOG))
    .map((t) => ({
      name: t.name,
      known: false,
      status: t.status,
      category: t.category,
      body: t.components.find((c) => c.type === 'BODY')?.text ?? '',
      buttons: t.components.find((c) => c.type === 'BUTTONS')?.buttons?.map((b) => b.text) ?? [],
      description: 'Created outside this app — sendable only if it has no variables.',
      startsRsvpFlow: false,
      needsEvent: false,
    }));
  return [...known, ...extra];
}

export async function syncTemplates() {
  assertConfigured();
  const existing = new Set((await client.listMetaTemplates()).map((t) => t.name));
  const created: string[] = [];
  for (const [name, spec] of Object.entries(TEMPLATE_CATALOG)) {
    if (existing.has(name)) continue;
    await client.createMetaTemplate(spec.definition);
    created.push(name);
  }
  return { created, skipped: [...existing] };
}

// ---------------------------------------------------------------------------
// Audience resolution (shared by campaigns and polls)
// ---------------------------------------------------------------------------

export interface AudienceFilter {
  guest_ids?: string[];
  rsvp_filter?: 'pending' | 'confirmed' | 'declined' | 'tentative';
  side?: string;
}

async function resolveAudience(weddingId: string, filter: AudienceFilter) {
  const all = await guestsRepo.findAllByOwner(weddingId, {});
  const wanted = filter.guest_ids ? new Set(filter.guest_ids) : null;
  const targets = all.filter((g) => {
    if (!g.phone) return false;
    if (wanted) return wanted.has(g.id);
    if (filter.side && g.side !== filter.side) return false;
    if (filter.rsvp_filter && aggregateRsvpStatus(g.guest_event_rsvp) !== filter.rsvp_filter) {
      return false;
    }
    return true;
  });
  if (targets.length === 0) {
    throw new BadRequestError('No guests match this audience (or none have a phone number)');
  }
  return targets;
}

// ---------------------------------------------------------------------------
// Campaign send
// ---------------------------------------------------------------------------

export interface SendCampaignPayload extends AudienceFilter {
  template_name: string;
  event_id?: string;
}

export async function sendCampaign(weddingId: string, payload: SendCampaignPayload) {
  assertConfigured();
  const spec = TEMPLATE_CATALOG[payload.template_name];
  if (!spec) throw new BadRequestError(`Unknown template: ${payload.template_name}`);
  if (spec.needsEvent && !payload.event_id) {
    throw new BadRequestError('This template needs an event — pass event_id');
  }

  const [wedding, events, targets] = await Promise.all([
    getWedding(weddingId),
    eventsRepo.findAllByOwner(weddingId),
    resolveAudience(weddingId, payload),
  ]);

  const event = payload.event_id
    ? (events as EventLite[]).find((e) => e.id === payload.event_id)
    : undefined;
  if (payload.event_id && !event) throw new NotFoundError('Event not found');

  const ctx: CampaignContext = {
    weddingTitle: wedding.title,
    weddingDate: formatDate(events[0]?.event_date),
    ...(event && {
      eventName: event.name,
      eventDate: formatDate(event.event_date),
      eventVenue: event.venues?.name ?? 'the venue',
    }),
  };

  let sent = 0;
  const failed: { guest_id: string; name: string; error: string }[] = [];
  for (const guest of targets) {
    const phone = client.normalizePhone(guest.phone as string);
    try {
      const waId = await client.sendTemplate(
        phone,
        payload.template_name,
        spec.buildParams(guest, ctx),
      );
      await waRepo.insertMessage({
        wedding_id: weddingId,
        guest_id: guest.id,
        phone,
        direction: 'outbound',
        wa_message_id: waId,
        template_name: payload.template_name,
        body: spec.buildParams(guest, ctx).join(' · '),
        status: 'sent',
      });
      if (spec.startsRsvpFlow) {
        await waRepo.upsertConversation({
          phone,
          wedding_id: weddingId,
          guest_id: guest.id,
          step: 'invited',
          context: {},
        });
      }
      sent += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'send failed';
      await waRepo.insertMessage({
        wedding_id: weddingId,
        guest_id: guest.id,
        phone,
        direction: 'outbound',
        template_name: payload.template_name,
        status: 'failed',
        error: message,
      });
      failed.push({ guest_id: guest.id, name: guest.first_name, error: message });
    }
  }
  return { sent, failed, total: targets.length };
}

export function listMessages(weddingId: string) {
  return waRepo.listMessages(weddingId);
}

// ---------------------------------------------------------------------------
// Polls — interactive lists standing in for polls (the API has none).
// Row ids encode poll + guest + option, so replies need no conversation state
// and guests can re-vote.
// ---------------------------------------------------------------------------

export interface SendPollPayload extends AudienceFilter {
  question: string;
  options: string[];
}

export async function sendPoll(weddingId: string, payload: SendPollPayload) {
  assertConfigured();
  const options = payload.options.map((o) => o.trim()).filter(Boolean);
  if (options.length < 2 || options.length > 10) {
    throw new BadRequestError('A poll needs between 2 and 10 options');
  }
  const targets = await resolveAudience(weddingId, payload);
  const poll = await waRepo.insertPoll(weddingId, payload.question, options);

  let sent = 0;
  const failed: { guest_id: string; name: string; error: string }[] = [];
  for (const guest of targets) {
    const phone = client.normalizePhone(guest.phone as string);
    try {
      const waId = await client.sendList(
        phone,
        payload.question,
        'Answer',
        options.map((title, idx) => ({
          id: `poll_${poll.id}_${guest.id}_${idx}`,
          title: client.listTitle(title),
        })),
      );
      await waRepo.insertMessage({
        wedding_id: weddingId,
        guest_id: guest.id,
        phone,
        direction: 'outbound',
        wa_message_id: waId,
        template_name: 'poll',
        body: payload.question,
        status: 'sent',
      });
      sent += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'send failed';
      failed.push({ guest_id: guest.id, name: guest.first_name, error: message });
    }
  }
  return { poll_id: poll.id, sent, failed, total: targets.length };
}

export async function listPolls(weddingId: string) {
  const rows = (await waRepo.listPollsWithResponses(weddingId)) as {
    id: string;
    question: string;
    options: string[];
    created_at: string;
    whatsapp_poll_responses: {
      guest_id: string;
      option_idx: number;
      guests: { first_name: string; last_name: string | null } | null;
    }[];
  }[];
  return rows.map((p) => ({
    id: p.id,
    question: p.question,
    created_at: p.created_at,
    total_votes: p.whatsapp_poll_responses.length,
    options: p.options.map((label, idx) => ({
      label,
      votes: p.whatsapp_poll_responses.filter((r) => r.option_idx === idx).length,
      voters: p.whatsapp_poll_responses
        .filter((r) => r.option_idx === idx)
        .map((r) =>
          r.guests ? `${r.guests.first_name} ${r.guests.last_name ?? ''}`.trim() : 'Unknown',
        ),
    })),
  }));
}

const POLL_REPLY_RE = /^poll_([0-9a-f-]{36})_([0-9a-f-]{36})_(\d+)$/;

async function handlePollReply(
  phone: string,
  pollId: string,
  guestId: string,
  optionIdx: number,
): Promise<void> {
  const poll = await waRepo.findPoll(pollId);
  if (!poll || optionIdx >= poll.options.length) return;
  // The row id round-trips through the guest's device — confirm the guest
  // really belongs to this poll's wedding before recording.
  const { data: guest } = await supabase
    .from('guests')
    .select('id, user_id')
    .eq('id', guestId)
    .eq('user_id', poll.wedding_id)
    .maybeSingle();
  if (!guest) return;
  await waRepo.upsertPollResponse(pollId, guestId, optionIdx);
  await waRepo.insertMessage({
    wedding_id: poll.wedding_id,
    guest_id: guestId,
    phone,
    direction: 'inbound',
    body: `Poll answer: ${poll.options[optionIdx]}`,
    status: 'received',
  });
  await client.sendText(phone, `Noted — “${poll.options[optionIdx]}”. Thanks for answering!`);
}

// ---------------------------------------------------------------------------
// Inbound webhook — RSVP conversation state machine + assistant keywords
// ---------------------------------------------------------------------------

const MEAL_OPTIONS = [
  { id: 'meal_vegetarian', title: 'Vegetarian' },
  { id: 'meal_jain', title: 'Jain' },
  { id: 'meal_vegan', title: 'Vegan' },
  { id: 'meal_non_vegetarian', title: 'Non-vegetarian' },
] as const;

const LOGISTICS_OPTIONS = [
  { id: 'log_accom', title: 'Accommodation', description: 'I need a place to stay' },
  { id: 'log_pickup', title: 'Pickup', description: 'Airport / station pickup' },
  { id: 'log_both', title: 'Both', description: 'Stay and pickup' },
  { id: 'log_none', title: 'Neither', description: 'I am all set' },
] as const;

interface InboundMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  button?: { payload?: string; text: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
}

interface FlowContext {
  /** Event ids the guest picked so far (multi-select emulated over lists). */
  events?: string[];
  party?: number;
}

/** Collapse the three reply shapes into one token + display text. */
function parseReply(msg: InboundMessage): { token: string; display: string; isButton: boolean } {
  if (msg.type === 'button' && msg.button) {
    return { token: msg.button.payload ?? msg.button.text, display: msg.button.text, isButton: true };
  }
  const reply = msg.interactive?.button_reply ?? msg.interactive?.list_reply;
  if (msg.type === 'interactive' && reply) {
    return { token: reply.id, display: reply.title, isButton: true };
  }
  const body = msg.text?.body ?? '';
  return { token: body, display: body, isButton: false };
}

const ACCEPT_RE = /accept|\byes\b|\bhaan\b|attending/i;
const DECLINE_RE = /decline|\bno\b|\bnahi\b|can.?t make/i;
const MENU_RE = /^\s*(hi|hello|hey|help|menu|namaste)\s*$/i;
// Steps where free text may restart the flow or open the menu. Mid-flow the
// same words are answers ("no nuts please" must not read as a decline).
const IDLE_STEPS = new Set(['invited', 'done', 'declined']);

async function recordRsvp(
  convo: waRepo.WaConversation,
  status: 'confirmed' | 'declined',
  plusOnes?: number,
  chosenEventIds?: string[],
): Promise<void> {
  const events = await eventsRepo.findAllByOwner(convo.wedding_id);
  const chosen = chosenEventIds ? new Set(chosenEventIds) : null;
  const base: Record<string, unknown> = {
    responded_at: new Date().toISOString(),
    responded_via_public: true,
    notes: 'Responded via WhatsApp',
  };
  if (plusOnes !== undefined) base.plus_ones = plusOnes;
  for (const event of events) {
    const attending = status === 'confirmed' && (!chosen || chosen.has(event.id));
    await guestsRepo.upsertRsvp({
      guest_id: convo.guest_id,
      event_id: event.id,
      rsvp_status: attending ? 'confirmed' : 'declined',
      ...base,
    } as GuestEventRsvpInsert);
  }
}

function eventRow(e: EventLite): { id: string; title: string; description: string } {
  return {
    id: `evt_${e.id}`,
    title: client.listTitle(e.name),
    description: `${formatDate(e.event_date)}${e.start_time ? ` · ${formatTime(e.start_time)}` : ''}`,
  };
}

async function askEvents(
  phone: string,
  events: EventLite[],
  chosen: string[],
): Promise<void> {
  const remaining = events.filter((e) => !chosen.includes(e.id));
  const rows =
    chosen.length === 0
      ? [
          { id: 'evt_all', title: 'All events 🎉', description: 'Count me in for everything' },
          ...remaining.slice(0, 8).map(eventRow),
        ]
      : [
          ...remaining.slice(0, 8).map(eventRow),
          { id: 'evt_done', title: "That's all", description: `${chosen.length} picked so far` },
        ];
  await client.sendList(
    phone,
    chosen.length === 0
      ? 'Which celebrations will you be joining? Pick one at a time, or all of them.'
      : `Lovely! Any other events? (${chosen.length} picked)`,
    'Pick events',
    rows,
  );
}

async function askPartySize(phone: string): Promise<void> {
  await client.sendList(
    phone,
    'How many guests will be attending in total, including you?',
    'Select count',
    [1, 2, 3, 4, 5].map((n) => ({ id: `party_${n}`, title: String(n) })),
  );
}

async function askMeal(phone: string): Promise<void> {
  await client.sendList(phone, 'Noted! And what is your meal preference?', 'Choose meal', [
    ...MEAL_OPTIONS,
  ]);
}

async function askDietary(phone: string): Promise<void> {
  await client.sendButtons(
    phone,
    'Any allergies or dietary notes we should know about? Type them here, or tap None.',
    [{ id: 'diet_none', title: 'None' }],
  );
}

async function askLogistics(phone: string): Promise<void> {
  await client.sendList(phone, 'Almost done! Will you need any help with travel or stay?', 'Select', [
    ...LOGISTICS_OPTIONS,
  ]);
}

async function finishFlow(convo: waRepo.WaConversation, msg: InboundMessage): Promise<void> {
  const phone = convo.phone;
  await waRepo.updateConversation(phone, { step: 'done' });
  const ctx = convo.context as FlowContext;
  const party = Number(ctx.party ?? 1);
  // The reaction and CTA are garnish — never let them mask a saved RSVP
  await client.sendReaction(phone, msg.id, '🎉').catch(() => {});
  const wedding = await getWedding(convo.wedding_id);
  const summary =
    `Wonderful — you're confirmed for ${party} ${party === 1 ? 'guest' : 'guests'}. ` +
    'Your RSVP, meal preference and travel needs are saved. We cannot wait to celebrate with you! ' +
    'Reply "menu" anytime for the schedule, directions, or to update your RSVP.';
  if (wedding.slug) {
    await client
      .sendCtaUrl(phone, summary, 'View wedding page', siteUrl(wedding.slug))
      .catch(() => client.sendText(phone, summary));
  } else {
    await client.sendText(phone, summary);
  }
}

// --- Assistant keyword replies ---------------------------------------------

async function sendMenu(phone: string): Promise<void> {
  await client.sendList(phone, 'How can I help?', 'Options', [
    { id: 'menu_rsvp', title: 'Update my RSVP', description: 'Change attendance or details' },
    { id: 'menu_schedule', title: 'Event schedule', description: 'Dates, times and venues' },
    { id: 'menu_directions', title: 'Venue directions', description: 'Get location pins' },
    { id: 'menu_website', title: 'Wedding website', description: 'All the details in one place' },
  ]);
}

async function sendSchedule(convo: waRepo.WaConversation): Promise<void> {
  const events = (await eventsRepo.findAllByOwner(convo.wedding_id)) as EventLite[];
  if (events.length === 0) {
    await client.sendText(convo.phone, 'The schedule is still being finalised — check back soon!');
    return;
  }
  const lines = events.map((e) => {
    const time = e.start_time ? ` · ${formatTime(e.start_time)}` : '';
    const venue = e.venues?.name ? ` · ${e.venues.name}` : '';
    return `✨ *${e.name}* — ${formatDate(e.event_date)}${time}${venue}`;
  });
  await client.sendText(convo.phone, `Here's the celebration schedule:\n\n${lines.join('\n')}`);
}

async function sendDirections(convo: waRepo.WaConversation): Promise<void> {
  const events = (await eventsRepo.findAllByOwner(convo.wedding_id)) as EventLite[];
  const seen = new Set<string>();
  const venues = events
    .map((e) => e.venues)
    .filter((v): v is NonNullable<EventLite['venues']> => Boolean(v?.name))
    .filter((v) => {
      if (seen.has(v.name as string)) return false;
      seen.add(v.name as string);
      return true;
    })
    .slice(0, 3);
  const locatable = venues.filter((v) => v.latitude != null && v.longitude != null);
  if (locatable.length === 0) {
    const fallback = venues
      .map((v) => `📍 *${v.name}*${v.address ? ` — ${v.address}` : ''}`)
      .join('\n');
    await client.sendText(
      convo.phone,
      fallback || 'Venue details are still being finalised — check back soon!',
    );
    return;
  }
  for (const v of locatable) {
    await client.sendLocation(convo.phone, {
      latitude: v.latitude as number,
      longitude: v.longitude as number,
      name: v.name as string,
      ...(v.address ? { address: v.address } : {}),
    });
  }
}

async function sendWebsiteLink(convo: waRepo.WaConversation): Promise<void> {
  const wedding = await getWedding(convo.wedding_id);
  if (!wedding.slug) {
    await client.sendText(convo.phone, 'The wedding website is not published yet — stay tuned!');
    return;
  }
  await client.sendCtaUrl(
    convo.phone,
    `Everything about ${wedding.title} — schedule, photos and more.`,
    'Open wedding page',
    siteUrl(wedding.slug),
  );
}

// --- The state machine ------------------------------------------------------

async function advanceFlow(convo: waRepo.WaConversation, msg: InboundMessage): Promise<void> {
  const phone = convo.phone;
  const { token, isButton } = parseReply(msg);
  const idle = IDLE_STEPS.has(convo.step);

  // Menu keywords and menu picks (only when not mid-question)
  if (idle && (MENU_RE.test(token) || token === 'menu_rsvp')) {
    if (token === 'menu_rsvp') {
      await client.sendButtons(phone, 'Please confirm your attendance:', [
        { id: 'rsvp_accept', title: 'Joyfully accept' },
        { id: 'rsvp_decline', title: 'Regretfully decline' },
      ]);
    } else {
      await sendMenu(phone);
    }
    return;
  }
  if (idle && token === 'menu_schedule') return sendSchedule(convo);
  if (idle && token === 'menu_directions') return sendDirections(convo);
  if (idle && token === 'menu_website') return sendWebsiteLink(convo);

  // Accept/decline: buttons work at ANY step (a guest can change their mind by
  // tapping the invite buttons again); free text only when idle.
  if ((isButton || idle) && ACCEPT_RE.test(token)) {
    const events = (await eventsRepo.findAllByOwner(convo.wedding_id)) as EventLite[];
    if (events.length > 1) {
      await waRepo.updateConversation(phone, { step: 'awaiting_events', context: { events: [] } });
      await askEvents(phone, events, []);
    } else {
      const all = events.map((e) => e.id);
      await waRepo.updateConversation(phone, { step: 'awaiting_party', context: { events: all } });
      await askPartySize(phone);
    }
    return;
  }
  if ((isButton || idle) && DECLINE_RE.test(token)) {
    await recordRsvp(convo, 'declined');
    await waRepo.updateConversation(phone, { step: 'declined' });
    await client.sendText(
      phone,
      'Thank you for letting us know — you will be missed! If plans change, just reply "accept".',
    );
    return;
  }

  const ctx = (convo.context ?? {}) as FlowContext;

  switch (convo.step) {
    case 'awaiting_events': {
      const events = (await eventsRepo.findAllByOwner(convo.wedding_id)) as EventLite[];
      const chosen = ctx.events ?? [];
      if (token === 'evt_all') {
        const all = events.map((e) => e.id);
        await waRepo.updateConversation(phone, { step: 'awaiting_party', context: { events: all } });
        await askPartySize(phone);
        return;
      }
      if (token === 'evt_done' && chosen.length > 0) {
        await waRepo.updateConversation(phone, {
          step: 'awaiting_party',
          context: { events: chosen },
        });
        await askPartySize(phone);
        return;
      }
      const picked = /^evt_(.+)$/.exec(token)?.[1];
      if (picked && events.some((e) => e.id === picked) && !chosen.includes(picked)) {
        const next = [...chosen, picked];
        if (next.length === events.length) {
          await waRepo.updateConversation(phone, {
            step: 'awaiting_party',
            context: { events: next },
          });
          await askPartySize(phone);
        } else {
          await waRepo.updateConversation(phone, { context: { events: next } });
          await askEvents(phone, events, next);
        }
        return;
      }
      await askEvents(phone, events, chosen);
      return;
    }
    case 'awaiting_party': {
      const match = /^party_(\d+)$/.exec(token) ?? /^\s*(\d{1,2})\s*$/.exec(token);
      const party = match ? Number(match[1]) : NaN;
      if (!Number.isInteger(party) || party < 1 || party > 20) {
        await askPartySize(phone);
        return;
      }
      // Core RSVP commits here — meal/dietary/logistics only enrich it, so an
      // abandoned flow still leaves the couple with a confirmed headcount.
      await recordRsvp(convo, 'confirmed', Math.max(0, party - 1), ctx.events);
      await waRepo.updateConversation(phone, {
        step: 'awaiting_meal',
        context: { ...ctx, party },
      });
      await askMeal(phone);
      return;
    }
    case 'awaiting_meal': {
      const picked =
        MEAL_OPTIONS.find((m) => m.id === token) ??
        MEAL_OPTIONS.find((m) => m.title.toLowerCase() === token.trim().toLowerCase());
      if (!picked) {
        await askMeal(phone);
        return;
      }
      await guestsRepo.updateGuest(convo.guest_id, convo.wedding_id, {
        meal_preference: picked.id.replace('meal_', '') as never,
      });
      await waRepo.updateConversation(phone, { step: 'awaiting_dietary' });
      await askDietary(phone);
      return;
    }
    case 'awaiting_dietary': {
      const none = token === 'diet_none' || /^\s*(none|no|nahi|nothing)\s*\.?\s*$/i.test(token);
      if (!none && token.trim()) {
        await guestsRepo.updateGuest(convo.guest_id, convo.wedding_id, {
          dietary_restrictions: token.trim().slice(0, 500),
        });
      }
      await waRepo.updateConversation(phone, { step: 'awaiting_logistics' });
      await askLogistics(phone);
      return;
    }
    case 'awaiting_logistics': {
      if (!LOGISTICS_OPTIONS.some((o) => o.id === token)) {
        await askLogistics(phone);
        return;
      }
      await guestsRepo.updateGuest(convo.guest_id, convo.wedding_id, {
        needs_accommodation: token === 'log_accom' || token === 'log_both',
        needs_pickup: token === 'log_pickup' || token === 'log_both',
      });
      await finishFlow(convo, msg);
      return;
    }
    case 'done':
    case 'declined':
      await client.sendText(
        phone,
        'Thanks! Your RSVP is recorded. Reply "menu" for the schedule, directions or to update your response.',
      );
      return;
    default:
      // 'invited' with free text that matched nothing
      await client.sendButtons(phone, 'Please confirm your attendance:', [
        { id: 'rsvp_accept', title: 'Joyfully accept' },
        { id: 'rsvp_decline', title: 'Regretfully decline' },
      ]);
  }
}

/**
 * Meta webhook payload. Processes delivery status updates, poll answers and
 * inbound guest replies. Never throws — the webhook must always 200 or Meta
 * retries and eventually disables the subscription.
 */
export async function handleWebhook(body: unknown): Promise<void> {
  const entries = (body as { entry?: { changes?: { value?: Record<string, unknown> }[] }[] })
    ?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};

      for (const status of (value.statuses as
        | { id: string; status: string; errors?: { message?: string }[] }[]
        | undefined) ?? []) {
        await waRepo
          .updateMessageStatus(status.id, status.status, status.errors?.[0]?.message)
          .catch((e) => console.error('[whatsapp] status update failed:', e));
      }

      for (const msg of (value.messages as InboundMessage[] | undefined) ?? []) {
        try {
          const phone = client.normalizePhone(msg.from);
          const { token, display } = parseReply(msg);

          // Poll answers are stateless — the row id says everything
          const pollMatch = POLL_REPLY_RE.exec(token);
          if (pollMatch) {
            await handlePollReply(phone, pollMatch[1]!, pollMatch[2]!, Number(pollMatch[3]));
            continue;
          }

          const convo = await waRepo.findConversation(phone);
          if (!convo) {
            console.warn(`[whatsapp] inbound from unknown phone ${phone}, ignoring`);
            continue;
          }
          await waRepo.insertMessage({
            wedding_id: convo.wedding_id,
            guest_id: convo.guest_id,
            phone,
            direction: 'inbound',
            wa_message_id: msg.id,
            body: display || `[${msg.type}]`,
            status: 'received',
          });
          await advanceFlow(convo, msg);
        } catch (e) {
          console.error('[whatsapp] inbound processing failed:', e);
        }
      }
    }
  }
}
