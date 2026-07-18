import type { GuestEventRsvpInsert } from '../../../../../shared/src';
import * as client from './client';
import * as commsRepo from '../../../repositories/communications.repository';
import * as guestsRepo from '../../../repositories/guests.repository';
import * as eventsRepo from '../../../repositories/events.repository';
import { formatDate, formatTime, getWedding, siteUrl, type EventLite } from '../shared';

// ---------------------------------------------------------------------------
// Inbound RSVP conversation state machine + assistant keywords. This is
// WhatsApp-specific conversational UX (interactive buttons/lists); other
// channels get their own flows or none.
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

export interface InboundMessage {
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
export function parseReply(msg: InboundMessage): {
  token: string;
  display: string;
  isButton: boolean;
} {
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
  convo: commsRepo.Conversation,
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
  address: string,
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
    address,
    chosen.length === 0
      ? 'Which celebrations will you be joining? Pick one at a time, or all of them.'
      : `Lovely! Any other events? (${chosen.length} picked)`,
    'Pick events',
    rows,
  );
}

async function askPartySize(address: string): Promise<void> {
  await client.sendList(
    address,
    'How many guests will be attending in total, including you?',
    'Select count',
    [1, 2, 3, 4, 5].map((n) => ({ id: `party_${n}`, title: String(n) })),
  );
}

async function askMeal(address: string): Promise<void> {
  await client.sendList(address, 'Noted! And what is your meal preference?', 'Choose meal', [
    ...MEAL_OPTIONS,
  ]);
}

async function askDietary(address: string): Promise<void> {
  await client.sendButtons(
    address,
    'Any allergies or dietary notes we should know about? Type them here, or tap None.',
    [{ id: 'diet_none', title: 'None' }],
  );
}

async function askLogistics(address: string): Promise<void> {
  await client.sendList(address, 'Almost done! Will you need any help with travel or stay?', 'Select', [
    ...LOGISTICS_OPTIONS,
  ]);
}

async function finishFlow(convo: commsRepo.Conversation, msg: InboundMessage): Promise<void> {
  const { channel, address } = convo;
  await commsRepo.updateConversation(channel, address, { step: 'done' });
  const ctx = convo.context as FlowContext;
  const party = Number(ctx.party ?? 1);
  // The reaction and CTA are garnish — never let them mask a saved RSVP
  await client.sendReaction(address, msg.id, '🎉').catch(() => {});
  const wedding = await getWedding(convo.wedding_id);
  const summary =
    `Wonderful — you're confirmed for ${party} ${party === 1 ? 'guest' : 'guests'}. ` +
    'Your RSVP, meal preference and travel needs are saved. We cannot wait to celebrate with you! ' +
    'Reply "menu" anytime for the schedule, directions, or to update your RSVP.';
  if (wedding.slug) {
    await client
      .sendCtaUrl(address, summary, 'View wedding page', siteUrl(wedding.slug))
      .catch(() => client.sendText(address, summary));
  } else {
    await client.sendText(address, summary);
  }
}

// --- Assistant keyword replies ---------------------------------------------

async function sendMenu(address: string): Promise<void> {
  await client.sendList(address, 'How can I help?', 'Options', [
    { id: 'menu_rsvp', title: 'Update my RSVP', description: 'Change attendance or details' },
    { id: 'menu_schedule', title: 'Event schedule', description: 'Dates, times and venues' },
    { id: 'menu_directions', title: 'Venue directions', description: 'Get location pins' },
    { id: 'menu_website', title: 'Wedding website', description: 'All the details in one place' },
  ]);
}

async function sendSchedule(convo: commsRepo.Conversation): Promise<void> {
  const events = (await eventsRepo.findAllByOwner(convo.wedding_id)) as EventLite[];
  if (events.length === 0) {
    await client.sendText(convo.address, 'The schedule is still being finalised — check back soon!');
    return;
  }
  const lines = events.map((e) => {
    const time = e.start_time ? ` · ${formatTime(e.start_time)}` : '';
    const venue = e.venues?.name ? ` · ${e.venues.name}` : '';
    return `✨ *${e.name}* — ${formatDate(e.event_date)}${time}${venue}`;
  });
  await client.sendText(convo.address, `Here's the celebration schedule:\n\n${lines.join('\n')}`);
}

async function sendDirections(convo: commsRepo.Conversation): Promise<void> {
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
      convo.address,
      fallback || 'Venue details are still being finalised — check back soon!',
    );
    return;
  }
  for (const v of locatable) {
    await client.sendLocation(convo.address, {
      latitude: v.latitude as number,
      longitude: v.longitude as number,
      name: v.name as string,
      ...(v.address ? { address: v.address } : {}),
    });
  }
}

async function sendWebsiteLink(convo: commsRepo.Conversation): Promise<void> {
  const wedding = await getWedding(convo.wedding_id);
  if (!wedding.slug) {
    await client.sendText(convo.address, 'The wedding website is not published yet — stay tuned!');
    return;
  }
  await client.sendCtaUrl(
    convo.address,
    `Everything about ${wedding.title} — schedule, photos and more.`,
    'Open wedding page',
    siteUrl(wedding.slug),
  );
}

// --- The state machine ------------------------------------------------------

export async function advanceFlow(
  convo: commsRepo.Conversation,
  msg: InboundMessage,
): Promise<void> {
  const { channel, address } = convo;
  const { token, isButton } = parseReply(msg);
  const idle = IDLE_STEPS.has(convo.step);

  // Menu keywords and menu picks (only when not mid-question)
  if (idle && (MENU_RE.test(token) || token === 'menu_rsvp')) {
    if (token === 'menu_rsvp') {
      await client.sendButtons(address, 'Please confirm your attendance:', [
        { id: 'rsvp_accept', title: 'Joyfully accept' },
        { id: 'rsvp_decline', title: 'Regretfully decline' },
      ]);
    } else {
      await sendMenu(address);
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
      await commsRepo.updateConversation(channel, address, {
        step: 'awaiting_events',
        context: { events: [] },
      });
      await askEvents(address, events, []);
    } else {
      const all = events.map((e) => e.id);
      await commsRepo.updateConversation(channel, address, {
        step: 'awaiting_party',
        context: { events: all },
      });
      await askPartySize(address);
    }
    return;
  }
  if ((isButton || idle) && DECLINE_RE.test(token)) {
    await recordRsvp(convo, 'declined');
    await commsRepo.updateConversation(channel, address, { step: 'declined' });
    await client.sendText(
      address,
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
        await commsRepo.updateConversation(channel, address, {
          step: 'awaiting_party',
          context: { events: all },
        });
        await askPartySize(address);
        return;
      }
      if (token === 'evt_done' && chosen.length > 0) {
        await commsRepo.updateConversation(channel, address, {
          step: 'awaiting_party',
          context: { events: chosen },
        });
        await askPartySize(address);
        return;
      }
      const picked = /^evt_(.+)$/.exec(token)?.[1];
      if (picked && events.some((e) => e.id === picked) && !chosen.includes(picked)) {
        const next = [...chosen, picked];
        if (next.length === events.length) {
          await commsRepo.updateConversation(channel, address, {
            step: 'awaiting_party',
            context: { events: next },
          });
          await askPartySize(address);
        } else {
          await commsRepo.updateConversation(channel, address, { context: { events: next } });
          await askEvents(address, events, next);
        }
        return;
      }
      await askEvents(address, events, chosen);
      return;
    }
    case 'awaiting_party': {
      const match = /^party_(\d+)$/.exec(token) ?? /^\s*(\d{1,2})\s*$/.exec(token);
      const party = match ? Number(match[1]) : NaN;
      if (!Number.isInteger(party) || party < 1 || party > 20) {
        await askPartySize(address);
        return;
      }
      // Core RSVP commits here — meal/dietary/logistics only enrich it, so an
      // abandoned flow still leaves the couple with a confirmed headcount.
      await recordRsvp(convo, 'confirmed', Math.max(0, party - 1), ctx.events);
      await commsRepo.updateConversation(channel, address, {
        step: 'awaiting_meal',
        context: { ...ctx, party },
      });
      await askMeal(address);
      return;
    }
    case 'awaiting_meal': {
      const picked =
        MEAL_OPTIONS.find((m) => m.id === token) ??
        MEAL_OPTIONS.find((m) => m.title.toLowerCase() === token.trim().toLowerCase());
      if (!picked) {
        await askMeal(address);
        return;
      }
      await guestsRepo.updateGuest(convo.guest_id, convo.wedding_id, {
        meal_preference: picked.id.replace('meal_', '') as never,
      });
      await commsRepo.updateConversation(channel, address, { step: 'awaiting_dietary' });
      await askDietary(address);
      return;
    }
    case 'awaiting_dietary': {
      const none = token === 'diet_none' || /^\s*(none|no|nahi|nothing)\s*\.?\s*$/i.test(token);
      if (!none && token.trim()) {
        await guestsRepo.updateGuest(convo.guest_id, convo.wedding_id, {
          dietary_restrictions: token.trim().slice(0, 500),
        });
      }
      await commsRepo.updateConversation(channel, address, { step: 'awaiting_logistics' });
      await askLogistics(address);
      return;
    }
    case 'awaiting_logistics': {
      if (!LOGISTICS_OPTIONS.some((o) => o.id === token)) {
        await askLogistics(address);
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
        address,
        'Thanks! Your RSVP is recorded. Reply "menu" for the schedule, directions or to update your response.',
      );
      return;
    default:
      // 'invited' with free text that matched nothing
      await client.sendButtons(address, 'Please confirm your attendance:', [
        { id: 'rsvp_accept', title: 'Joyfully accept' },
        { id: 'rsvp_decline', title: 'Regretfully decline' },
      ]);
  }
}
