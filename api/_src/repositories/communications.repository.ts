import { supabase } from '../config/database';

export interface Conversation {
  channel: string;
  /** Canonical channel address — digits-only E.164 for phone channels. */
  address: string;
  wedding_id: string;
  guest_id: string;
  /** 'rsvp' drives the WhatsApp RSVP state machine; 'none' is log-only. */
  flow: string;
  step: string;
  context: Record<string, unknown>;
  updated_at: string;
  last_read_at: string | null;
  last_inbound_at: string | null;
}

export interface MessageInsert {
  channel: string;
  wedding_id: string;
  guest_id?: string | null;
  address: string;
  direction: 'outbound' | 'inbound';
  provider_message_id?: string | null;
  template_name?: string | null;
  body?: string | null;
  status?: string;
  error?: string | null;
}

export interface MessageRow extends MessageInsert {
  id: string;
  status: string;
  created_at: string;
}

export async function upsertConversation(
  row: Pick<Conversation, 'channel' | 'address' | 'wedding_id' | 'guest_id' | 'step' | 'context'>,
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .upsert(
      { ...row, flow: 'rsvp', updated_at: new Date().toISOString() },
      { onConflict: 'channel,address' },
    );
  if (error) throw error;
}

/** Create a log-only conversation row if none exists; never touches flow state. */
export async function ensureConversation(
  row: Pick<Conversation, 'channel' | 'address' | 'wedding_id' | 'guest_id'>,
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .upsert(
      { ...row, flow: 'none', step: 'idle', context: {}, updated_at: new Date().toISOString() },
      { onConflict: 'channel,address', ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function findConversation(
  channel: string,
  address: string,
): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('channel', channel)
    .eq('address', address)
    .maybeSingle();
  if (error) throw error;
  return data as Conversation | null;
}

export async function updateConversation(
  channel: string,
  address: string,
  patch: Partial<Pick<Conversation, 'step' | 'context' | 'last_inbound_at'>>,
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('channel', channel)
    .eq('address', address);
  if (error) throw error;
}

export async function setConversationRead(channel: string, address: string): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ last_read_at: new Date().toISOString() })
    .eq('channel', channel)
    .eq('address', address);
  if (error) throw error;
}

export async function listConversationStates(
  weddingId: string,
  channel: string,
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('wedding_id', weddingId)
    .eq('channel', channel);
  if (error) throw error;
  return (data ?? []) as Conversation[];
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function insertMessage(row: MessageInsert): Promise<MessageRow> {
  const { data, error } = await supabase.from('messages').insert([row]).select('*').single();
  if (error) throw error;
  return data as MessageRow;
}

export async function updateMessageStatus(
  providerMessageId: string,
  status: string,
  errorText?: string,
): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ status, ...(errorText ? { error: errorText } : {}) })
    .eq('provider_message_id', providerMessageId);
  if (error) throw error;
}

export async function listMessages(weddingId: string, limit = 100) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, guests!guest_id(first_name, last_name)')
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Latest `limit` messages of a guest's thread, returned oldest-first. */
export async function listThread(
  weddingId: string,
  guestId: string,
  channel: string,
  limit = 200,
): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('wedding_id', weddingId)
    .eq('guest_id', guestId)
    .eq('channel', channel)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as MessageRow[]).reverse();
}

/** Recent messages across the wedding — raw material for the inbox list. */
export async function listRecentMessages(
  weddingId: string,
  channel: string,
  limit = 500,
): Promise<(MessageRow & { guests: { first_name: string; last_name: string | null } | null })[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*, guests!guest_id(first_name, last_name)')
    .eq('wedding_id', weddingId)
    .eq('channel', channel)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as (MessageRow & {
    guests: { first_name: string; last_name: string | null } | null;
  })[];
}

/** Guests with an inbound message on/after `sinceIso` — the reachable set. */
export async function listInboundGuestsSince(
  weddingId: string,
  guestIds: string[],
  channel: string,
  sinceIso: string,
): Promise<Set<string>> {
  if (guestIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('messages')
    .select('guest_id')
    .eq('wedding_id', weddingId)
    .eq('channel', channel)
    .eq('direction', 'inbound')
    .in('guest_id', guestIds)
    .gte('created_at', sinceIso);
  if (error) throw error;
  return new Set(((data ?? []) as { guest_id: string }[]).map((r) => r.guest_id));
}

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------

export async function insertPoll(
  weddingId: string,
  question: string,
  options: string[],
  channel: string,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('polls')
    .insert([{ wedding_id: weddingId, question, options, channel }])
    .select('id')
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function findPoll(
  pollId: string,
): Promise<{ id: string; wedding_id: string; options: string[] } | null> {
  const { data, error } = await supabase
    .from('polls')
    .select('id, wedding_id, options')
    .eq('id', pollId)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; wedding_id: string; options: string[] } | null;
}

export async function deletePoll(pollId: string, weddingId: string): Promise<void> {
  const { error } = await supabase
    .from('polls')
    .delete()
    .eq('id', pollId)
    .eq('wedding_id', weddingId);
  if (error) throw error;
}

export async function upsertPollResponse(
  pollId: string,
  guestId: string,
  optionIdx: number,
): Promise<void> {
  const { error } = await supabase
    .from('poll_responses')
    .upsert(
      { poll_id: pollId, guest_id: guestId, option_idx: optionIdx },
      { onConflict: 'poll_id,guest_id' },
    );
  if (error) throw error;
}

export async function listPollsWithResponses(weddingId: string) {
  const { data, error } = await supabase
    .from('polls')
    .select('*, poll_responses(guest_id, option_idx, guests!guest_id(first_name, last_name))')
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
