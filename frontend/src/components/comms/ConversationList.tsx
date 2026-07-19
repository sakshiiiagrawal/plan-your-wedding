import { useMemo, useState } from 'react';
import { HiOutlineSearch } from 'react-icons/hi';
import type { CommsConversation } from '../../hooks/useApi';
import { Ticks } from './MessageBubble';
import { fmtWhen } from './shared';

function snippet(c: CommsConversation): string {
  const m = c.last_message;
  if (m.body) return m.body;
  if (m.template_name) return `[${m.template_name}]`;
  return '…';
}

export default function ConversationList({
  conversations,
  loading,
  selectedGuestId,
  onSelect,
}: {
  conversations: CommsConversation[];
  loading: boolean;
  selectedGuestId: string | null;
  onSelect: (guestId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.guest_name.toLowerCase().includes(q));
  }, [conversations, search]);

  return (
    <div className="flex h-full flex-col">
      <div style={{ padding: 10, borderBottom: '1px solid var(--line-soft)' }}>
        <div className="relative">
          <HiOutlineSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="input pl-8"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((c) => {
          const active = c.guest_id === selectedGuestId;
          const outFailed = c.last_outbound_status === 'failed';
          return (
            <button
              key={c.guest_id}
              onClick={() => onSelect(c.guest_id)}
              className="block w-full text-left transition-colors"
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid var(--line-soft)',
                background: active ? 'var(--gold-glow)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="truncate text-[13px]"
                  style={{
                    color: 'var(--ink-high)',
                    fontWeight: c.unread ? 650 : 500,
                  }}
                >
                  {c.guest_name}
                </span>
                <span className="shrink-0 text-[10px] text-ink-dim">
                  {fmtWhen(c.last_message.created_at)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                {c.last_message.direction === 'outbound' && !outFailed && (
                  <span className="shrink-0 text-[10px] text-ink-dim">
                    <Ticks status={c.last_outbound_status ?? 'sent'} />
                  </span>
                )}
                {outFailed && (
                  <span
                    className="shrink-0 text-[10px] font-medium"
                    style={{ color: 'var(--err)' }}
                  >
                    ⚠
                  </span>
                )}
                <span
                  className="truncate text-[12px]"
                  style={{ color: c.unread ? 'var(--ink-mid)' : 'var(--ink-low)' }}
                >
                  {c.last_message.direction === 'inbound' ? '' : 'You: '}
                  {snippet(c)}
                </span>
                {c.unread && (
                  <span
                    className="ml-auto h-2 w-2 shrink-0 rounded-full"
                    style={{ background: 'var(--gold)' }}
                  />
                )}
              </div>
            </button>
          );
        })}
        {!loading && filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-[13px] text-ink-low">
            {conversations.length === 0
              ? 'No conversations yet — send an invite from the guest list to get started.'
              : 'No conversations match.'}
          </p>
        )}
        {loading && <p className="px-4 py-8 text-center text-[13px] text-ink-low">Loading…</p>}
      </div>
    </div>
  );
}
