import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FaWhatsapp } from 'react-icons/fa';
import { HiOutlineRefresh, HiOutlineSearch, HiOutlinePaperAirplane } from 'react-icons/hi';
import {
  useEvents,
  useGuests,
  useWaTemplates,
  useWaMessages,
  useSyncWaTemplates,
  useSendWaCampaign,
  useWaPolls,
  useSendWaPoll,
  type WaTemplate,
  type WaMessage,
} from '../../hooks/useApi';
import { SectionHeader, SegmentedControl, Pill, Checkbox, type PillVariant } from '../../components/ui';

const STATUS_VARIANT: Record<string, PillVariant> = {
  APPROVED: 'ok',
  PENDING: 'warn',
  REJECTED: 'err',
  NOT_CREATED: 'muted',
  // message statuses
  sent: 'info',
  delivered: 'ok',
  read: 'ok',
  failed: 'err',
  received: 'gold',
};

function TemplateCard({
  tpl,
  selected,
  onSelect,
}: {
  tpl: WaTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`card w-full text-left transition-all ${
        selected ? 'ring-2 ring-[#128C7E]' : 'hover:bg-surface-raised'
      }`}
      style={{ padding: 16 }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink-high">{tpl.name}</span>
        <Pill variant={STATUS_VARIANT[tpl.status] ?? 'muted'}>{tpl.status}</Pill>
      </div>
      <p className="mb-2 text-[13px] leading-snug text-ink-mid">{tpl.body}</p>
      {tpl.buttons.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tpl.buttons.map((b) => (
            <span
              key={b}
              className="rounded-full border border-[#25D366]/50 px-2.5 py-0.5 text-[11px] text-[#128C7E]"
            >
              {b}
            </span>
          ))}
        </div>
      )}
      <p className="text-[11px] text-ink-low">{tpl.description}</p>
    </button>
  );
}

export default function WhatsApp() {
  const templates = useWaTemplates();
  const messages = useWaMessages();
  const guests = useGuests();
  const events = useEvents();
  const syncTemplates = useSyncWaTemplates();
  const sendCampaign = useSendWaCampaign();

  const polls = useWaPolls();
  const sendPoll = useSendWaPoll();

  const [templateName, setTemplateName] = useState<string | null>(null);
  const [audience, setAudience] = useState<'all' | 'selected'>('all');
  const [rsvpFilter, setRsvpFilter] = useState('');
  const [sideFilter, setSideFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [eventId, setEventId] = useState('');
  const [search, setSearch] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState('');

  const tpl = templates.data?.find((t) => t.name === templateName);
  const guestList = useMemo(() => guests.data ?? [], [guests.data]);
  const withPhone = useMemo(() => guestList.filter((g) => g.phone), [guestList]);
  // The list endpoint aggregates per-event RSVPs into guest.rsvp_status
  const audienceGuests = useMemo(
    () =>
      withPhone.filter((g) => {
        const status = (g as { rsvp_status?: string }).rsvp_status ?? 'pending';
        if (rsvpFilter && status !== rsvpFilter) return false;
        if (sideFilter && g.side !== sideFilter) return false;
        return true;
      }),
    [withPhone, rsvpFilter, sideFilter],
  );
  const filteredGuests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guestList;
    return guestList.filter((g) =>
      `${g.first_name} ${g.last_name ?? ''}`.toLowerCase().includes(q),
    );
  }, [guestList, search]);

  const recipientCount =
    audience === 'all'
      ? audienceGuests.length
      : withPhone.filter((g) => selectedIds.has(g.id)).length;

  const audiencePayload =
    audience === 'selected'
      ? { guest_ids: [...selectedIds] }
      : {
          ...(rsvpFilter && { rsvp_filter: rsvpFilter }),
          ...(sideFilter && { side: sideFilter }),
        };

  const notConfigured =
    templates.isError &&
    /not configured/i.test(
      (templates.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        '',
    );

  const canSend =
    Boolean(tpl) &&
    recipientCount > 0 &&
    (!tpl?.needsEvent || Boolean(eventId)) &&
    !sendCampaign.isPending;

  const handleSend = () => {
    if (!tpl) return;
    sendCampaign.mutate(
      {
        template_name: tpl.name,
        ...audiencePayload,
        ...(tpl.needsEvent && eventId && { event_id: eventId }),
      },
      {
        onSuccess: (r: { sent: number; failed: { name: string; error: string }[] }) => {
          const first = r.failed[0];
          if (!first) {
            toast.success(`Sent to ${r.sent} guest${r.sent === 1 ? '' : 's'}`);
          } else {
            toast.error(
              `Sent ${r.sent}, failed ${r.failed.length} (first: ${first.name} — ${first.error})`,
              { duration: 6000 },
            );
          }
        },
        onError: (e: unknown) => {
          const msg =
            (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            'Send failed';
          toast.error(msg);
        },
      },
    );
  };

  const toggleGuest = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="WhatsApp"
        title="Invites & RSVPs on WhatsApp"
        description="Send invites, reminders and polls over WhatsApp. The RSVP assistant collects attendance per event, party size, meal preference, dietary notes and travel needs — all recorded automatically on the guest list. Guests can also ask for the schedule, venue directions and the wedding website."
        action={
          <button
            onClick={() =>
              syncTemplates.mutate(undefined, {
                onSuccess: (r: { created: string[] }) =>
                  toast.success(
                    r.created.length > 0
                      ? `Created: ${r.created.join(', ')} (pending Meta approval)`
                      : 'All templates already exist',
                  ),
                onError: () => toast.error('Template sync failed'),
              })
            }
            disabled={syncTemplates.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-sm text-ink-mid transition-colors hover:bg-surface-raised"
          >
            <HiOutlineRefresh className={`h-4 w-4 ${syncTemplates.isPending ? 'animate-spin' : ''}`} />
            Sync templates
          </button>
        }
      />

      {notConfigured && (
        <div className="card border-amber-300 bg-amber-50 text-sm text-amber-800" style={{ padding: 14 }}>
          WhatsApp isn&rsquo;t configured on the server. Set WHATSAPP_ACCESS_TOKEN,
          WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_WABA_ID in the API environment.
        </div>
      )}

      {/* Step 1 — template */}
      <div>
        <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-ink-low">
          1 · Choose a template
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {(templates.data ?? []).map((t) => (
            <TemplateCard
              key={t.name}
              tpl={t}
              selected={templateName === t.name}
              onSelect={() => setTemplateName(t.name)}
            />
          ))}
          {templates.isLoading && <p className="text-sm text-ink-low">Loading templates…</p>}
        </div>
        {tpl && tpl.status !== 'APPROVED' && (
          <p className="mt-2 text-[12px] text-amber-700">
            This template is {tpl.status.toLowerCase()} — Meta only delivers approved templates,
            so sending may fail until it&rsquo;s approved.
          </p>
        )}
      </div>

      {/* Step 2 — event (only when the template needs one) */}
      {tpl?.needsEvent && (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-ink-low">
            2 · Which event?
          </p>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-line-strong bg-surface-panel px-3 py-2 text-sm text-ink-high"
          >
            <option value="">Select an event…</option>
            {(events.data ?? []).map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} — {new Date(ev.event_date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Step 3 — audience */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-low">
            {tpl?.needsEvent ? '3' : '2'} · Audience
          </p>
          <SegmentedControl
            value={audience}
            onChange={setAudience}
            options={[
              { value: 'all', label: `Filtered (${audienceGuests.length})` },
              { value: 'selected', label: `Selected (${selectedIds.size})` },
            ]}
          />
        </div>
        {audience === 'all' && (
          <div className="mb-2 flex flex-wrap gap-2">
            <select
              value={rsvpFilter}
              onChange={(e) => setRsvpFilter(e.target.value)}
              className="rounded-lg border border-line-strong bg-surface-panel px-3 py-1.5 text-sm text-ink-mid"
            >
              <option value="">Any RSVP status</option>
              <option value="pending">Pending only</option>
              <option value="confirmed">Confirmed only</option>
              <option value="declined">Declined only</option>
              <option value="tentative">Tentative only</option>
            </select>
            <select
              value={sideFilter}
              onChange={(e) => setSideFilter(e.target.value)}
              className="rounded-lg border border-line-strong bg-surface-panel px-3 py-1.5 text-sm text-ink-mid"
            >
              <option value="">Both sides</option>
              <option value="bride">Bride&rsquo;s side</option>
              <option value="groom">Groom&rsquo;s side</option>
            </select>
          </div>
        )}
        {audience === 'selected' && (
          <div className="card" style={{ padding: 12 }}>
            <div className="relative mb-2">
              <HiOutlineSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-ink-low" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search guests…"
                className="w-full rounded-lg border border-line-strong bg-surface-panel py-2 pl-8 pr-3 text-sm"
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {filteredGuests.map((g) => (
                <label
                  key={g.id}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${
                    g.phone ? 'cursor-pointer hover:bg-surface-raised' : 'opacity-45'
                  }`}
                >
                  <Checkbox
                    checked={selectedIds.has(g.id)}
                    disabled={!g.phone}
                    onChange={() => toggleGuest(g.id)}
                  />
                  <span className="text-ink-high">
                    {g.first_name} {g.last_name ?? ''}
                  </span>
                  <span className="ml-auto text-[12px] text-ink-low">
                    {g.phone ?? 'no phone'}
                  </span>
                </label>
              ))}
              {filteredGuests.length === 0 && (
                <p className="px-2 py-3 text-sm text-ink-low">No guests match.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Send */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
          style={{ background: canSend ? '#128C7E' : undefined }}
        >
          <HiOutlinePaperAirplane className="h-4 w-4 rotate-90" />
          {sendCampaign.isPending
            ? 'Sending…'
            : `Send to ${recipientCount} guest${recipientCount === 1 ? '' : 's'}`}
        </button>
        {tpl?.startsRsvpFlow && (
          <span className="flex items-center gap-1.5 text-[12px] text-ink-low">
            <FaWhatsapp className="text-[#128C7E]" />
            Replies will start the guided RSVP flow (party size + meal preference).
          </span>
        )}
      </div>

      {/* Polls */}
      <div>
        <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-ink-low">
          Ask your guests (poll)
        </p>
        <div className="card space-y-3" style={{ padding: 16 }}>
          <p className="text-[12px] text-ink-low">
            Sends an interactive list question to the audience selected above. Guests tap one
            option; answers tally here live and guests can change their vote.
          </p>
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
          <button
            onClick={() => {
              const options = pollOptions
                .split('\n')
                .map((o) => o.trim())
                .filter(Boolean);
              if (!pollQuestion.trim() || options.length < 2) {
                toast.error('Add a question and at least 2 options');
                return;
              }
              sendPoll.mutate(
                { question: pollQuestion.trim(), options, ...audiencePayload },
                {
                  onSuccess: (r: { sent: number; failed: unknown[] }) => {
                    toast.success(`Poll sent to ${r.sent} guest${r.sent === 1 ? '' : 's'}`);
                    setPollQuestion('');
                    setPollOptions('');
                  },
                  onError: (e: unknown) =>
                    toast.error(
                      (e as { response?: { data?: { error?: string } } })?.response?.data
                        ?.error ?? 'Poll send failed',
                    ),
                },
              );
            }}
            disabled={sendPoll.isPending || recipientCount === 0}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {sendPoll.isPending ? 'Sending…' : `Send poll to ${recipientCount} guests`}
          </button>
        </div>

        {(polls.data ?? []).length > 0 && (
          <div className="mt-3 space-y-3">
            {(polls.data ?? []).map((p) => (
              <div key={p.id} className="card" style={{ padding: 16 }}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink-high">{p.question}</p>
                  <span className="whitespace-nowrap text-[11px] text-ink-low">
                    {p.total_votes} vote{p.total_votes === 1 ? '' : 's'} ·{' '}
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {p.options.map((o) => {
                    const pct = p.total_votes > 0 ? (o.votes / p.total_votes) * 100 : 0;
                    return (
                      <div key={o.label} title={o.voters.join(', ')}>
                        <div className="mb-0.5 flex justify-between text-[12px]">
                          <span className="text-ink-mid">{o.label}</span>
                          <span className="text-ink-low">{o.votes}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
                          <div
                            className="h-full rounded-full bg-[#128C7E] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity log */}
      <div>
        <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-ink-low">Activity</p>
        <div className="card overflow-x-auto" style={{ padding: 0 }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-low">
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Guest</th>
                <th className="px-4 py-2.5 font-medium">Direction</th>
                <th className="px-4 py-2.5 font-medium">Message</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(messages.data ?? []).map((m: WaMessage) => (
                <tr key={m.id} className="border-b border-line-soft last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-[12px] text-ink-low">
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-ink-high">
                    {m.guests ? `${m.guests.first_name} ${m.guests.last_name ?? ''}` : m.phone}
                  </td>
                  <td className="px-4 py-2">
                    <span className={m.direction === 'inbound' ? 'text-[#128C7E]' : 'text-ink-mid'}>
                      {m.direction === 'inbound' ? '← reply' : '→ sent'}
                    </span>
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-2 text-ink-mid">
                    {m.template_name ? `[${m.template_name}] ` : ''}
                    {m.body}
                    {m.error ? ` — ${m.error}` : ''}
                  </td>
                  <td className="px-4 py-2">
                    <Pill variant={STATUS_VARIANT[m.status] ?? 'muted'}>{m.status}</Pill>
                  </td>
                </tr>
              ))}
              {(messages.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-low">
                    No WhatsApp activity yet. Send your first invite above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
