import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { PartId, TemplateProps } from '../types';
import { SharedE } from '../copy/shared';
import { BOARDING_COPY } from '../copy/templates/boarding';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { useCountdown } from '../useCountdown';
import { fadeUp, inViewProps } from '../motion';
import RsvpForm from '../RsvpForm';
import ShimmerText from '../effects/ShimmerText';
import TickerDigit from '../effects/TickerDigit';
import MusicPlayer from '../effects/MusicPlayer';

const { E } = makeEditable('boarding', BOARDING_COPY);

function Barcode({ color }: { color: string }) {
  const bars = [2, 1, 3, 1, 2, 3, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 3, 2, 1];
  return (
    <div className="flex items-end gap-[2px] h-6">
      {bars.map((w, i) => (
        <div key={i} style={{ width: w, height: '100%', background: color }} />
      ))}
    </div>
  );
}

function TicketStub({
  preview,
  onComplete,
}: {
  preview?: boolean | undefined;
  onComplete: () => void;
}) {
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
      style={
        preview
          ? {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '100svh',
              background: '#062A26',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 100,
            }
          : {
              position: 'fixed',
              inset: 0,
              background: '#062A26',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 100,
            }
      }
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
 * "Boarding Pass" — a travel-ticket invite: a "TEAR TO OPEN" perforated stub
 * intro, pass-header hero with mono accents and a CSS barcode, events as
 * itinerary legs with prominent directions + add-to-calendar buttons.
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

  const coupleNames = `${data.brideName} & ${data.groomName}`;
  const websitePage = data.pages.find((pg) => pg.kind === 'website');
  const heroPhoto = data.galleryImages[0]?.url ?? null;

  const cssVars = {
    '--site-bg': p.bg,
    '--site-surface': p.surface,
    '--site-ink': p.ink,
    '--site-ink-soft': p.inkSoft,
    '--site-line': p.line,
    '--site-primary': p.primary,
    '--site-accent': p.accent,
    '--site-on-accent': p.onAccent,
  } as CSSProperties;

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
            <div className="flex justify-center gap-1 sm:gap-3 md:gap-5 flex-wrap px-1">
              {[
                { value: countdown.days, k: 'countdown.days' as const },
                { value: countdown.hours, k: 'countdown.hours' as const },
                { value: countdown.minutes, k: 'countdown.minutes' as const },
              ].map((c) => (
                <div key={c.k} className="text-center min-w-0">
                  <p className="font-mono" style={{ fontSize: 'clamp(16px, 4vw, 32px)', color: p.primary }}><TickerDigit value={c.value} pad={2} /></p>
                  <p className="uppercase mt-0.5 sm:mt-1" style={{ fontSize: 'clamp(6px, 1.5vw, 9px)', letterSpacing: '0.2em', color: p.inkSoft }}><E k={c.k} /></p>
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
                <motion.div key={event.id} variants={fadeUp} {...inViewProps} className="rounded-xl p-5" style={{ background: p.bg, border: `1px dashed ${p.line}` }}>
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-mono text-xs uppercase" style={{ color: p.accent }}><E k="events.leg" /> {i + 1}</p>
                    <p className="font-mono text-xs" style={{ color: p.inkSoft }}>{formatEventTime(event.start_time)}</p>
                  </div>
                  <h3 className="font-serif-display text-2xl mb-1" style={{ color: p.primary }}>{event.name}</h3>
                  <p className="text-sm mb-1" style={{ color: p.inkSoft }}>{formatEventDate(event.date)}</p>
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
          <p className="font-serif-display mb-3" style={{ fontSize: 30, color: p.primary }}>{coupleNames}</p>
          <p className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: '0.25em', color: p.inkSoft }}><E k="final.note" /></p>
          <div className="mt-10 flex flex-col items-center gap-3">
            {websitePage && (
              <Link to={`/${data.slug}`} className="text-xs uppercase hover:opacity-60 underline underline-offset-4" style={{ color: p.accent, letterSpacing: '0.2em' }}><E k="final.website" /></Link>
            )}
            {data.authed && (
              <Link to={`/${data.slug}/dashboard`} className="text-xs uppercase hover:opacity-60" style={{ color: p.inkSoft, letterSpacing: '0.2em' }}>Dashboard</Link>
            )}
          </div>
        </motion.div>
      </section>
    ),
  };

  return (
    <div style={{ background: '#062A26' }}>
      <div className="relative w-full overflow-x-hidden font-serif-display" style={{ ...cssVars, background: p.bg, color: p.ink }}>
        {envelopeEnabled && !opened && (
          <TicketStub
            preview={data.preview}
            onComplete={() => {
              if (!data.preview) sessionStorage.setItem(`invited:${data.slug}`, 'true');
              setOpened(true);
              data.onIntroOpen?.();
            }}
          />
        )}
        {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}

        {showHero && (
          <section className="relative flex flex-col" style={{ minHeight: '100svh' }}>
            {heroPhoto ? (
              <img src={heroPhoto} alt="" loading="eager" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0" style={{ background: p.heroGradient }} />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(6,42,38,0.3), rgba(6,42,38,0.7))' }} />
            <div className="relative z-10 flex flex-col flex-1 px-6 py-10 max-w-md sm:max-w-xl md:max-w-2xl mx-auto w-full">
              <div className="flex justify-between items-center font-mono text-[10px] uppercase" style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '0.15em' }}>
                <span><E k="hero.passLabel" /></span>
                <span><E k="hero.seat" /></span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <h1 className="font-script leading-tight" style={{ fontSize: 'clamp(42px, 7vw, 84px)', color: '#fff' }}>
                  <ShimmerText colors={['#fff', p.accent, '#fff']}>
                    <EditableContent field="brideName" value={data.brideName} />
                  </ShimmerText>
                </h1>
                <p className="font-mono uppercase my-2" style={{ fontSize: 12, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.9)' }}>✈</p>
                <h1 className="font-script leading-tight" style={{ fontSize: 'clamp(42px, 7vw, 84px)', color: '#fff' }}>
                  <ShimmerText colors={['#fff', p.accent, '#fff']}>
                    <EditableContent field="groomName" value={data.groomName} />
                  </ShimmerText>
                </h1>
                {data.tagline && (
                  <p className="italic mt-4" style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
                    <EditableContent field="tagline" value={data.tagline} multiline />
                  </p>
                )}
                {data.weddingDate && (
                  <p className="font-mono uppercase mt-4" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.9)' }}>
                    <E k="hero.departs" /> {data.weddingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
              <div className="flex justify-center"><Barcode color="rgba(255,255,255,0.85)" /></div>
            </div>
          </section>
        )}

        {enabled.map((s) => partBlocks[s.id])}
      </div>
    </div>
  );
}
