import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FaWhatsapp } from 'react-icons/fa';
import { HiOutlinePaperAirplane, HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import {
  useCommsTemplates,
  useEvents,
  useReachability,
  useSendCampaign,
  useSendPoll,
  type SendResult,
} from '../../hooks/useApi';
import { Checkbox, DrawerPanel, Pill, SegmentedControl } from '../ui';
import { STATUS_VARIANT, WA_GREEN, apiError, guestName, type CommsGuest } from './shared';

type Mode = 'message' | 'poll';

interface Result extends SendResult {
  skipped_unreachable?: number;
}

/**
 * The single entry point for outbound sends: pick people (usually pre-filled
 * from the guest-table selection), pick a template or poll, see per-guest
 * results in place. Failures render here, not in a toast — with WhatsApp
 * (approval states, allowlists, 24h windows) failure is the common case
 * during setup.
 */
export default function ComposerDrawer({
  open,
  onClose,
  guests,
  initialGuestIds,
  initialMode = 'message',
}: {
  open: boolean;
  onClose: () => void;
  guests: CommsGuest[];
  initialGuestIds: string[];
  initialMode?: Mode;
}) {
  const templates = useCommsTemplates();
  const events = useEvents();
  const sendCampaign = useSendCampaign();
  const sendPoll = useSendPoll();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editRecipients, setEditRecipients] = useState(false);
  const [search, setSearch] = useState('');
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [eventId, setEventId] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  // Fresh slate every time the drawer opens
  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setSelected(new Set(initialGuestIds));
    setEditRecipients(initialGuestIds.length === 0);
    setSearch('');
    setEventId('');
    setPollQuestion('');
    setPollOptions('');
    setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedGuests = useMemo(
    () => guests.filter((g) => selected.has(g.id)),
    [guests, selected],
  );
  const recipients = useMemo(() => selectedGuests.filter((g) => g.phone), [selectedGuests]);
  const skipped = selectedGuests.length - recipients.length;

  const recipientIds = useMemo(() => recipients.map((g) => g.id), [recipients]);
  const reach = useReachability(mode === 'poll' ? recipientIds : []);
  const reachableCount = recipientIds.filter((id) => reach.data?.reachable[id]).length;

  const tpl = templates.data?.find((t) => t.name === templateName);
  const searchedGuests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter((g) => guestName(g).toLowerCase().includes(q));
  }, [guests, search]);

  const toggleGuest = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleResult = (r: Result, emptyToast: string) => {
    if (r.failed.length === 0) {
      toast.success(emptyToast);
      onClose();
    } else {
      setResult(r);
    }
  };

  const handleSendMessage = () => {
    if (!tpl) return;
    sendCampaign.mutate(
      {
        template_name: tpl.name,
        guest_ids: recipientIds,
        ...(tpl.needsEvent && eventId && { event_id: eventId }),
      },
      {
        onSuccess: (r) =>
          handleResult(r, `Sent to ${r.sent} guest${r.sent === 1 ? '' : 's'}`),
        onError: (e: unknown) => toast.error(apiError(e, 'Send failed'), { duration: 6000 }),
      },
    );
  };

  const handleSendPoll = () => {
    const options = pollOptions
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean);
    if (!pollQuestion.trim() || options.length < 2) {
      toast.error('Add a question and at least 2 options');
      return;
    }
    sendPoll.mutate(
      { question: pollQuestion.trim(), options, guest_ids: recipientIds },
      {
        onSuccess: (r) =>
          handleResult(r, `Poll sent to ${r.sent} guest${r.sent === 1 ? '' : 's'}`),
        onError: (e: unknown) =>
          toast.error(apiError(e, 'Poll send failed'), { duration: 6000 }),
      },
    );
  };

  const sending = sendCampaign.isPending || sendPoll.isPending;
  const canSendMessage =
    Boolean(tpl) && recipients.length > 0 && (!tpl?.needsEvent || Boolean(eventId)) && !sending;
  const canSendPoll =
    pollQuestion.trim().length > 0 && recipients.length > 0 && reachableCount > 0 && !sending;

  return (
    <DrawerPanel open={open} onClose={onClose} width={520}>
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3"
        style={{ padding: '18px 22px', borderBottom: '1px solid var(--line-soft)' }}
      >
        <div className="flex items-center gap-2.5">
          <FaWhatsapp style={{ color: WA_GREEN, width: 20, height: 20 }} />
          <div>
            <div className="uppercase-eyebrow">WhatsApp</div>
            <h2 className="display" style={{ margin: 0, fontSize: 20, color: 'var(--ink-high)' }}>
              {result ? 'Send results' : mode === 'poll' ? 'Ask a poll' : 'Send a message'}
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-ink-dim hover:bg-surface-raised"
        >
          <HiOutlineX className="h-4 w-4" />
        </button>
      </div>

      {result ? (
        /* ── Result state ─────────────────────────────────────────────── */
        <div className="flex-1 space-y-4" style={{ padding: 22 }}>
          <div className="card" style={{ padding: 14 }}>
            <p className="text-sm text-ink-high">
              Sent to <strong>{result.sent}</strong> of {result.total}, failed{' '}
              <strong>{result.failed.length}</strong>
              {(result.skipped_unreachable ?? 0) > 0 &&
                ` · ${result.skipped_unreachable} skipped (outside the 24h window)`}
            </p>
          </div>
          <div className="space-y-2">
            {result.failed.map((f) => (
              <div
                key={f.guest_id}
                className="card flex items-start justify-between gap-3"
                style={{ padding: '10px 14px' }}
              >
                <div>
                  <div className="text-[13px] font-medium text-ink-high">{f.name}</div>
                  <div className="mt-0.5 text-[12px]" style={{ color: 'var(--err)' }}>
                    {f.error}
                  </div>
                </div>
                <Pill variant="err">failed</Pill>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelected(new Set(result.failed.map((f) => f.guest_id)));
                setResult(null);
              }}
              className="btn-secondary flex-1 px-4 py-2 text-sm"
            >
              Retry failed ({result.failed.length})
            </button>
            <button onClick={onClose} className="btn-primary flex-1 px-4 py-2 text-sm">
              Done
            </button>
          </div>
        </div>
      ) : (
        /* ── Compose state ───────────────────────────────────────────── */
        <div className="flex flex-1 flex-col gap-4" style={{ padding: 22 }}>
          {/* Recipients */}
          <div className="card" style={{ padding: 12 }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] text-ink-high">
                Sending to <strong>{recipients.length}</strong> guest
                {recipients.length === 1 ? '' : 's'}
                {skipped > 0 && (
                  <span className="text-ink-low"> · {skipped} skipped (no phone)</span>
                )}
              </span>
              <button
                onClick={() => setEditRecipients((v) => !v)}
                className="text-[12px] font-medium"
                style={{ color: 'var(--gold-deep)', background: 'transparent', cursor: 'pointer' }}
              >
                {editRecipients ? 'Done' : 'Edit'}
              </button>
            </div>
            {editRecipients && (
              <div className="mt-2">
                <div className="relative mb-2">
                  <HiOutlineSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-ink-low" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search guests…"
                    className="w-full rounded-lg border border-line-strong bg-surface-panel py-2 pl-8 pr-3 text-sm"
                  />
                </div>
                <div className="max-h-52 space-y-1 overflow-y-auto">
                  {searchedGuests.map((g) => (
                    <label
                      key={g.id}
                      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${
                        g.phone ? 'cursor-pointer hover:bg-surface-raised' : 'opacity-45'
                      }`}
                      title={g.phone ? undefined : 'No phone number — can’t message'}
                    >
                      <Checkbox
                        checked={selected.has(g.id)}
                        disabled={!g.phone}
                        onChange={() => toggleGuest(g.id)}
                      />
                      <span className="text-ink-high">{guestName(g)}</span>
                      <span className="ml-auto text-[12px] text-ink-low">
                        {g.phone ?? 'no phone'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mode switch */}
          <SegmentedControl
            value={mode}
            onChange={setMode}
            options={[
              { value: 'message', label: 'Invite / Message' },
              { value: 'poll', label: 'Poll' },
            ]}
          />

          {mode === 'message' ? (
            <>
              <div className="space-y-2">
                {(templates.data ?? []).map((t) => {
                  const approved = t.status === 'APPROVED';
                  const isSelected = templateName === t.name;
                  return (
                    <button
                      key={t.name}
                      onClick={() => approved && setTemplateName(t.name)}
                      disabled={!approved}
                      title={
                        approved
                          ? undefined
                          : `Not sendable — template status is ${t.status}`
                      }
                      className={`card w-full text-left transition-all ${
                        isSelected
                          ? 'ring-2 ring-[#128C7E]'
                          : approved
                            ? 'hover:bg-surface-raised'
                            : 'opacity-50'
                      }`}
                      style={{ padding: 12, cursor: approved ? 'pointer' : 'not-allowed' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-ink-high">{t.name}</span>
                        <Pill variant={STATUS_VARIANT[t.status] ?? 'muted'}>{t.status}</Pill>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-ink-low">
                        {t.body}
                      </p>
                    </button>
                  );
                })}
                {templates.isLoading && (
                  <p className="text-sm text-ink-low">Loading templates…</p>
                )}
                {templates.isError && (
                  <p className="text-sm text-ink-low">
                    Couldn&rsquo;t load templates — is WhatsApp configured?
                  </p>
                )}
              </div>

              {tpl?.needsEvent && (
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full rounded-lg border border-line-strong bg-surface-panel px-3 py-2 text-sm text-ink-high"
                >
                  <option value="">Which event is this about?</option>
                  {(events.data ?? []).map((ev: { id: string; name: string; event_date?: string }) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                      {ev.event_date ? ` — ${new Date(ev.event_date).toLocaleDateString()}` : ''}
                    </option>
                  ))}
                </select>
              )}

              {tpl?.startsRsvpFlow && (
                <p className="flex items-center gap-1.5 text-[12px] text-ink-low">
                  <FaWhatsapp style={{ color: WA_GREEN }} />
                  Replies start the guided RSVP flow (events, party size, meal preference).
                </p>
              )}

              <button
                onClick={handleSendMessage}
                disabled={!canSendMessage}
                className="btn-primary mt-auto flex items-center justify-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
                style={{ background: canSendMessage ? WA_GREEN : undefined }}
              >
                <HiOutlinePaperAirplane className="h-4 w-4 rotate-90" />
                {sending
                  ? 'Sending…'
                  : `Send to ${recipients.length} guest${recipients.length === 1 ? '' : 's'}`}
              </button>
            </>
          ) : (
            <>
              <input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="e.g. Which song should open the Sangeet?"
                className="w-full rounded-lg border border-line-strong bg-surface-panel px-3 py-2 text-sm"
              />
              <textarea
                value={pollOptions}
                onChange={(e) => setPollOptions(e.target.value)}
                placeholder={'One option per line (2–10)\nKala Chashma\nGallan Goodiyan\nLondon Thumakda'}
                rows={4}
                className="w-full rounded-lg border border-line-strong bg-surface-panel px-3 py-2 text-sm"
              />
              <p className="text-[12px] text-ink-low">
                {reach.isLoading
                  ? 'Checking who can receive a poll…'
                  : `${reachableCount} of ${recipients.length} selected can receive a poll right now — polls only deliver to guests who replied within the last 24 hours.`}
              </p>
              <button
                onClick={handleSendPoll}
                disabled={!canSendPoll}
                className="btn-primary mt-auto flex items-center justify-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
                style={{ background: canSendPoll ? WA_GREEN : undefined }}
              >
                <HiOutlinePaperAirplane className="h-4 w-4 rotate-90" />
                {sending
                  ? 'Sending…'
                  : `Send poll to ${reachableCount} guest${reachableCount === 1 ? '' : 's'}`}
              </button>
            </>
          )}
        </div>
      )}
    </DrawerPanel>
  );
}
