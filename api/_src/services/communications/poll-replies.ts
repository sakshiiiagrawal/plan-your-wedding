import * as commsRepo from '../../repositories/communications.repository';
import * as guestsRepo from '../../repositories/guests.repository';
import type { ChannelProvider } from './provider';

/**
 * Poll replies are stateless: each list-row id encodes poll + guest + option,
 * so no conversation state is needed and guests can re-vote. This format is
 * load-bearing — in-flight polls survive deploys — do not change it.
 */
export const POLL_REPLY_RE = /^poll_([0-9a-f-]{36})_([0-9a-f-]{36})_(\d+)$/;

export function pollRowId(pollId: string, guestId: string, optionIdx: number): string {
  return `poll_${pollId}_${guestId}_${optionIdx}`;
}

export async function handlePollReply(
  provider: ChannelProvider,
  address: string,
  pollId: string,
  guestId: string,
  optionIdx: number,
): Promise<void> {
  const poll = await commsRepo.findPoll(pollId);
  if (!poll || optionIdx >= poll.options.length) return;
  // The row id round-trips through the guest's device — confirm the guest
  // really belongs to this poll's wedding before recording.
  const guest = await guestsRepo.findByIdAndOwner(guestId, poll.wedding_id);
  if (!guest) return;
  await commsRepo.upsertPollResponse(pollId, guestId, optionIdx);
  await commsRepo.insertMessage({
    channel: provider.channel,
    wedding_id: poll.wedding_id,
    guest_id: guestId,
    address,
    direction: 'inbound',
    body: `Poll answer: ${poll.options[optionIdx]}`,
    status: 'received',
  });
  // A vote opens/extends the session window like any inbound message.
  await commsRepo
    .updateConversation(provider.channel, address, {
      last_inbound_at: new Date().toISOString(),
    })
    .catch(() => {});
  await provider.sendText(address, `Noted — “${poll.options[optionIdx]}”. Thanks for answering!`);
}
