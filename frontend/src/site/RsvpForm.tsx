import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { usePublicEvents } from '../hooks/useApi';
import { SharedE, useSharedT } from './copy/shared';
import { Checkbox } from '../components/ui';

/**
 * Shared RSVP logic used by every template. Colors come from the `--site-*`
 * CSS variables the template sets at its root; the card itself stays a light
 * surface so the form reads on any hero/section background it sits on.
 */
export default function RsvpForm({
  slug,
  preview,
}: {
  slug: string;
  preview?: boolean | undefined;
}) {
  const [form, setForm] = useState({ fullName: '', attending: 'yes', guests: '1', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // Per-event choice (multi-event weddings): all events start checked; we track
  // the unchecked set so no state sync is needed when events load.
  const { data: events = [] } = usePublicEvents(preview ? null : slug);
  const [skippedEvents, setSkippedEvents] = useState<Set<string>>(new Set());
  const showEventPicker = form.attending === 'yes' && events.length > 1;
  const attendingEventIds = events.map((e) => e.id).filter((id) => !skippedEvents.has(id));

  const toggleEvent = (id: string) =>
    setSkippedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // ponytail: placeholders, <option> text and the submit label resolve via t()
  // — they can't host a contentEditable span, so they aren't inline-editable.
  const t = useSharedT();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preview) return;
    if (showEventPicker && attendingEventIds.length === 0) {
      toast.error('Pick at least one event, or choose "Regretfully decline".');
      return;
    }
    const nameParts = form.fullName.trim().split(/\s+/);
    // The onBlur clamp keeps the visible value in [1, 11]; this is the backstop
    const guests = Math.min(11, Math.max(1, parseInt(form.guests, 10) || 1));
    setSubmitting(true);
    try {
      const response = await api.post(`/public/${slug}/rsvp`, {
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(' ') || null,
        attending: form.attending === 'yes',
        ...(showEventPicker ? { event_ids: attendingEventIds } : {}),
        plus_ones: guests - 1,
        notes: form.message || null,
      });
      setDone(true);
      toast.success(response.data?.message ?? 'RSVP recorded. Thank you!');
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(
        err?.response?.data?.error || 'Something went wrong submitting your RSVP. Please retry.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl p-8 shadow-2xl text-center" style={{ background: 'var(--site-surface, #fff)' }}>
        <h3 className="font-display text-2xl mb-2" style={{ color: 'var(--site-primary)' }}>
          <SharedE k="rsvp.thanksTitle" />
        </h3>
        <p style={{ color: 'var(--site-ink-soft, #4b5563)' }}>
          <SharedE k="rsvp.thanksBody" multiline />
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-8 shadow-2xl text-left" style={{ background: 'var(--site-surface, #fff)' }}>
      <div className="mb-4">
        <label className="label" style={{ color: 'var(--site-ink-soft, #6b7280)' }}>
          <SharedE k="rsvp.fullName" />
        </label>
        <input
          type="text"
          className="input"
          placeholder={t('rsvp.namePlaceholder')}
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          required
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label" style={{ color: 'var(--site-ink-soft, #6b7280)' }}>
            <SharedE k="rsvp.attend" />
          </label>
          <select
            className="input"
            value={form.attending}
            onChange={(e) => setForm({ ...form, attending: e.target.value })}
          >
            <option value="yes">{t('rsvp.accept')}</option>
            <option value="no">{t('rsvp.decline')}</option>
          </select>
        </div>
        <div>
          <label className="label" style={{ color: 'var(--site-ink-soft, #6b7280)' }}>
            <SharedE k="rsvp.guests" />
          </label>
          <input
            type="number"
            className="input"
            min="1"
            max="11"
            value={form.guests}
            onChange={(e) => setForm({ ...form, guests: e.target.value })}
            onBlur={(e) =>
              // Clamp visibly so what the guest sees is what gets recorded
              // (the API caps the party size at 11 including the guest)
              setForm({
                ...form,
                guests: String(Math.min(11, Math.max(1, parseInt(e.target.value, 10) || 1))),
              })
            }
          />
        </div>
      </div>

      {showEventPicker && (
        <div className="mb-4">
          <label className="label" style={{ color: 'var(--site-ink-soft, #6b7280)' }}>
            <SharedE k="rsvp.events" />
          </label>
          <div className="flex flex-col gap-1.5">
            {events.map((event) => (
              <label
                key={event.id}
                className="flex items-center gap-2 cursor-pointer"
                style={{ color: 'var(--site-ink-soft, #4b5563)', fontSize: 14 }}
              >
                <Checkbox
                  checked={!skippedEvents.has(event.id)}
                  onChange={() => toggleEvent(event.id)}
                />
                {event.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <label className="label" style={{ color: 'var(--site-ink-soft, #6b7280)' }}>
          <SharedE k="rsvp.message" />
        </label>
        <textarea
          className="input"
          rows={3}
          placeholder={t('rsvp.messagePlaceholder')}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 text-lg font-semibold rounded-xl transition-opacity disabled:opacity-50 hover:opacity-90"
        style={{ background: 'var(--site-accent)', color: 'var(--site-on-accent)' }}
      >
        {submitting ? 'Submitting…' : t('rsvp.submit')}
      </button>
    </form>
  );
}
