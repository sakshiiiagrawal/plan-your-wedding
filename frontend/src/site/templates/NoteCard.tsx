import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineCalendar, HiOutlineLocationMarker } from 'react-icons/hi';
import type { PartId, TemplateProps } from '../types';
import { CARD_COPY } from '../copy/templates/card';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { useCountdown } from '../useCountdown';
import { fadeUp, stagger } from '../motion';
import { siteVars } from '../theme';
import RsvpForm from '../RsvpForm';
import MusicPlayer from '../effects/MusicPlayer';

const { E, useT } = makeEditable('card', CARD_COPY);

/**
 * "Note Card" — a single elegant screen: names, date, one story line, days
 * countdown, a compact event list, and a front-and-center action row. The
 * quickest invite for a guest to open — no intro, no gallery, no reel.
 */
export default function NoteCard({ data }: TemplateProps) {
  const p = data.palette;
  const countdown = useCountdown(data.weddingDate);
  const enabled = data.sections.filter((s) => s.enabled);
  const hasSection = (id: PartId) => enabled.some((s) => s.id === id);
  const showHero = hasSection('hero');
  const [rsvpOpen, setRsvpOpen] = useState(false);
  // ponytail: the RSVP button label resolves via t() — a contentEditable span
  // can't live inside a <button>, so it isn't inline-editable.
  const t = useT();

  const coupleNames = `${data.brideName} & ${data.groomName}`;
  const websitePage = data.pages.find((pg) => pg.kind === 'website');

  const cssVars = siteVars(p);

  return (
    <div style={{ background: p.heroGradient }}>
      <div
        className="relative w-full max-w-md sm:max-w-xl md:max-w-2xl mx-auto flex flex-col items-center justify-center font-serif-display px-8 py-14 sm:px-14 sm:py-20 md:px-20 text-center"
        style={{ ...cssVars, minHeight: '100svh', background: p.bg, color: p.ink }}
      >
        {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}

        {/* Inset hairline frame — the pressed-card detail */}
        <div
          className="absolute inset-3 sm:inset-5 pointer-events-none"
          style={{ border: `1px solid ${p.accent}`, opacity: 0.35 }}
          aria-hidden
        />
        {/* Corner ticks press the frame into the card stock */}
        {[
          'top-2 left-2 sm:top-3.5 sm:left-3.5 border-t-2 border-l-2',
          'top-2 right-2 sm:top-3.5 sm:right-3.5 border-t-2 border-r-2',
          'bottom-2 left-2 sm:bottom-3.5 sm:left-3.5 border-b-2 border-l-2',
          'bottom-2 right-2 sm:bottom-3.5 sm:right-3.5 border-b-2 border-r-2',
        ].map((pos) => (
          <span
            key={pos}
            className={`absolute w-3.5 h-3.5 pointer-events-none ${pos}`}
            style={{ borderColor: p.accent, opacity: 0.7 }}
            aria-hidden
          />
        ))}

        <motion.div variants={stagger} initial="hidden" animate="visible" className="relative w-full">
          {showHero && (
            <>
              <motion.div variants={fadeUp} className="flex justify-center mb-5">
                <span
                  className="w-14 h-14 rounded-full flex items-center justify-center font-script text-xl"
                  style={{ border: `1px solid ${p.accent}`, color: p.primary }}
                  aria-hidden
                >
                  {data.brideName[0]}
                  {data.groomName[0]}
                </span>
              </motion.div>
              <motion.p variants={fadeUp} className="uppercase mb-4" style={{ fontSize: 10, letterSpacing: '0.35em', color: p.accent }}>
                <E k="hero.kicker" />
              </motion.p>
              <motion.h1 variants={fadeUp} className="leading-tight mb-2" style={{ fontSize: 'clamp(2.25rem, 9vw, 4.5rem)', color: p.primary }}>
                <EditableContent field="brideName" value={data.brideName} />{' '}
                <span className="italic" style={{ color: p.accent }}>&amp;</span>{' '}
                <EditableContent field="groomName" value={data.groomName} />
              </motion.h1>
              {data.weddingDate && (
                <motion.p variants={fadeUp} className="uppercase mb-4" style={{ fontSize: 11, letterSpacing: '0.2em', color: p.ink }}>
                  {data.weddingDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </motion.p>
              )}
            </>
          )}

          {enabled.map((s) => {
            if (s.id === 'countdown') {
              return data.weddingDate && !countdown.past ? (
                <motion.p key="countdown" variants={fadeUp} className="text-sm mb-6" style={{ color: p.inkSoft }}>
                  {countdown.days} <E k="countdown.daysToGo" />
                </motion.p>
              ) : null;
            }
            if (s.id === 'story') {
              return data.story ? (
                <motion.p key="story" variants={fadeUp} className="text-sm italic mb-8 leading-relaxed" style={{ color: p.inkSoft }}>
                  {data.story.split('\n')[0]}
                </motion.p>
              ) : null;
            }
            if (s.id === 'events') {
              return data.events.length > 0 ? (
                <motion.div key="events" variants={fadeUp} className="w-full text-left mb-8 space-y-3">
                  {data.events.map((event) => {
                    const directions = directionsUrl(event.venue);
                    return (
                      <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: p.surface, border: `1px solid ${p.line}` }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: p.primary }}>{event.name}</p>
                          <p className="text-xs" style={{ color: p.inkSoft }}>
                            {formatEventDate(event.date, { day: 'numeric', month: 'short' })} · {formatEventTime(event.start_time)}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {directions && (
                            <a href={directions} target="_blank" rel="noopener noreferrer" aria-label="Directions" style={{ color: p.accent }}>
                              <HiOutlineLocationMarker className="w-4 h-4" />
                            </a>
                          )}
                          <a href={calendarUrl(event, coupleNames)} download={icsFileName(event.name)} aria-label="Add to calendar" style={{ color: p.accent }}>
                            <HiOutlineCalendar className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              ) : null;
            }
            if (s.id === 'rsvp') {
              return (
                <motion.div key="rsvp" variants={fadeUp} className="w-full">
                  {rsvpOpen ? (
                    <RsvpForm slug={data.slug} preview={data.preview} />
                  ) : (
                    <button
                      onClick={() => setRsvpOpen(true)}
                      className="w-full py-3.5 rounded-xl text-sm font-semibold uppercase mb-3"
                      style={{ background: p.accent, color: p.onAccent, letterSpacing: '0.12em' }}
                    >
                      {t('rsvp.cta')}
                    </button>
                  )}
                </motion.div>
              );
            }
            return null;
          })}

          <motion.div variants={fadeUp} className="flex justify-center gap-6 text-xs uppercase mt-2" style={{ letterSpacing: '0.14em' }}>
            {websitePage && (
              <Link to={`/${data.slug}`} style={{ color: p.accent }}>
                <E k="final.website" />
              </Link>
            )}
            {data.authed && (
              <Link to={`/${data.slug}/dashboard`} style={{ color: p.inkSoft }}>
                Dashboard
              </Link>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
