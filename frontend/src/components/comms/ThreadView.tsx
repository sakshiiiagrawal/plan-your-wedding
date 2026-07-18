import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlinePaperAirplane } from 'react-icons/hi';
import {
  useMarkConversationRead,
  useReachability,
  useSendText,
  useThread,
  type CommsConversation,
} from '../../hooks/useApi';
import { Pill } from '../ui';
import MessageBubble from './MessageBubble';
import { apiError } from './shared';

const STEP_LABEL: Record<string, { label: string; variant: 'ok' | 'warn' | 'err' | 'muted' }> = {
  invited: { label: 'Invited', variant: 'muted' },
  awaiting_events: { label: 'RSVP in progress', variant: 'warn' },
  awaiting_party: { label: 'RSVP in progress', variant: 'warn' },
  awaiting_meal: { label: 'RSVP in progress', variant: 'warn' },
  awaiting_dietary: { label: 'RSVP in progress', variant: 'warn' },
  awaiting_logistics: { label: 'RSVP in progress', variant: 'warn' },
  done: { label: 'RSVP complete', variant: 'ok' },
  declined: { label: 'Declined', variant: 'err' },
};

export default function ThreadView({
  conversation,
  onBack,
  onSendTemplate,
}: {
  conversation: CommsConversation;
  onBack: () => void;
  onSendTemplate: (guestId: string) => void;
}) {
  const guestId = conversation.guest_id;
  const thread = useThread(guestId);
  const reach = useReachability([guestId]);
  const sendText = useSendText();
  const markRead = useMarkConversationRead();
  const [body, setBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const messageCount = thread.data?.length ?? 0;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messageCount, guestId]);

  useEffect(() => {
    if (conversation.unread) markRead.mutate(guestId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestId, conversation.unread]);

  const reachable = reach.data?.reachable[guestId] ?? false;
  const step = conversation.flow_step ? STEP_LABEL[conversation.flow_step] : undefined;

  const handleSend = () => {
    const text = body.trim();
    if (!text || sendText.isPending) return;
    sendText.mutate(
      { guest_id: guestId, body: text },
      {
        onSuccess: () => setBody(''),
        onError: (e: unknown) => toast.error(apiError(e, 'Send failed'), { duration: 6000 }),
      },
    );
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-3"
        style={{ padding: '10px 14px', borderBottom: '1px solid var(--line-soft)' }}
      >
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-ink-dim hover:bg-surface-raised md:hidden"
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold text-ink-high">
            {conversation.guest_name}
          </div>
          <div className="mono text-[11px] text-ink-dim">+{conversation.address}</div>
        </div>
        {step && (
          <div className="ml-auto shrink-0">
            <Pill variant={step.variant}>{step.label}</Pill>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto" style={{ padding: 14 }}>
        {(thread.data ?? []).map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
        {thread.isLoading && <p className="text-center text-[13px] text-ink-low">Loading…</p>}
        {!thread.isLoading && messageCount === 0 && (
          <p className="py-8 text-center text-[13px] text-ink-low">No messages yet.</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      <div style={{ padding: 12, borderTop: '1px solid var(--line-soft)' }}>
        {reachable ? (
          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Type a reply…"
              className="flex-1 resize-none rounded-lg border border-line-strong bg-surface-panel px-3 py-2 text-[13px]"
            />
            <button
              onClick={handleSend}
              disabled={!body.trim() || sendText.isPending}
              className="btn-primary flex items-center gap-1.5 px-3.5 py-2 text-sm disabled:opacity-50"
              title="Send"
            >
              <HiOutlinePaperAirplane className="h-4 w-4 rotate-90" />
              {sendText.isPending ? 'Sending…' : 'Send'}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] text-ink-low">
              {reach.isLoading
                ? 'Checking the reply window…'
                : 'The 24-hour reply window is closed — free-form replies need a recent message from this guest.'}
            </span>
            <button
              onClick={() => onSendTemplate(guestId)}
              className="btn-secondary shrink-0 px-3 py-1.5 text-[12px]"
            >
              Send a template instead
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
