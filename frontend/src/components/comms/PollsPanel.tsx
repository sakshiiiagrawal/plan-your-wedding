import { useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';
import { useCommsPolls, useDeletePoll } from '../../hooks/useApi';
import { WA_GREEN, apiError } from './shared';

/** Poll result cards: vote bars, voters on hover, delete, new-poll entry. */
export default function PollsPanel({ onNewPoll }: { onNewPoll: () => void }) {
  const polls = useCommsPolls();
  const deletePoll = useDeletePoll();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] leading-relaxed text-ink-low">
          Polls are interactive WhatsApp questions — guests tap one option, answers tally here
          live and guests can change their vote. Only guests who replied in the last 24 hours can
          receive one.
        </p>
        <button
          onClick={onNewPoll}
          className="btn-primary flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm"
        >
          <HiOutlinePlus className="h-4 w-4" />
          New poll
        </button>
      </div>

      {(polls.data ?? []).map((p) => (
        <div key={p.id} className="card" style={{ padding: 16 }}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink-high">{p.question}</p>
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-[11px] text-ink-low">
                {p.total_votes} vote{p.total_votes === 1 ? '' : 's'} ·{' '}
                {new Date(p.created_at).toLocaleDateString()}
              </span>
              {confirmingId === p.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      deletePoll.mutate(p.id, {
                        onSuccess: () => {
                          toast.success('Poll deleted');
                          setConfirmingId(null);
                        },
                        onError: (e: unknown) => toast.error(apiError(e, 'Delete failed')),
                      })
                    }
                    disabled={deletePoll.isPending}
                    className="rounded-lg bg-red-600 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    className="rounded-lg px-2 py-1 text-[12px] text-ink-low hover:bg-surface-raised"
                  >
                    Keep
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingId(p.id)}
                  className="rounded-lg p-1.5 text-ink-dim hover:bg-red-50 hover:text-red-500"
                  title="Delete poll"
                >
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            {p.options.map((o) => {
              const pct = p.total_votes > 0 ? (o.votes / p.total_votes) * 100 : 0;
              return (
                <div key={o.label} title={o.voters.join(', ')}>
                  <div className="mb-0.5 flex justify-between text-[12px]">
                    <span className="text-ink-mid">{o.label}</span>
                    <span className="text-ink-low">
                      {o.votes}
                      {o.voters.length > 0 && (
                        <span className="ml-1.5 text-ink-dim">
                          — {o.voters.slice(0, 3).join(', ')}
                          {o.voters.length > 3 ? ` +${o.voters.length - 3}` : ''}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: WA_GREEN }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {(polls.data ?? []).length === 0 && !polls.isLoading && (
        <div className="card p-8 text-center text-sm text-ink-low">
          No polls yet. Ask your guests anything — songs for the Sangeet, mehendi dates, menu
          picks.
        </div>
      )}
    </div>
  );
}
