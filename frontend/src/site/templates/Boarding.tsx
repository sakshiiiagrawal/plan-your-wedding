import SiteImage from '../SiteImage';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { PartId, TemplateProps } from '../types';
import { SharedE } from '../copy/shared';
import { BOARDING_COPY } from '../copy/templates/boarding';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { useCountdown } from '../useCountdown';
import { motionPreset } from '../motion';
import { BOARDING_EFFECTS, resolveEffects, SiteEffectsContext } from '../effects/schema';
import { siteVars } from '../theme';
import RsvpForm from '../RsvpForm';
import MusicPlayer from '../effects/MusicPlayer';
import TickerDigit from '../effects/TickerDigit';

const { E } = makeEditable('boarding', BOARDING_COPY);

/** A name reduced to its airline city code: "Priya" → PRI. */
function iata(name: string): string {
  return (name.replace(/[^a-z]/gi, '').slice(0, 3) || 'XXX').toUpperCase();
}

function Barcode({ color }: { color: string }) {
  const bars = [2, 1, 3, 1, 2, 3, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1];
  return (
    <div className="flex items-end gap-[2px] h-8">
      {bars.map((w, i) => (
        <div key={i} style={{ width: w, height: '100%', background: color }} />
      ))}
    </div>
  );
}

/** The dotted flight arc between the two name-codes, plane included. */
function RouteArc({ color, still = false }: { color: string; still?: boolean }) {
  return (
    <div className="relative flex-1 mx-3 sm:mx-4" aria-hidden>
      <svg viewBox="0 0 120 28" className="w-full h-7 overflow-visible">
        <motion.path
          d="M4,24 C34,2 86,2 116,24"
          fill="none"
          stroke={color}
          strokeWidth="1.2"
          strokeDasharray="1 5"
          strokeLinecap="round"
          {...(still
            ? {}
            : {
                initial: { pathLength: 0 },
                animate: { pathLength: 1 },
                transition: { duration: 1.6, delay: 0.4, ease: 'easeInOut' },
              })}
        />
        <motion.g
          {...(still
            ? {}
            : {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { delay: 1.2, duration: 0.5 },
              })}
        >
          <text x="60" y="8" textAnchor="middle" style={{ fontSize: 11 }} fill={color}>
            ✈
          </text>
        </motion.g>
      </svg>
    </div>
  );
}

function TicketStub({ onComplete }: { onComplete: () => void }) {
  const [torn, setTorn] = useState(false);
  const handleTap = () => {
    if (torn) return;
    setTorn(true);
    setTimeout(onComplete, 1000);
  };

  return (
    <motion.div
      onClick={handleTap}
      animate={torn ? { opacity: 0 } : { opacity: 1 }}
      transition={torn ? { delay: 0.6, duration: 0.4 } : { duration: 0.2 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#062A26',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 100,
      }}
    >
      <motion.div
        animate={torn ? { x: 260, rotate: 12, opacity: 0 } : { x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: 260,
          background: 'repeating-linear-gradient(180deg, transparent 0 6px, rgba(255,255,255,0.15) 6px 8px)',
          backgroundColor: '#0E4A42',
          borderRadius: 12,
          padding: '28px 20px',
          textAlign: 'center',
          border: '1px dashed #B08A2E',
        }}
      >
        <p className="uppercase mb-4" style={{ fontSize: 10, letterSpacing: '0.3em', color: '#B08A2E' }}>
          <E k="envelope.title" />
        </p>
        <p className="font-mono text-2xl" style={{ color: '#EFF8F4', letterSpacing: '0.1em' }}>
          <E k="envelope.tear" />
        </p>
      </motion.div>
      <p className="uppercase" style={{ position: 'absolute', bottom: 60, fontSize: 11, letterSpacing: '0.3em', color: '#B08A2E' }}>
        <E k="envelope.tapToTear" />
      </p>
    </motion.div>
  );
}

/**
 * "Boarding Pass" — reimagined as the real thing: the hero is an actual
 * airline ticket floating over the couple's photo, with IATA-style name
 * codes, a dotted flight arc, a data grid, a perforation and a barcode.
 * Events are itinerary legs with punched notches; a "TEAR TO OPEN" stub
 * still gates the whole pass.
 */
export default function Boarding({ data }: TemplateProps) {
  const p = data.palette;
  const countdown = useCountdown(data.weddingDate);
  const enabled = data.sections.filter((s) => s.enabled);
  const hasSection = (id: PartId) => enabled.some((s) => s.id === id);
  const showHero = hasSection('hero');
  const envelopeEnabled = hasSection('envelope');
  const [opened, setOpened] = useState(
    () => !envelopeEnabled || data.print || (!data.preview && sessionStorage.getItem(`invited:${data.slug}`) === 'true'),
  );

  // Effect controls: scrollAnim shadows the motion imports and gates the
  // pass's slide-in and the flight-arc draw.
  const fx = resolveEffects(BOARDING_EFFECTS, data.effects);
  const { fadeUp, inViewProps, still } = motionPreset(fx.scrollAnim!);

  const coupleNames = `${data.brideName} & ${data.groomName}`;
  const websitePage = data.pages.find((pg) => pg.kind === 'website');
  const heroPhoto = data.galleryImages[0]?.url ?? null;
  const firstVenue = data.events.find((ev) => ev.venue)?.venue ?? null;

  const cssVars = siteVars(p);

  const mono = (text: React.ReactNode, color: string, size = 10) => (
    <p className="font-mono uppercase" style={{ fontSize: size, letterSpacing: '0.18em', color }}>
      {text}
    </p>
  );

  // Keyed blocks rendered in the couple's saved order (Studio → Sections).
  const partBlocks: Partial<Record<PartId, React.ReactNode>> = {
    story: (
      <section key="story" className="flex items-center justify-center text-center px-8 py-24" style={{ minHeight: '70svh' }}>
        <motion.div variants={fadeUp} {...inViewProps} className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto">
          <p className="font-mono uppercase mb-5" style={{ fontSize: 10, letterSpacing: '0.3em', color: p.accent }}><E k="story.eyebrow" /></p>
          <p className="font-serif-display text-xl leading-relaxed whitespace-pre-line" style={{ color: p.inkSoft }}><EditableContent field="story" value={data.story} multiline /></p>
        </motion.div>
      </section>
    ),

    countdown:
      data.weddingDate && !countdown.past ? (
        <section key="countdown" className="flex flex-col items-center justify-center text-center px-3 sm:px-6 py-16 sm:py-24 w-full overflow-hidden" style={{ minHeight: '60svh', background: p.surface }}>
          <motion.div variants={fadeUp} {...inViewProps} className="w-full">
            <p className="font-mono uppercase mb-6 sm:mb-8" style={{ fontSize: 'clamp(8px, 2vw, 10px)', letterSpacing: '0.3em', color: p.accent }}><E k="countdown.kicker" /></p>
            {/* A split-flap departures row */}
            <div className="flex justify-center gap-2 sm:gap-3">
              {[
                { value: countdown.days, k: 'countdown.days' as const },
                { value: countdown.hours, k: 'countdown.hours' as const },
                { value: countdown.minutes, k: 'countdown.minutes' as const },
              ].map((c) => (
                <div key={c.k} className="text-center min-w-0">
                  <div
                    className="px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-lg font-mono relative overflow-hidden"
                    style={{ background: p.ink, color: p.bg, fontSize: 'clamp(20px, 5vw, 36px)' }}
                  >
                    <span
                      className="absolute left-0 right-0 top-1/2 h-px"
                      style={{ background: `color-mix(in srgb, ${p.bg} 30%, transparent)` }}
                      aria-hidden
                    />
                    <TickerDigit value={c.value} pad={2} />
                  </div>
                  <p className="uppercase mt-2 font-mono" style={{ fontSize: 'clamp(7px, 1.5vw, 9px)', letterSpacing: '0.2em', color: p.inkSoft }}><E k={c.k} /></p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>
      ) : null,

    events:
      data.events.length > 0 ? (
        <section key="events" className="px-6 py-24" style={{ background: p.surface }}>
          <p className="font-mono uppercase mb-10 text-center" style={{ fontSize: 10, letterSpacing: '0.3em', color: p.accent }}><E k="events.heading" /></p>
          <div className="space-y-6 max-w-md sm:max-w-xl mx-auto">
            {data.events.map((event, i) => {
              const directions = directionsUrl(event.venue);
              return (
                <motion.div key={event.id} variants={fadeUp} {...inViewProps} className="relative rounded-xl p-5" style={{ background: p.bg, border: `1px dashed color-mix(in srgb, ${p.accent} 45%, ${p.line})` }}>
                  {/* Punched notches on the perforation line */}
                  <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full" style={{ background: p.surface, border: `1px dashed color-mix(in srgb, ${p.accent} 45%, ${p.line})` }} aria-hidden />
                  <span className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full" style={{ background: p.surface, border: `1px dashed color-mix(in srgb, ${p.accent} 45%, ${p.line})` }} aria-hidden />
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-mono text-xs uppercase" style={{ color: p.accent, letterSpacing: '0.14em' }}>
                      <E k="events.leg" /> {String(i + 1).padStart(2, '0')}
                    </p>
                    <p className="font-mono text-xs" style={{ color: p.inkSoft }}>{formatEventTime(event.start_time)}</p>
                  </div>
                  <h3 className="font-serif-display text-2xl mb-1" style={{ color: p.primary }}>{event.name}</h3>
                  <p className="font-mono text-xs mb-1 uppercase" style={{ color: p.inkSoft, letterSpacing: '0.08em' }}>{formatEventDate(event.date)}</p>
                  {event.venue && (
                    <p className="text-sm mb-4" style={{ color: p.inkSoft }}>
                      {event.venue.name}
                      {event.venue.city ? `, ${event.venue.city}` : ''}
                    </p>
                  )}
                  <div className="flex gap-3">
                    {directions && (
                      <a href={directions} target="_blank" rel="noopener noreferrer" className="flex-1 text-center px-4 py-2.5 rounded-lg text-xs font-semibold uppercase" style={{ border: `1px solid ${p.accent}`, color: p.ink, letterSpacing: '0.1em' }}>
                        <E k="events.directions" />
                      </a>
                    )}
                    <a href={calendarUrl(event, coupleNames)} download={icsFileName(event.name)} className="flex-1 text-center px-4 py-2.5 rounded-lg text-xs font-semibold uppercase" style={{ background: p.accent, color: p.onAccent, letterSpacing: '0.1em' }}>
                      <SharedE k="events.addToCalendar" />
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      ) : null,

    rsvp: (
      <section key="rsvp" id="rsvp" className="flex flex-col items-center justify-center px-6 py-24" style={{ minHeight: '100svh' }}>
        <motion.div variants={fadeUp} {...inViewProps} className="w-full max-w-md sm:max-w-lg mx-auto">
          <p className="font-mono uppercase text-center mb-3" style={{ fontSize: 10, letterSpacing: '0.3em', color: p.accent }}><E k="rsvp.eyebrow" /></p>
          <h2 className="font-serif-display text-center mb-8" style={{ fontSize: 36, color: p.primary }}><E k="rsvp.heading" /></h2>
          <RsvpForm slug={data.slug} preview={data.preview} />
        </motion.div>
      </section>
    ),

    final: (
      <section key="final" className="flex flex-col items-center justify-center text-center px-8 py-24" style={{ minHeight: '50svh', background: p.surface }}>
        <motion.div variants={fadeUp} {...inViewProps}>
          <p className="font-mono uppercase mb-4" style={{ fontSize: 10, letterSpacing: '0.3em', color: p.accent }}>
            {iata(data.brideName)} <span aria-hidden>✈</span> {iata(data.groomName)}
          </p>
          <p className="font-serif-display mb-3" style={{ fontSize: 30, color: p.primary }}>{coupleNames}</p>
          <p className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: '0.25em', color: p.inkSoft }}><E k="final.note" /></p>
          <div className="mt-10 flex flex-col items-center gap-3">
            {websitePage && (
              <Link to={data.homePath} className="text-xs uppercase hover:opacity-60 underline underline-offset-4" style={{ color: p.accent, letterSpacing: '0.2em' }}><E k="final.website" /></Link>
            )}
            {data.authed && (
              <Link to={data.pagePath('dashboard')} className="text-xs uppercase hover:opacity-60" style={{ color: p.inkSoft, letterSpacing: '0.2em' }}>Dashboard</Link>
            )}
          </div>
        </motion.div>
      </section>
    ),
  };

  return (
    <SiteEffectsContext.Provider value={fx}>
    <div className="flex justify-center" style={{ background: '#062A26' }}>
      {/* An invite is a phone-first experience — present it as a centered ticket
          column on desktop (letterboxed) instead of stretching full-width. */}
      <div
        className="relative w-full max-w-[480px] overflow-x-hidden font-serif-display shadow-2xl"
        style={{ ...cssVars, background: p.bg, color: p.ink }}
      >
        {envelopeEnabled && !opened && (
          <TicketStub
            onComplete={() => {
              if (!data.preview) sessionStorage.setItem(`invited:${data.slug}`, 'true');
              setOpened(true);
            }}
          />
        )}
        {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}

        {showHero && (
          <section className="relative flex flex-col items-center justify-center px-4 py-12" style={{ minHeight: '100svh' }}>
            {heroPhoto ? (
              <SiteImage src={heroPhoto} alt="" loading="eager" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0" style={{ background: p.heroGradient }} />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(4,20,18,0.55) 0%, rgba(4,20,18,0.35) 40%, rgba(4,20,18,0.7) 100%)' }} />

            {/* The pass itself */}
            <motion.div
              {...(still
                ? {}
                : {
                    initial: { opacity: 0, y: 26, rotate: -1.5 },
                    animate: { opacity: 1, y: 0, rotate: 0 },
                    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 },
                  })}
              className="relative z-10 w-full max-w-[400px] rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: p.surface }}
            >
              {/* Header band */}
              <div className="flex items-center justify-between px-5 py-3" style={{ background: p.primary }}>
                {mono(<E k="hero.passLabel" />, p.bg)}
                {mono(<E k="hero.seat" />, p.accent)}
              </div>

              {/* Route row */}
              <div className="px-5 pt-6 pb-4">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="font-mono font-bold leading-none" style={{ fontSize: 40, color: p.ink }}>
                      {iata(data.brideName)}
                    </p>
                    <p className="font-script text-xl mt-1.5" style={{ color: p.accent }}>
                      <EditableContent field="brideName" value={data.brideName} />
                    </p>
                  </div>
                  <RouteArc color={p.accent} still={still} />
                  <div className="text-center">
                    <p className="font-mono font-bold leading-none" style={{ fontSize: 40, color: p.ink }}>
                      {iata(data.groomName)}
                    </p>
                    <p className="font-script text-xl mt-1.5" style={{ color: p.accent }}>
                      <EditableContent field="groomName" value={data.groomName} />
                    </p>
                  </div>
                </div>
                {data.tagline && (
                  <p className="italic text-center mt-4 text-sm" style={{ color: p.inkSoft }}>
                    <EditableContent field="tagline" value={data.tagline} multiline />
                  </p>
                )}
              </div>

              {/* Data grid */}
              <div
                className="grid grid-cols-3 gap-y-4 px-5 py-4 border-t"
                style={{ borderColor: p.line }}
              >
                <div>
                  {mono(<E k="hero.fieldDate" />, p.inkSoft, 8)}
                  <p className="font-mono text-sm mt-1" style={{ color: p.ink }}>
                    {data.weddingDate
                      ? data.weddingDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
                      : '—'}
                  </p>
                </div>
                <div>
                  {mono(<E k="hero.fieldGate" />, p.inkSoft, 8)}
                  <p className="font-mono text-sm mt-1" style={{ color: p.ink }}>
                    {firstVenue?.city?.slice(0, 12).toUpperCase() || '—'}
                  </p>
                </div>
                <div>
                  {mono(<E k="hero.fieldClass" />, p.inkSoft, 8)}
                  <p className="font-mono text-sm mt-1" style={{ color: p.ink }}>
                    <E k="hero.classValue" />
                  </p>
                </div>
              </div>

              {/* Perforation + barcode */}
              <div className="relative border-t border-dashed" style={{ borderColor: p.line }}>
                <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full" style={{ background: 'rgba(4,20,18,0.9)' }} aria-hidden />
                <span className="absolute -right-3 -top-3 w-6 h-6 rounded-full" style={{ background: 'rgba(4,20,18,0.9)' }} aria-hidden />
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    {mono(<E k="hero.departs" />, p.inkSoft, 8)}
                    <p className="font-mono text-sm mt-1" style={{ color: p.ink }}>
                      {data.weddingDate && !countdown.past ? (
                        <>
                          <TickerDigit value={countdown.days} pad={2} />d : <TickerDigit value={countdown.hours} pad={2} />h
                        </>
                      ) : (
                        '—'
                      )}
                    </p>
                  </div>
                  <Barcode color={p.ink} />
                </div>
              </div>
            </motion.div>

            <motion.p
              {...(still
                ? {}
                : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 1.4, duration: 0.8 } })}
              className="relative z-10 font-mono uppercase mt-8"
              style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.75)' }}
            >
              <E k="hero.scroll" />
            </motion.p>
          </section>
        )}

        {enabled.map((s) => partBlocks[s.id])}
      </div>
    </div>
    </SiteEffectsContext.Provider>
  );
}
