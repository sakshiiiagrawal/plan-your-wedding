import { supabase } from '../config/database';

export interface WaConversation {
  phone: string;
  wedding_id: string;
  guest_id: string;
  flow: string;
  step: string;
  context: Record<string, unknown>;
  updated_at: string;
}

export interface WaMessageInsert {
  wedding_id: string;
  guest_id?: string | null;
  phone: string;
  direction: 'outbound' | 'inbound';
  wa_message_id?: string | null;
  template_name?: string | null;
  body?: string | null;
  status?: string;
  error?: string | null;
}

export async function upsertConversation(
  row: Omit<WaConversation, 'updated_at' | 'flow'>,
): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_conversations')
    .upsert({ ...row, flow: 'rsvp', updated_at: new Date().toISOString() }, { onConflict: 'phone' });
  if (error) throw error;
}

export async function findConversation(phone: string): Promise<WaConversation | null> {
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();
  if (error) throw error;
  return data as WaConversation | null;
}

export async function updateConversation(
  phone: string,
  patch: Partial<Pick<WaConversation, 'step' | 'context'>>,
): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_conversations')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('phone', phone);
  if (error) throw error;
}

export async function insertMessage(row: WaMessageInsert): Promise<void> {
  const { error } = await supabase.from('whatsapp_messages').insert([row]);
  if (error) throw error;
}

export async function updateMessageStatus(
  waMessageId: string,
  status: string,
  errorText?: string,
): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_messages')
    .update({ status, ...(errorText ? { error: errorText } : {}) })
    .eq('wa_message_id', waMessageId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------

export async function insertPoll(
  weddingId: string,
  question: string,
  options: string[],
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('whatsapp_polls')
    .insert([{ wedding_id: weddingId, question, options }])
    .select('id')
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function findPoll(
  pollId: string,
): Promise<{ id: string; wedding_id: string; options: string[] } | null> {
  const { data, error } = await supabase
    .from('whatsapp_polls')
    .select('id, wedding_id, options')
    .eq('id', pollId)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; wedding_id: string; options: string[] } | null;
}

export async function upsertPollResponse(
  pollId: string,
  guestId: string,
  optionIdx: number,
): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_poll_responses')
    .upsert(
      { poll_id: pollId, guest_id: guestId, option_idx: optionIdx },
      { onConflict: 'poll_id,guest_id' },
    );
  if (error) throw error;
}

export async function listPollsWithResponses(weddingId: string) {
  const { data, error } = await supabase
    .from('whatsapp_polls')
    .select('*, whatsapp_poll_responses(guest_id, option_idx, guests!guest_id(first_name, last_name))')
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listMessages(weddingId: string, limit = 100) {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*, guests!guest_id(first_name, last_name)')
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
