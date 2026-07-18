import type { CommsMessage } from '../../hooks/useApi';
import { WA_GREEN, fmtWhen } from './shared';

/** WhatsApp-style delivery ticks for outbound messages. */
export function Ticks({ status }: { status: string }) {
  if (status === 'sent') return <span title="Sent">✓</span>;
  if (status === 'delivered') return <span title="Delivered">✓✓</span>;
  if (status === 'read')
    return (
      <span title="Read" style={{ color: WA_GREEN, fontWeight: 600 }}>
        ✓✓
      </span>
    );
  return null;
}

export default function MessageBubble({ msg }: { msg: CommsMessage }) {
  const outbound = msg.direction === 'outbound';
  const failed = msg.status === 'failed';
  return (
    <div className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
      <div style={{ maxWidth: '78%' }}>
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 12,
            borderBottomRightRadius: outbound ? 4 : 12,
            borderBottomLeftRadius: outbound ? 12 : 4,
            background: outbound ? 'var(--gold-glow)' : 'var(--bg-raised)',
            border: `1px solid ${failed ? 'var(--err)' : 'var(--line-soft)'}`,
          }}
        >
          {msg.template_name && (
            <div
              className="mono"
              style={{ fontSize: 10, color: 'var(--ink-dim)', marginBottom: 3 }}
            >
              {msg.template_name === 'poll' ? 'poll' : `template · ${msg.template_name}`}
            </div>
          )}
          <div
            style={{
              fontSize: 13,
              color: 'var(--ink-high)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {msg.body || <span style={{ color: 'var(--ink-dim)' }}>[no text]</span>}
          </div>
        </div>
        <div
          className={`mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-dim ${
            outbound ? 'justify-end' : ''
          }`}
        >
          <span>{fmtWhen(msg.created_at)}</span>
          {outbound && !failed && <Ticks status={msg.status} />}
          {failed && <span style={{ color: 'var(--err)', fontWeight: 500 }}>failed</span>}
        </div>
        {failed && msg.error && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--err)',
              marginTop: 2,
              maxWidth: 320,
              textAlign: outbound ? 'right' : 'left',
            }}
          >
            {msg.error}
          </div>
        )}
      </div>
    </div>
  );
}
