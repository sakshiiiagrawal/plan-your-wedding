import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { PartId, PublicEvent, TemplateProps } from '../types';
import { SharedE } from '../copy/shared';
import { SCROLL_COPY } from '../copy/templates/scroll';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { useCountdown } from '../useCountdown';
import { fadeUp, inViewProps, scaleIn, stagger } from '../motion';
import RsvpForm from '../RsvpForm';
import Lightbox from '../Lightbox';
import ShimmerText from '../effects/ShimmerText';
import TickerDigit from '../effects/TickerDigit';
import MusicPlayer from '../effects/MusicPlayer';

const { E } = makeEditable('scroll', SCROLL_COPY);

function ScrollIntro({
  initials,
  preview,
  onComplete,
}: {
  initials: string;
  preview?: boolean | undefined;
  onComplete: () => void;
}) {
  const [unrolled, setUnrolled] = useState(false);
  const handleTap = () => {
    if (unrolled) return;
    setUnrolled(true);
    setTimeout(onComplete, 1300);
  };

  return (
    <motion.div
      onClick={handleTap}
      animate={unrolled ? { opacity: 0 } : { opacity: 1 }}
      transition={unrolled ? { delay: 0.9, duration: 0.5 } : { duration: 0.2 }}
      style={
        preview
          ? {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '100svh',
              background: '#1B2A4A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 100,
            }
          : {
              position: 'fixed',
              inset: 0,
              background: '#1B2A4A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 100,
            }
      }
    >
      <div style={{ position: 'relative', width: 240 }}>
        <div style={{ position: 'absolute', top: -14, left: -10, right: -10, height: 28, borderRadius: 14, background: 'linear-gradient(180deg, #C9A96E, #A0835A)' }} />
        <motion.div
          animate={unrolled ? { scaleY: 1 } : { scaleY: 0.12 }}
          initial={{ scaleY: 0.12 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            transformOrigin: 'center',
            background: '#F5EFE3',
            padding: '40px 24px',
            textAlign: 'center',
            border: '1px solid #C9A96E',
          }}
        >
          <span className="font-script" style={{ fontSize: 30, color: '#1B2A4A' }}>
            {initials}
          </span>
        </motion.div>
        <div style={{ position: 'absolute', bottom: -14, left: -10, right: -10, height: 28, borderRadius: 14, background: 'linear-gradient(180deg, #C9A96E, #A0835A)' }} />
      </div>
      <p
        className="uppercase"
        style={{ position: 'absolute', bottom: 60, fontSize: 11, letterSpacing: '0.35em', color: '#C9A96E' }}
      >
        <E k="envelope.tapToUnroll" />
      </p>
    </motion.div>
  );
}

function EventSlide({ event, coupleNames, p }: { event: PublicEvent; coupleNames: string; p: TemplateProps['data']['palette'] }) {
  const directions = directionsUrl(event.venue);
  return (
    <section className="flex flex-col items-center justify-center text-center px-8" style={{ minHeight: '100svh' }}>
      <motion.div variants={fadeUp} {...inViewProps} className="max-w-md sm:max-w-xl mx-auto">
        <div className="w-10 h-10 mx-auto mb-4 rounded-full" style={{ border: `1px solid ${p.accent}` }} />
        <h2 className="font-script mb-4" style={{ fontSize: 46, color: p.primary }}>
          {event.name}
        </h2>
        <p className="font-serif-display text-lg mb-1" style={{ color: p.ink }}>
          {formatEventDate(event.date)}
        </p>
        <p className="font-serif-display mb-4" style={{ color: p.inkSoft }}>
          {formatEventTime(event.start_time)}
        </p>
        {event.venue && (
          <p className="font-serif-display italic mb-6" style={{ color: p.inkSoft }}>
            {event.venue.name}
            {event.venue.city ? `, ${event.venue.city}` : ''}
          </p>
        )}
        <div className="flex justify-center gap-4">
          {directions && (
            <a href={directions} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 rounded-full text-xs uppercase" style={{ border: `1px solid ${p.accent}`, color: p.ink, letterSpacing: '0.18em' }}>
              <E k="events.viewMap" />
            </a>
          )}
          <a href={calendarUrl(event, coupleNames)} download={icsFileName(event.name)} className="px-5 py-2.5 rounded-full text-xs uppercase" style={{ background: p.accent, color: p.onAccent, letterSpacing: '0.18em' }}>
            <SharedE k="events.addToCalendar" />
          </a>
        </div>
      </motion.div>
    </section>
  );
}

/**
 * "Royal Scroll" — tap-to-unroll parchment intro with mandala ornaments,
 * shimmer names, gold rules; gallery photo[0] as hero, photo[1] as
 * countdown backdrop, the rest as a reel row.
 */
export default function RoyalScroll({ data }: TemplateProps) {
  const p = data.palette;
  const countdown = useCountdown(data.weddingDate);
  const enabled = data.sections.filter((s) => s.enabled);
  const hasSection = (id: PartId) => enabled.some((s) => s.id === id);
  const showHero = hasSection('hero');
  const envelopeEnabled = hasSection('envelope');
  const [opened, setOpened] = useState(
    () => !envelopeEnabled || data.print || (!data.preview && sessionStorage.getItem(`invited:${data.slug}`) === 'true'),
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const coupleNames = `${data.brideName} & ${data.groomName}`;
  const initials = `${data.brideName[0] ?? ''}${data.groomName[0] ?? ''}`;
  const websitePage = data.pages.find((pg) => pg.kind === 'website');
  const heroPhoto = data.galleryImages[0]?.url ?? null;
  const countdownPhoto = data.galleryImages[1]?.url ?? heroPhoto;
  // With fewer than three photos, reuse them so the reel doesn't vanish
  const reelOffset = data.galleryImages.length > 2 ? 2 : 0;
  const reelPhotos = data.galleryImages.slice(reelOffset);

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

  return (
    <div style={{ background: '#0D1629' }}>
      <div className="relative w-full overflow-x-hidden font-serif-display" style={{ ...cssVars, background: p.bg, color: p.ink }}>
        {envelopeEnabled && !opened && (
          <ScrollIntro
            initials={initials}
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
          <div className="relative flex flex-col" style={{ minHeight: '100svh' }}>
            {heroPhoto ? (
              <img src={heroPhoto} alt="" loading="eager" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: 'center 10%' }} />
            ) : (
              <div className="absolute inset-0" style={{ background: p.heroGradient }} />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(15,20,40,0.2), rgba(15,20,40,0.55))' }} />
            <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center px-8 max-w-md sm:max-w-xl md:max-w-2xl mx-auto">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-6" style={{ border: '1px solid rgba(255,255,255,0.6)' }}>
                <span className="font-script text-xl" style={{ color: '#fff' }}>{initials}</span>
              </div>
              <h1 className="font-script leading-tight" style={{ fontSize: 'clamp(44px, 7vw, 84px)', color: '#fff' }}>
                <ShimmerText colors={['#fff', p.accent, '#fff']}>
                  <EditableContent field="brideName" value={data.brideName} />
                </ShimmerText>
              </h1>
              <p className="uppercase my-2" style={{ fontSize: 10, letterSpacing: '0.5em', color: 'rgba(255,255,255,0.9)' }}><E k="hero.and" /></p>
              <h1 className="font-script leading-tight mb-4" style={{ fontSize: 'clamp(44px, 7vw, 84px)', color: '#fff' }}>
                <ShimmerText colors={['#fff', p.accent, '#fff']}>
                  <EditableContent field="groomName" value={data.groomName} />
                </ShimmerText>
              </h1>
              {data.tagline && (
                <p className="italic mb-3" style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
                  <EditableContent field="tagline" value={data.tagline} multiline />
                </p>
              )}
              {data.weddingDate && (
                <p className="uppercase" style={{ fontSize: 10, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.9)' }}>
                  {data.weddingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        )}

        {enabled.map((s) => {
          if (s.id === 'story') {
            return (
              <section key="story" className="flex items-center justify-center text-center px-8 py-24" style={{ minHeight: '80svh' }}>
                <motion.div variants={fadeUp} {...inViewProps} className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto">
                  <div className="w-10 h-px mx-auto mb-6" style={{ background: p.accent }} />
                  <p className="uppercase mb-5" style={{ fontSize: 10, letterSpacing: '0.4em', color: p.accent }}><E k="story.eyebrow" /></p>
                  <p className="font-serif-display text-xl leading-relaxed whitespace-pre-line" style={{ color: p.inkSoft }}><EditableContent field="story" value={data.story} multiline /></p>
                  <div className="w-10 h-px mx-auto mt-6" style={{ background: p.accent }} />
                </motion.div>
              </section>
            );
          }
          if (s.id === 'countdown') {
            return data.weddingDate && !countdown.past ? (
              <div key="countdown" className="relative flex flex-col" style={{ minHeight: '100svh' }}>
                {countdownPhoto ? (
                  <img src={countdownPhoto} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0" style={{ background: p.heroGradient }} />
                )}
                <div className="absolute inset-0" style={{ background: 'rgba(13,22,41,0.5)' }} />
                <div className="relative z-10 flex flex-col items-center justify-center text-center px-3 sm:px-6 flex-1 w-full overflow-hidden">
                  <motion.div variants={scaleIn} {...inViewProps} className="w-full">
                    <p className="uppercase mb-6 sm:mb-8" style={{ fontSize: 'clamp(8px, 2vw, 10px)', letterSpacing: '0.45em', color: p.accent }}><E k="countdown.kicker" /></p>
                    <div className="flex justify-center gap-1 sm:gap-3 md:gap-5 flex-wrap px-1">
                      {[
                        { value: countdown.days, k: 'countdown.days' as const },
                        { value: countdown.hours, k: 'countdown.hours' as const },
                        { value: countdown.minutes, k: 'countdown.minutes' as const },
                      ].map((c) => (
                        <div key={c.k} className="text-center min-w-0">
                          <p className="font-serif-display" style={{ fontSize: 'clamp(20px, 5vw, 48px)', color: '#fff' }}><TickerDigit value={c.value} pad={2} /></p>
                          <p className="uppercase mt-0.5 sm:mt-1" style={{ fontSize: 'clamp(6px, 1.5vw, 9px)', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.75)' }}><E k={c.k} /></p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            ) : null;
          }
          if (s.id === 'events') {
            return data.events.map((event) => <EventSlide key={event.id} event={event} coupleNames={coupleNames} p={p} />);
          }
          if (s.id === 'gallery') {
            return reelPhotos.length > 0 ? (
              <section key="gallery" className="py-24" style={{ background: p.surface }}>
                <motion.div variants={stagger} {...inViewProps}>
                  <motion.p variants={fadeUp} className="uppercase text-center mb-10" style={{ fontSize: 10, letterSpacing: '0.4em', color: p.accent }}><E k="gallery.heading" /></motion.p>
                  <div className="flex gap-4 overflow-x-auto px-8 pb-4" style={{ scrollSnapType: 'x mandatory' }}>
                    {reelPhotos.map((image, i) => (
                      <motion.button key={image.url} variants={fadeUp} onClick={() => setLightboxIndex(i + reelOffset)} className="flex-shrink-0 overflow-hidden" style={{ width: 220, aspectRatio: '3/4', borderRadius: 12, scrollSnapAlign: 'center', border: `1px solid ${p.line}` }}>
                        <img src={image.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </section>
            ) : null;
          }
          if (s.id === 'rsvp') {
            return (
              <section key="rsvp" id="rsvp" className="flex flex-col items-center justify-center px-6 py-24" style={{ minHeight: '100svh', background: p.surface }}>
                <motion.div variants={fadeUp} {...inViewProps} className="w-full max-w-md sm:max-w-lg mx-auto">
                  <p className="uppercase text-center mb-3" style={{ fontSize: 10, letterSpacing: '0.4em', color: p.accent }}><E k="rsvp.eyebrow" /></p>
                  <h2 className="font-script text-center mb-8" style={{ fontSize: 42, color: p.primary }}><E k="rsvp.heading" /></h2>
                  <RsvpForm slug={data.slug} preview={data.preview} />
                </motion.div>
              </section>
            );
          }
          if (s.id === 'final') {
            return (
              <section key="final" className="flex flex-col items-center justify-center text-center px-8 py-24" style={{ minHeight: '60svh' }}>
                <motion.div variants={fadeUp} {...inViewProps}>
                  <p className="font-script mb-3" style={{ fontSize: 38 }}><ShimmerText>{coupleNames}</ShimmerText></p>
                  <p className="uppercase" style={{ fontSize: 10, letterSpacing: '0.35em', color: p.inkSoft }}><E k="final.note" /></p>
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
            );
          }
          return null;
        })}

        {lightboxIndex !== null && (
          <Lightbox images={data.galleryImages} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNavigate={setLightboxIndex} />
        )}
      </div>
    </div>
  );
}
