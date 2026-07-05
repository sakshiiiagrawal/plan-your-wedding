import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { TemplateProps } from '../types';
import { REEL_COPY } from '../copy/templates/reel';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { useCountdown } from '../useCountdown';
import { fadeUp, inViewProps } from '../motion';
import RsvpForm from '../RsvpForm';
import Lightbox from '../Lightbox';
import ShimmerText from '../effects/ShimmerText';
import TickerDigit from '../effects/TickerDigit';
import MusicPlayer from '../effects/MusicPlayer';

const { E } = makeEditable('reel', REEL_COPY);

/**
 * "Photo Reel" — the swipe-through photo-story invite: each slide is a
 * full-viewport gallery photo with a scrim and one text overlay, snapping
 * like a stories feed. No intro overlay — it opens straight into the reel.
 */
export default function Reel({ data }: TemplateProps) {
  const p = data.palette;
  const countdown = useCountdown(data.weddingDate);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const enabled = data.sections.filter((s) => s.enabled);

  const coupleNames = `${data.brideName} & ${data.groomName}`;
  const websitePage = data.pages.find((pg) => pg.kind === 'website');
  const photos = data.galleryImages;
  let photoIdx = 0;
  const nextPhoto = () => photos[photoIdx++ % Math.max(photos.length, 1)]?.url ?? null;

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

  const slide = (key: string, photo: string | null, children: React.ReactNode) => (
    <section
      key={key}
      className="relative flex flex-col items-center justify-center text-center px-8"
      style={{ minHeight: '100svh', scrollSnapAlign: 'start' }}
    >
      {photo ? (
        <img src={photo} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: p.heroGradient }} />
      )}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.55))' }} />
      <div className="relative z-10">{children}</div>
    </section>
  );

  const slides: React.ReactNode[] = [];
  const showHero = enabled.some((s) => s.id === 'hero');

  if (showHero) {
    slides.push(
      slide(
        'hero',
        nextPhoto(),
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto">
          <p className="uppercase mb-4" style={{ fontSize: 10, letterSpacing: '0.4em', color: 'rgba(255,255,255,0.85)' }}>
            <E k="hero.kicker" />
          </p>
          <h1 className="font-script mb-2" style={{ fontSize: 'clamp(46px, 7vw, 84px)', color: '#fff' }}>
            <ShimmerText colors={['#fff', p.accent, '#fff']}>
              <EditableContent field="brideName" value={data.brideName} />
            </ShimmerText>
          </h1>
          <p className="uppercase" style={{ fontSize: 10, letterSpacing: '0.5em', color: 'rgba(255,255,255,0.85)' }}>
            <E k="hero.and" />
          </p>
          <h1 className="font-script mt-2 mb-4" style={{ fontSize: 'clamp(46px, 7vw, 84px)', color: '#fff' }}>
            <ShimmerText colors={['#fff', p.accent, '#fff']}>
              <EditableContent field="groomName" value={data.groomName} />
            </ShimmerText>
          </h1>
          {data.weddingDate && (
            <p className="uppercase" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.9)' }}>
              {data.weddingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          <p className="uppercase mt-6" style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.6)' }}>
            <E k="hero.swipe" />
          </p>
        </motion.div>,
      ),
    );
  }

  // Slides follow the couple's saved section order from the Studio.
  for (const s of enabled) {
    if (s.id === 'story') {
      slides.push(
        slide(
          'story',
          nextPhoto(),
          <motion.div variants={fadeUp} {...inViewProps} className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto">
            <p className="uppercase mb-5" style={{ fontSize: 10, letterSpacing: '0.4em', color: p.accent }}>
              <E k="story.eyebrow" />
            </p>
            <p className="font-serif-display text-lg leading-relaxed whitespace-pre-line" style={{ color: '#fff' }}>
              <EditableContent field="story" value={data.story} multiline />
            </p>
          </motion.div>,
        ),
      );
    } else if (s.id === 'countdown' && data.weddingDate && !countdown.past) {
      slides.push(
        slide(
          'countdown',
          nextPhoto(),
          <motion.div variants={fadeUp} {...inViewProps} className="max-w-md sm:max-w-xl mx-auto w-full px-2 sm:px-0 overflow-hidden">
            <p className="uppercase mb-6 sm:mb-8" style={{ fontSize: 'clamp(8px, 2vw, 10px)', letterSpacing: '0.4em', color: p.accent }}>
              <E k="countdown.kicker" />
            </p>
            <div className="flex justify-center gap-1 sm:gap-3 md:gap-5 flex-wrap">
              {[
                { value: countdown.days, k: 'countdown.days' as const },
                { value: countdown.hours, k: 'countdown.hours' as const },
                { value: countdown.minutes, k: 'countdown.minutes' as const },
              ].map((c) => (
                <div key={c.k} className="text-center min-w-0">
                  <p className="font-serif-display" style={{ fontSize: 'clamp(20px, 5vw, 48px)', color: '#fff' }}>
                    <TickerDigit value={c.value} pad={2} />
                  </p>
                  <p className="uppercase mt-0.5 sm:mt-1" style={{ fontSize: 'clamp(6px, 1.5vw, 9px)', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.75)' }}>
                    <E k={c.k} />
                  </p>
                </div>
              ))}
            </div>
          </motion.div>,
        ),
      );
    } else if (s.id === 'events') {
      data.events.forEach((event) => {
        const directions = directionsUrl(event.venue);
        slides.push(
          slide(
            `event-${event.id}`,
            nextPhoto(),
            <motion.div variants={fadeUp} {...inViewProps} className="max-w-md sm:max-w-xl mx-auto">
              {event.event_type && (
                <p className="uppercase mb-4" style={{ fontSize: 10, letterSpacing: '0.4em', color: p.accent }}>
                  {event.event_type}
                </p>
              )}
              <h2 className="font-script mb-4" style={{ fontSize: 42, color: '#fff' }}>
                {event.name}
              </h2>
              {event.description && (
                <p className="text-sm italic mb-3 mx-auto" style={{ color: 'rgba(255,255,255,0.85)', maxWidth: 300 }}>
                  {event.description}
                </p>
              )}
              <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {formatEventDate(event.date)}
              </p>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {formatEventTime(event.start_time)}
                {event.venue ? ` · ${event.venue.name}` : ''}
              </p>
              <div className="flex justify-center gap-4">
                {directions && (
                  <a href={directions} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 rounded-full text-xs uppercase" style={{ border: '1px solid rgba(255,255,255,0.6)', color: '#fff', letterSpacing: '0.18em' }}>
                    <E k="events.map" />
                  </a>
                )}
                <a href={calendarUrl(event, coupleNames)} download={icsFileName(event.name)} className="px-5 py-2.5 rounded-full text-xs uppercase" style={{ background: p.accent, color: p.onAccent, letterSpacing: '0.18em' }}>
                  <E k="events.calendar" />
                </a>
              </div>
            </motion.div>,
          ),
        );
      });
    } else if (s.id === 'gallery') {
      // Snapshot the cursor: the onClick closures must not see later advances
      const galleryStart = photoIdx;
      photos.slice(galleryStart).forEach((image, i) => {
        slides.push(
          slide(
            `gallery-${image.url}`,
            image.url,
            <button onClick={() => setLightboxIndex(galleryStart + i)} className="absolute inset-0" aria-label="View photo" />,
          ),
        );
      });
    } else if (s.id === 'rsvp') {
      slides.push(
        <section key="rsvp" id="rsvp" className="flex flex-col items-center justify-center px-6" style={{ minHeight: '100svh', background: p.bg, scrollSnapAlign: 'start' }}>
          <motion.div variants={fadeUp} {...inViewProps} className="w-full max-w-md sm:max-w-lg mx-auto">
            <p className="uppercase text-center mb-3" style={{ fontSize: 10, letterSpacing: '0.4em', color: p.accent }}>
              <E k="rsvp.eyebrow" />
            </p>
            <h2 className="font-script text-center mb-8" style={{ fontSize: 40, color: p.ink }}>
              <E k="rsvp.heading" />
            </h2>
            <RsvpForm slug={data.slug} preview={data.preview} />
          </motion.div>
        </section>,
      );
    } else if (s.id === 'final') {
      slides.push(
        <section key="final" className="flex flex-col items-center justify-center text-center px-8" style={{ minHeight: '80svh', background: p.bg, scrollSnapAlign: 'start' }}>
          <motion.div variants={fadeUp} {...inViewProps}>
            <p className="font-script mb-3" style={{ fontSize: 38, color: p.ink }}>
              <ShimmerText>{coupleNames}</ShimmerText>
            </p>
            <p className="uppercase" style={{ fontSize: 10, letterSpacing: '0.35em', color: p.inkSoft }}>
              <E k="final.note" />
            </p>
            <div className="mt-10 flex flex-col items-center gap-3">
              {websitePage && (
                <Link to={`/${data.slug}`} className="text-xs uppercase hover:opacity-60 underline underline-offset-4" style={{ color: p.accent, letterSpacing: '0.2em' }}>
                  <E k="final.website" />
                </Link>
              )}
              {data.authed && (
                <Link to={`/${data.slug}/dashboard`} className="text-xs uppercase hover:opacity-60" style={{ color: p.inkSoft, letterSpacing: '0.2em' }}>
                  Dashboard
                </Link>
              )}
            </div>
          </motion.div>
        </section>,
      );
    }
  }

  return (
    <div style={{ background: '#000' }}>
      <div
        className="relative w-full overflow-x-hidden overflow-y-auto font-serif-display"
        style={{ ...cssVars, background: p.bg, color: p.ink, scrollSnapType: 'y proximity' }}
      >
        {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}
        {slides}

        {lightboxIndex !== null && (
          <Lightbox images={data.galleryImages} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNavigate={setLightboxIndex} />
        )}
      </div>
    </div>
  );
}
