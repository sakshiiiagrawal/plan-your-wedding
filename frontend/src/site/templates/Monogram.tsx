import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { PartId, TemplateProps } from '../types';
import { MONOGRAM_COPY } from '../copy/templates/monogram';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { useCountdown } from '../useCountdown';
import { drawLine, fadeUp, inViewProps, stagger } from '../motion';
import RsvpForm from '../RsvpForm';
import MusicPlayer from '../effects/MusicPlayer';

const { E } = makeEditable('monogram', MONOGRAM_COPY);

/**
 * "Monogram" — minimal luxe one-pager: a huge monogram in a thin ring,
 * hairline dividers, a days-only countdown line, and a sparse event table.
 * No gallery part — restraint is the identity.
 */
export default function Monogram({ data }: TemplateProps) {
  const p = data.palette;
  const countdown = useCountdown(data.weddingDate);
  const coupleNames = `${data.brideName} & ${data.groomName}`;
  const enabled = data.sections.filter((s) => s.enabled);
  const hasSection = (id: PartId) => enabled.some((s) => s.id === id);
  const showHero = hasSection('hero');
  const anyEnabled = enabled.length > 0;
  const showEvents = hasSection('events') && data.events.length > 0;
  const invitePage = data.pages.find((pg) => pg.kind === 'invite');
  const initials = `${data.brideName[0] ?? ''}${data.groomName[0] ?? ''}`;

  const vars = {
    '--site-bg': p.bg,
    '--site-surface': p.surface,
    '--site-ink': p.ink,
    '--site-ink-soft': p.inkSoft,
    '--site-line': p.line,
    '--site-primary': p.primary,
    '--site-accent': p.accent,
    '--site-on-accent': p.onAccent,
  } as CSSProperties;

  return (
    <div style={{ ...vars, background: p.bg, color: p.ink }} className="min-h-screen font-body">
      {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}

      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        {showHero && (
        <>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mx-auto mb-10 flex items-center justify-center rounded-full"
          style={{ width: 130, height: 130, border: `1px solid ${p.accent}` }}
        >
          <span className="font-serif-display italic" style={{ fontSize: 44, color: p.primary }}>
            {initials}
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="font-serif-display text-4xl sm:text-5xl mb-4 leading-tight"
          style={{ color: p.primary }}
        >
          <EditableContent field="brideName" value={data.brideName} />{' '}
          <span className="italic" style={{ color: p.accent }}>&amp;</span>{' '}
          <EditableContent field="groomName" value={data.groomName} />
        </motion.h1>

        {data.tagline && (
          <p className="font-serif-display italic text-lg mb-6" style={{ color: p.inkSoft }}>
            <EditableContent field="tagline" value={data.tagline} multiline />
          </p>
        )}

        <motion.div variants={drawLine} initial="hidden" animate="visible" className="h-px w-16 mx-auto mb-6" style={{ background: p.line, transformOrigin: 'center' }} />

        {data.weddingDate && (
          <p className="text-sm uppercase mb-2" style={{ color: p.ink, letterSpacing: '0.2em' }}>
            {data.weddingDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
        </>
        )}

        {enabled.map((s) => {
          if (s.id === 'countdown') {
            return data.weddingDate && !countdown.past ? (
              <p key="countdown" className="text-xs" style={{ color: p.inkSoft }}>
                {countdown.days} <E k="countdown.daysToGo" />
              </p>
            ) : null;
          }
          if (s.id === 'story') {
            return (
              <div key="story">
                <motion.div variants={drawLine} {...inViewProps} className="h-px w-16 mx-auto my-12" style={{ background: p.line, transformOrigin: 'center' }} />
                <motion.p variants={fadeUp} {...inViewProps} className="font-serif-display text-lg leading-relaxed whitespace-pre-line" style={{ color: p.inkSoft }}>
                  <EditableContent field="story" value={data.story} multiline />
                </motion.p>
              </div>
            );
          }
          if (s.id === 'events') {
            return showEvents ? (
              <div key="events">
                <motion.div variants={drawLine} {...inViewProps} className="h-px w-16 mx-auto my-12" style={{ background: p.line, transformOrigin: 'center' }} />
                <motion.div variants={stagger} {...inViewProps} className="text-left space-y-6">
                  {data.events.map((event) => {
                    const directions = directionsUrl(event.venue);
                    return (
                      <motion.div key={event.id} variants={fadeUp} className="grid grid-cols-[100px_1fr] gap-4 border-t pt-4" style={{ borderColor: p.line }}>
                        <p className="text-xs uppercase pt-1" style={{ color: p.accent, letterSpacing: '0.1em' }}>
                          {formatEventDate(event.date, { day: 'numeric', month: 'short' })}
                        </p>
                        <div>
                          <p className="font-serif-display text-xl" style={{ color: p.primary }}>
                            {event.name}
                          </p>
                          <p className="text-xs mt-1" style={{ color: p.inkSoft }}>
                            {formatEventTime(event.start_time)}
                            {event.venue ? ` · ${event.venue.name}` : ''}
                          </p>
                          <div className="flex gap-4 mt-2 text-xs uppercase" style={{ letterSpacing: '0.08em' }}>
                            <a href={calendarUrl(event, coupleNames)} download={icsFileName(event.name)} className="underline underline-offset-4" style={{ color: p.accent }}>
                              <E k="events.calendar" />
                            </a>
                            {directions && (
                              <a href={directions} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4" style={{ color: p.accent }}>
                                <E k="events.directions" />
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            ) : null;
          }
          if (s.id === 'rsvp') {
            return (
              <div key="rsvp">
                <motion.div variants={drawLine} {...inViewProps} className="h-px w-16 mx-auto my-12" style={{ background: p.line, transformOrigin: 'center' }} />
                <motion.div variants={fadeUp} {...inViewProps}>
                  <RsvpForm slug={data.slug} preview={data.preview} />
                </motion.div>
              </div>
            );
          }
          return null;
        })}

        {anyEnabled && (
        <div className="mt-16 flex justify-center gap-6 text-xs uppercase" style={{ letterSpacing: '0.16em' }}>
          {invitePage && (
            <Link to={`/${data.slug}/${invitePage.pageSlug}`} style={{ color: p.accent }}>
              {invitePage.title}
            </Link>
          )}
          {data.authed && (
            <Link to={`/${data.slug}/dashboard`} style={{ color: p.inkSoft }}>
              Dashboard
            </Link>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
