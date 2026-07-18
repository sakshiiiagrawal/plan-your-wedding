import { BadRequestError, NotFoundError } from '../../shared/errors/HttpError';
import * as commsRepo from '../../repositories/communications.repository';
import * as guestsRepo from '../../repositories/guests.repository';
import * as eventsRepo from '../../repositories/events.repository';
import { aggregateRsvpStatus } from '../guests.service';
import { assertConfigured, getProvider, type CampaignContext } from './provider';
import { humanForCode, humanizeSendError } from './errors';
import { pollRowId } from './poll-replies';
import { formatDate, getWedding, type EventLite } from './shared';

// ---------------------------------------------------------------------------
// Channel status (setup banner + capability-aware UI)
// ---------------------------------------------------------------------------

export function listChannels() {
  const provider = getProvider('whatsapp');
  return [
    {
      channel: provider.channel,
      configured: provider.isConfigured(),
      config_hint: provider.configHint,
      capabilities: provider.capabilities,
    },
  ];
}

// ---------------------------------------------------------------------------
// Templates (admin)
// ---------------------------------------------------------------------------

export async function getTemplates(channel = 'whatsapp') {
  const provider = getProvider(channel);
  assertConfigured(provider);
  return provider.listTemplates();
}

export async function syncTemplates(channel = 'whatsapp') {
  const provider = getProvider(channel);
  assertConfigured(provider);
  return provider.syncTemplates();
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
  channel?: string;
  template_name: string;
  event_id?: string;
}

export async function sendCampaign(weddingId: string, payload: SendCampaignPayload) {
  const provider = getProvider(payload.channel);
  assertConfigured(provider);
  const spec = provider.getTemplateSpec(payload.template_name);
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
    const address = provider.normalizeAddress(guest.phone as string);
    try {
      const { providerMessageId } = await provider.sendTemplate(
        address,
        payload.template_name,
        spec.buildParams(guest, ctx),
      );
      await commsRepo.insertMessage({
        channel: provider.channel,
        wedding_id: weddingId,
        guest_id: guest.id,
        address,
        direction: 'outbound',
        provider_message_id: providerMessageId,
        template_name: payload.template_name,
        body: spec.buildParams(guest, ctx).join(' · '),
        status: 'sent',
      });
      if (spec.startsRsvpFlow) {
        await commsRepo.upsertConversation({
          channel: provider.channel,
          address,
          wedding_id: weddingId,
          guest_id: guest.id,
          step: 'invited',
          context: {},
        });
      } else {
        // Log-only row so a reply to this message still lands in the inbox
        await commsRepo.ensureConversation({
          channel: provider.channel,
          address,
          wedding_id: weddingId,
          guest_id: guest.id,
        });
      }
      sent += 1;
    } catch (err) {
      const message = humanizeSendError(err);
      await commsRepo.insertMessage({
        channel: provider.channel,
        wedding_id: weddingId,
        guest_id: guest.id,
        address,
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

// ---------------------------------------------------------------------------
// One-off free-text message (thread reply box)
// ---------------------------------------------------------------------------

export async function sendTextMessage(
  weddingId: string,
  payload: { guest_id: string; body: string; channel?: string },
) {
  const provider = getProvider(payload.channel);
  assertConfigured(provider);
  const guest = await guestsRepo.findByIdAndOwner(payload.guest_id, weddingId);
  if (!guest) throw new NotFoundError('Guest not found');
  if (!guest.phone) throw new BadRequestError('This guest has no phone number');
  const address = provider.normalizeAddress(guest.phone);

  if (provider.capabilities.sessionWindowHours != null) {
    const { reachable } = await getReachability(weddingId, [guest.id], provider.channel);
    if (!reachable[guest.id]) {
      throw new BadRequestError(humanForCode(131047) ?? 'The reply window has closed');
    }
  }

  try {
    const { providerMessageId } = await provider.sendText(address, payload.body);
    const message = await commsRepo.insertMessage({
      channel: provider.channel,
      wedding_id: weddingId,
      guest_id: guest.id,
      address,
      direction: 'outbound',
      provider_message_id: providerMessageId,
      body: payload.body,
      status: 'sent',
    });
    await commsRepo.ensureConversation({
      channel: provider.channel,
      address,
      wedding_id: weddingId,
      guest_id: guest.id,
    });
    return message;
  } catch (err) {
    const message = humanizeSendError(err);
    await commsRepo.insertMessage({
      channel: provider.channel,
      wedding_id: weddingId,
      guest_id: guest.id,
      address,
      direction: 'outbound',
      body: payload.body,
      status: 'failed',
      error: message,
    });
    throw new BadRequestError(message);
  }
}

// ---------------------------------------------------------------------------
// Inbox: conversations, threads, read state, reachability
// ---------------------------------------------------------------------------

export interface ConversationSummary {
  guest_id: string;
  guest_name: string;
  address: string;
  channel: string;
  flow_step: string | null;
  unread: boolean;
  last_message: {
    body: string | null;
    template_name: string | null;
    direction: string;
    status: string;
    created_at: string;
  };
  last_outbound_status: string | null;
}

export async function listConversations(
  weddingId: string,
  channel = 'whatsapp',
): Promise<ConversationSummary[]> {
  const [messages, states] = await Promise.all([
    commsRepo.listRecentMessages(weddingId, channel),
    commsRepo.listConversationStates(weddingId, channel),
  ]);
  const stateByAddress = new Map(states.map((s) => [s.address, s]));

  const byGuest = new Map<string, ConversationSummary>();
  for (const msg of messages) {
    // Messages arrive newest-first, so the first message per guest is the latest
    if (!msg.guest_id) continue;
    let entry = byGuest.get(msg.guest_id);
    if (!entry) {
      const state = stateByAddress.get(msg.address);
      const name = msg.guests
        ? `${msg.guests.first_name} ${msg.guests.last_name ?? ''}`.trim()
        : 'Unknown guest';
      entry = {
        guest_id: msg.guest_id,
        guest_name: name,
        address: msg.address,
        channel,
        flow_step: state?.flow === 'rsvp' ? state.step : null,
        unread: false,
        last_message: {
          body: msg.body ?? null,
          template_name: msg.template_name ?? null,
          direction: msg.direction,
          status: msg.status,
          created_at: msg.created_at,
        },
        last_outbound_status: null,
      };
      byGuest.set(msg.guest_id, entry);
    }
    if (entry.last_outbound_status === null && msg.direction === 'outbound') {
      entry.last_outbound_status = msg.status;
    }
    if (!entry.unread && msg.direction === 'inbound') {
      const readAt = stateByAddress.get(msg.address)?.last_read_at;
      if (!readAt || msg.created_at > readAt) entry.unread = true;
    }
  }
  return [...byGuest.values()];
}

export async function getThread(weddingId: string, guestId: string, channel = 'whatsapp') {
  return commsRepo.listThread(weddingId, guestId, channel);
}

export async function markConversationRead(
  weddingId: string,
  guestId: string,
  channel = 'whatsapp',
): Promise<void> {
  const provider = getProvider(channel);
  const guest = await guestsRepo.findByIdAndOwner(guestId, weddingId);
  if (!guest?.phone) return;
  const address = provider.normalizeAddress(guest.phone);
  await commsRepo.ensureConversation({
    channel: provider.channel,
    address,
    wedding_id: weddingId,
    guest_id: guestId,
  });
  await commsRepo.setConversationRead(provider.channel, address);
}

/**
 * Which of these guests can receive free-form/interactive messages right now
 * (an inbound message inside the provider's session window). Guests are always
 * reachable on channels without a window.
 */
export async function getReachability(
  weddingId: string,
  guestIds: string[],
  channel = 'whatsapp',
): Promise<{ reachable: Record<string, boolean>; window_hours: number | null }> {
  const provider = getProvider(channel);
  const hours = provider.capabilities.sessionWindowHours;
  if (hours == null) {
    return {
      reachable: Object.fromEntries(guestIds.map((id) => [id, true])),
      window_hours: null,
    };
  }
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const inWindow = await commsRepo.listInboundGuestsSince(weddingId, guestIds, channel, since);
  return {
    reachable: Object.fromEntries(guestIds.map((id) => [id, inWindow.has(id)])),
    window_hours: hours,
  };
}

export function listMessages(weddingId: string) {
  return commsRepo.listMessages(weddingId);
}

// ---------------------------------------------------------------------------
// Polls — interactive lists standing in for polls (the API has none).
// ---------------------------------------------------------------------------

export interface SendPollPayload extends AudienceFilter {
  channel?: string;
  question: string;
  options: string[];
}

export async function sendPoll(weddingId: string, payload: SendPollPayload) {
  const provider = getProvider(payload.channel);
  assertConfigured(provider);
  if (!provider.capabilities.supportsPolls) {
    throw new BadRequestError(`Polls are not supported on ${provider.channel}`);
  }
  const options = payload.options.map((o) => o.trim()).filter(Boolean);
  if (options.length < 2 || options.length > 10) {
    throw new BadRequestError('A poll needs between 2 and 10 options');
  }
  const targets = await resolveAudience(weddingId, payload);

  // Polls are interactive messages, so the session window applies: scope the
  // send to reachable guests up front instead of burning sends that must fail.
  const { reachable } = await getReachability(
    weddingId,
    targets.map((t) => t.id),
    provider.channel,
  );
  const sendable = targets.filter((t) => reachable[t.id]);
  if (sendable.length === 0) {
    throw new BadRequestError(
      `None of the selected guests can receive a poll right now. ${humanForCode(131047) ?? ''}`.trim(),
    );
  }

  const poll = await commsRepo.insertPoll(weddingId, payload.question, options, provider.channel);

  let sent = 0;
  const failed: { guest_id: string; name: string; error: string }[] = [];
  for (const guest of sendable) {
    const address = provider.normalizeAddress(guest.phone as string);
    try {
      const { providerMessageId } = await provider.sendPollList(
        address,
        payload.question,
        options.map((title, idx) => ({ id: pollRowId(poll.id, guest.id, idx), title })),
      );
      await commsRepo.insertMessage({
        channel: provider.channel,
        wedding_id: weddingId,
        guest_id: guest.id,
        address,
        direction: 'outbound',
        provider_message_id: providerMessageId,
        template_name: 'poll',
        body: payload.question,
        status: 'sent',
      });
      await commsRepo.ensureConversation({
        channel: provider.channel,
        address,
        wedding_id: weddingId,
        guest_id: guest.id,
      });
      sent += 1;
    } catch (err) {
      const message = humanizeSendError(err);
      await commsRepo.insertMessage({
        channel: provider.channel,
        wedding_id: weddingId,
        guest_id: guest.id,
        address,
        direction: 'outbound',
        template_name: 'poll',
        body: payload.question,
        status: 'failed',
        error: message,
      });
      failed.push({ guest_id: guest.id, name: guest.first_name, error: message });
    }
  }

  if (sent === 0) {
    // Every send failed — don't leave a junk poll behind
    await commsRepo.deletePoll(poll.id, weddingId);
    throw new BadRequestError(`Poll could not be sent to anyone: ${failed[0]?.error ?? 'send failed'}`);
  }

  return {
    poll_id: poll.id,
    sent,
    failed,
    total: sendable.length,
    skipped_unreachable: targets.length - sendable.length,
  };
}

export async function listPolls(weddingId: string) {
  const rows = (await commsRepo.listPollsWithResponses(weddingId)) as {
    id: string;
    question: string;
    options: string[];
    created_at: string;
    poll_responses: {
      guest_id: string;
      option_idx: number;
      guests: { first_name: string; last_name: string | null } | null;
    }[];
  }[];
  return rows.map((p) => ({
    id: p.id,
    question: p.question,
    created_at: p.created_at,
    total_votes: p.poll_responses.length,
    options: p.options.map((label, idx) => ({
      label,
      votes: p.poll_responses.filter((r) => r.option_idx === idx).length,
      voters: p.poll_responses
        .filter((r) => r.option_idx === idx)
        .map((r) =>
          r.guests ? `${r.guests.first_name} ${r.guests.last_name ?? ''}`.trim() : 'Unknown',
        ),
    })),
  }));
}

export async function deletePoll(weddingId: string, pollId: string): Promise<void> {
  await commsRepo.deletePoll(pollId, weddingId);
}
