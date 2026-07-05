import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import type { PartId, TemplateProps } from '../types';
import { SECTION_LABELS } from '../config';
import { SharedE } from '../copy/shared';
import { FIESTA_COPY } from '../copy/templates/fiesta';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { useCountdown } from '../useCountdown';
import { fadeUp, inViewProps, scaleIn, stagger } from '../motion';
import RsvpForm from '../RsvpForm';
import Lightbox from '../Lightbox';
import ScrollProgress from '../effects/ScrollProgress';
import TickerDigit from '../effects/TickerDigit';
import MusicPlayer from '../effects/MusicPlayer';

const { E } = makeEditable('fiesta', FIESTA_COPY);

/**
 * "Shaadi Fiesta" — vibrant festival energy: a marigold-garland border, chunky
 * countdown pills, playfully rotated event cards tinted per event, and a
 * one-shot confetti burst on first load (skipped in the Studio preview).
 */
export default function Fiesta({ data }: TemplateProps) {
  const p = data.palette;
  const countdown = useCountdown(data.weddingDate);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (data.preview) return;
    setSize({ width: window.innerWidth, height: window.innerHeight });
    setConfetti(true);
    const t = setTimeout(() => setConfetti(false), 4500);
    return () => clearTimeout(t);
  }, [data.preview]);

  const coupleNames = `${data.brideName} & ${data.groomName}`;
  const enabled = data.sections.filter((s) => s.enabled);
  const hasSection = (id: PartId) => enabled.some((s) => s.id === id);
  const showHero = hasSection('hero');
  const anyEnabled = enabled.length > 0;
  const showGallery = hasSection('gallery') && data.galleryImages.length > 0;
  const showEvents = hasSection('events') && data.events.length > 0;
  const invitePage = data.pages.find((pg) => pg.kind === 'invite');

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
    <div style={{ ...vars, background: p.bg, color: p.ink }} className="min-h-screen font-body relative">
      {!data.preview && <ScrollProgress color={p.accent} />}
      {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}
      {confetti && size.width > 0 && (
        <Confetti width={size.width} height={size.height} numberOfPieces={220} recycle={false} colors={[p.accent, p.primary, '#FF8F00', '#E91E63']} />
      )}

      <div
        className="fixed top-0 left-0 right-0 h-2 z-40"
        style={{ background: `repeating-linear-gradient(90deg, ${p.accent} 0 10px, ${p.primary} 10px 20px)` }}
      />

      {anyEnabled && (
      <nav className="fixed top-2 left-0 right-0 z-50 border-b backdrop-blur" style={{ background: `${p.bg}E6`, borderColor: p.line }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href={`/${data.slug}`} className="font-script text-2xl" style={{ color: p.primary }}>
            {data.brideName[0]}&amp;{data.groomName[0]}
          </a>
          <div className="flex items-center gap-6">
            {invitePage && (
              <Link to={`/${data.slug}/${invitePage.pageSlug}`} className="hidden sm:block text-xs uppercase hover:opacity-60" style={{ color: p.accent, letterSpacing: '0.14em' }}>
                {invitePage.title}
              </Link>
            )}
            {data.authed && (
              <Link to={`/${data.slug}/dashboard`} className="text-xs uppercase hover:opacity-60" style={{ color: p.inkSoft, letterSpacing: '0.14em' }}>
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </nav>
      )}

      {showHero && (
      <section className="min-h-screen flex flex-col items-center justify-center text-center pt-16 px-6" style={{ background: p.heroGradient }}>
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.p variants={fadeUp} className="text-xs uppercase mb-6" style={{ color: p.onHeroSoft, letterSpacing: '0.3em' }}>
            <E k="hero.kicker" />
          </motion.p>
          <motion.h1 variants={fadeUp} className="font-script leading-tight mb-6" style={{ color: p.onHero, fontSize: 'clamp(3.5rem, 10vw, 7rem)' }}>
            <EditableContent field="brideName" value={data.brideName} /> &amp;{' '}
            <EditableContent field="groomName" value={data.groomName} />
          </motion.h1>
          {data.tagline && (
            <motion.p variants={fadeUp} className="italic text-lg mb-8" style={{ color: p.onHeroSoft }}>
              <EditableContent field="tagline" value={data.tagline} multiline />
            </motion.p>
          )}
          {hasSection('countdown') && data.weddingDate && !countdown.past && (
            <motion.div variants={scaleIn} className="flex justify-center gap-1 sm:gap-2 md:gap-4 mb-8 flex-wrap px-2 w-full overflow-hidden">
              {[
                { value: countdown.days, k: 'countdown.days' as const },
                { value: countdown.hours, k: 'countdown.hours' as const },
                { value: countdown.minutes, k: 'countdown.minutes' as const },
              ].map((c) => (
                <div key={c.k} className="rounded-2xl px-2 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-3 min-w-0" style={{ background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(6px)' }}>
                  <p className="font-serif-display" style={{ fontSize: 'clamp(16px, 4vw, 32px)', color: p.onHero }}>
                    <TickerDigit value={c.value} pad={2} />
                  </p>
                  <p className="uppercase mt-0.5 sm:mt-1" style={{ fontSize: 'clamp(7px, 1.5vw, 10px)', color: p.onHeroSoft, letterSpacing: '0.2em' }}>
                    <E k={c.k} />
                  </p>
                </div>
              ))}
            </motion.div>
          )}
          {hasSection('rsvp') && (
            <motion.a
              variants={fadeUp}
              href="#rsvp"
              className="inline-block px-8 py-3 rounded-full text-xs font-semibold uppercase"
              style={{ background: p.accent, color: p.onAccent, letterSpacing: '0.16em' }}
            >
              <E k="hero.rsvpCta" />
            </motion.a>
          )}
        </motion.div>
      </section>
      )}

      {enabled.map((s) => {
        if (s.id === 'story') {
          return (
            <section key="story" id="story" className="py-24 border-t text-center" style={{ borderColor: p.line }}>
              <div className="max-w-2xl mx-auto px-6">
                <p className="text-xs uppercase mb-6" style={{ color: p.accent, letterSpacing: '0.25em' }}>
                  {SECTION_LABELS.story}
                </p>
                <motion.p variants={fadeUp} {...inViewProps} className="font-serif-display text-xl leading-relaxed whitespace-pre-line" style={{ color: p.inkSoft }}>
                  <EditableContent field="story" value={data.story} multiline />
                </motion.p>
              </div>
            </section>
          );
        }
        if (s.id === 'events' && showEvents) {
          return (
            <section key="events" id="events" className="py-24 border-t" style={{ borderColor: p.line }}>
              <div className="max-w-5xl mx-auto px-6">
                <p className="text-xs uppercase mb-3 text-center" style={{ color: p.accent, letterSpacing: '0.25em' }}>
                  {SECTION_LABELS.events}
                </p>
                <h2 className="font-script text-4xl sm:text-5xl mb-12 text-center" style={{ color: p.primary }}>
                  <E k="events.heading" />
                </h2>
                <motion.div variants={stagger} {...inViewProps} className="grid sm:grid-cols-2 gap-8">
                  {data.events.map((event, i) => {
                    const directions = directionsUrl(event.venue);
                    const tint = event.color ?? p.accent;
                    return (
                      <motion.div
                        key={event.id}
                        variants={fadeUp}
                        className="rounded-2xl p-6"
                        style={{
                          background: p.surface,
                          border: `2px solid ${tint}`,
                          transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)`,
                          boxShadow: '0 10px 26px -12px rgba(0,0,0,0.25)',
                        }}
                      >
                        <h3 className="font-script text-3xl mb-2" style={{ color: tint }}>
                          {event.name}
                        </h3>
                        <p className="text-sm mb-1" style={{ color: p.ink }}>
                          {formatEventDate(event.date)}
                        </p>
                        <p className="text-sm mb-3" style={{ color: p.inkSoft }}>
                          {formatEventTime(event.start_time)}
                        </p>
                        {event.venue && (
                          <p className="text-sm mb-4" style={{ color: p.inkSoft }}>
                            {event.venue.name}
                            {event.venue.city ? `, ${event.venue.city}` : ''}
                          </p>
                        )}
                        <div className="flex gap-4 text-xs font-semibold uppercase" style={{ letterSpacing: '0.08em' }}>
                          <a href={calendarUrl(event, coupleNames)} download={icsFileName(event.name)} className="underline underline-offset-4" style={{ color: tint }}>
                            <SharedE k="events.addToCalendar" />
                          </a>
                          {directions && (
                            <a href={directions} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4" style={{ color: tint }}>
                              <E k="events.directions" />
                            </a>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            </section>
          );
        }
        if (s.id === 'gallery' && showGallery) {
          return (
            <section key="gallery" id="gallery" className="py-24 border-t" style={{ borderColor: p.line }}>
              <div className="max-w-5xl mx-auto px-6">
                <p className="text-xs uppercase mb-10 text-center" style={{ color: p.accent, letterSpacing: '0.25em' }}>
                  {data.gallerySubtitle || SECTION_LABELS.gallery}
                </p>
                <motion.div variants={stagger} {...inViewProps} className="columns-2 md:columns-3 gap-3 [&>button]:mb-3">
                  {data.galleryImages.map((image, i) => (
                    <motion.button key={image.url} variants={scaleIn} onClick={() => setLightboxIndex(i)} className="block w-full overflow-hidden rounded-xl">
                      <img src={image.url} alt="" loading="lazy" className="w-full hover:opacity-90 transition-opacity" />
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            </section>
          );
        }
        if (s.id === 'rsvp') {
          return (
            <section key="rsvp" id="rsvp" className="py-24 border-t" style={{ borderColor: p.line }}>
              <div className="max-w-xl mx-auto px-6 text-center">
                <p className="text-xs uppercase mb-6" style={{ color: p.accent, letterSpacing: '0.25em' }}>
                  {SECTION_LABELS.rsvp}
                </p>
                <h2 className="font-script text-4xl mb-8" style={{ color: p.primary }}>
                  <E k="rsvp.heading" />
                </h2>
                <RsvpForm slug={data.slug} preview={data.preview} />
              </div>
            </section>
          );
        }
        return null;
      })}

      {anyEnabled && (
      <footer className="py-16 border-t text-center" style={{ borderColor: p.line }}>
        <p className="font-script text-3xl mb-2" style={{ color: p.primary }}>
          {coupleNames}
        </p>
        {data.weddingDate && (
          <p className="text-xs uppercase" style={{ color: p.inkSoft, letterSpacing: '0.14em' }}>
            {data.weddingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </footer>
      )}

      {lightboxIndex !== null && (
        <Lightbox images={data.galleryImages} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNavigate={setLightboxIndex} />
      )}
    </div>
  );
}
