import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { PartId, TemplateProps } from '../types';
import { SECTION_LABELS } from '../config';
import { SharedE } from '../copy/shared';
import { ALBUM_COPY } from '../copy/templates/album';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { useCountdown } from '../useCountdown';
import { fadeUp, inViewProps, scaleIn, stagger } from '../motion';
import RsvpForm from '../RsvpForm';
import Lightbox from '../Lightbox';
import ScrollProgress from '../effects/ScrollProgress';
import MusicPlayer from '../effects/MusicPlayer';

const { E } = makeEditable('album', ALBUM_COPY);

/**
 * "Golden Album" — photo-first: a full-bleed CSS-grid mosaic hero built from
 * the couple's first five gallery photos (one cell holds names/date so it
 * still reads with zero photos), followed by a full masonry gallery.
 */
export default function Album({ data }: TemplateProps) {
  const p = data.palette;
  const countdown = useCountdown(data.weddingDate);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const coupleNames = `${data.brideName} & ${data.groomName}`;
  const enabled = data.sections.filter((s) => s.enabled);
  const hasSection = (id: PartId) => enabled.some((s) => s.id === id);
  const showHero = hasSection('hero');
  const anyEnabled = enabled.length > 0;
  const showGallery = hasSection('gallery') && data.galleryImages.length > 0;
  const showEvents = hasSection('events') && data.events.length > 0;
  const mosaic = data.galleryImages.slice(0, 5);
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

  const eyebrow = (text: string) => (
    <p
      className="text-xs font-body font-medium uppercase mb-6 text-center"
      style={{ color: p.accent, letterSpacing: '0.25em' }}
    >
      {text}
    </p>
  );

  return (
    <div style={{ ...vars, background: p.bg, color: p.ink }} className="min-h-screen font-body">
      {!data.preview && <ScrollProgress color={p.accent} />}
      {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}

      {/* Nav */}
      {anyEnabled && (
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur"
        style={{ background: `${p.bg}E6`, borderColor: p.line }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href={`/${data.slug}`} className="font-serif-display text-lg" style={{ color: p.primary }}>
            {data.brideName[0]}
            <span style={{ color: p.accent }}>&amp;</span>
            {data.groomName[0]}
          </a>
          <div className="flex items-center gap-6">
            {invitePage && (
              <Link
                to={`/${data.slug}/${invitePage.pageSlug}`}
                className="hidden sm:block text-xs uppercase hover:opacity-60"
                style={{ color: p.accent, letterSpacing: '0.14em' }}
              >
                {invitePage.title}
              </Link>
            )}
            {data.authed && (
              <Link
                to={`/${data.slug}/dashboard`}
                className="text-xs uppercase hover:opacity-60"
                style={{ color: p.inkSoft, letterSpacing: '0.14em' }}
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </nav>
      )}

      {/* Mosaic hero */}
      {showHero && (
      <section
        className="pt-14 grid gap-1"
        style={{
          minHeight: '100vh',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(3, minmax(120px, 1fr))',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="col-span-2 row-span-3 md:col-span-2 relative flex items-center justify-center text-center p-8"
          style={{ background: p.heroGradient }}
        >
          <div>
            <p
              className="text-xs uppercase mb-6"
              style={{ color: p.onHeroSoft, letterSpacing: '0.3em' }}
            >
              <E k="hero.kicker" />
            </p>
            <h1
              className="font-serif-display leading-[0.95]"
              style={{ color: p.onHero, fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}
            >
              <EditableContent field="brideName" value={data.brideName} />
              <span className="italic" style={{ color: p.accent }}>
                {' '}
                &amp;{' '}
              </span>
              <EditableContent field="groomName" value={data.groomName} />
            </h1>
            {data.weddingDate && (
              <p
                className="text-sm uppercase mt-6"
                style={{ color: p.onHero, letterSpacing: '0.14em' }}
              >
                {data.weddingDate.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
            {data.weddingDate && !countdown.past && (
              <p className="text-xs mt-2" style={{ color: p.onHeroSoft }}>
                {countdown.days} <E k="hero.daysToGo" />
              </p>
            )}
            {hasSection('rsvp') && (
              <a
                href="#rsvp"
                className="inline-block mt-8 px-7 py-3 text-xs font-semibold uppercase"
                style={{ background: p.accent, color: p.onAccent, letterSpacing: '0.16em' }}
              >
                <E k="hero.rsvpCta" />
              </a>
            )}
          </div>
        </motion.div>
        {[0, 1, 2, 3].map((i) => {
          const image = mosaic[i];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.1 + i * 0.08 }}
              className="relative overflow-hidden"
              style={{ background: p.surface }}
            >
              {image ? (
                <img src={image.url} alt="" loading={i === 0 ? 'eager' : 'lazy'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: p.line, opacity: 0.5 }} />
              )}
            </motion.div>
          );
        })}
      </section>
      )}

      {enabled.map((s) => {
        if (s.id === 'gallery' && showGallery) {
          return (
            <section key="gallery" id="gallery" className="py-24 border-t" style={{ borderColor: p.line }}>
              <div className="max-w-6xl mx-auto px-6">
                {eyebrow(SECTION_LABELS.gallery)}
                <h2
                  className="font-serif-display text-4xl sm:text-5xl mb-12 text-center"
                  style={{ color: p.primary }}
                >
                  {data.gallerySubtitle || <E k="gallery.heading" />}
                </h2>
                <motion.div
                  variants={stagger}
                  {...inViewProps}
                  className="columns-2 md:columns-4 gap-3 [&>button]:mb-3"
                >
                  {data.galleryImages.map((image, i) => (
                    <motion.button
                      key={image.url}
                      variants={scaleIn}
                      onClick={() => setLightboxIndex(i)}
                      className="block w-full overflow-hidden"
                    >
                      <img
                        src={image.url}
                        alt=""
                        loading="lazy"
                        className="w-full hover:opacity-90 transition-opacity"
                      />
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            </section>
          );
        }
        if (s.id === 'story') {
          return (
            <section key="story" id="story" className="py-24 border-t" style={{ borderColor: p.line }}>
              <div className="max-w-3xl mx-auto px-6 text-center">
                {eyebrow(SECTION_LABELS.story)}
                <motion.div variants={stagger} {...inViewProps}>
                  <motion.h2
                    variants={fadeUp}
                    className="font-serif-display text-4xl sm:text-5xl mb-8"
                    style={{ color: p.primary }}
                  >
                    <E k="story.heading" />
                  </motion.h2>
                  <motion.p
                    variants={fadeUp}
                    className="font-serif-display text-xl leading-relaxed whitespace-pre-line"
                    style={{ color: p.inkSoft }}
                  >
                    <EditableContent field="story" value={data.story} multiline />
                  </motion.p>
                </motion.div>
              </div>
            </section>
          );
        }
        if (s.id === 'events' && showEvents) {
          return (
            <section key="events" id="events" className="py-24 border-t" style={{ borderColor: p.line }}>
              <div className="max-w-4xl mx-auto px-6">
                {eyebrow(SECTION_LABELS.events)}
                <h2
                  className="font-serif-display text-4xl sm:text-5xl mb-12 text-center"
                  style={{ color: p.primary }}
                >
                  <E k="events.heading" />
                </h2>
                <motion.div variants={stagger} {...inViewProps} className="space-y-8">
                  {data.events.map((event) => {
                    const directions = directionsUrl(event.venue);
                    return (
                      <motion.div
                        key={event.id}
                        variants={fadeUp}
                        className="grid sm:grid-cols-[140px_1fr] gap-3 sm:gap-8 p-6"
                        style={{ background: p.surface, border: `1px solid ${p.line}` }}
                      >
                        <div>
                          <p className="text-sm" style={{ color: p.accent }}>
                            {formatEventDate(event.date, { day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-xs mt-1" style={{ color: p.inkSoft }}>
                            {formatEventTime(event.start_time)}
                          </p>
                        </div>
                        <div>
                          <h3 className="font-serif-display text-2xl mb-1" style={{ color: p.primary }}>
                            {event.name}
                          </h3>
                          {event.venue && (
                            <p className="text-sm mb-3" style={{ color: p.inkSoft }}>
                              {event.venue.name}
                              {event.venue.city ? `, ${event.venue.city}` : ''}
                            </p>
                          )}
                          <div className="flex gap-5 text-xs font-medium uppercase" style={{ letterSpacing: '0.08em' }}>
                            <a
                              href={calendarUrl(event, coupleNames)}
                              download={icsFileName(event.name)}
                              className="underline underline-offset-4"
                              style={{ color: p.accent }}
                            >
                              <SharedE k="events.addToCalendar" />
                            </a>
                            {directions && (
                              <a
                                href={directions}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline underline-offset-4"
                                style={{ color: p.accent }}
                              >
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
            </section>
          );
        }
        if (s.id === 'rsvp') {
          return (
            <section key="rsvp" id="rsvp" className="py-24 border-t" style={{ borderColor: p.line }}>
              <div className="max-w-2xl mx-auto px-6 text-center">
                {eyebrow(SECTION_LABELS.rsvp)}
                <motion.div variants={stagger} {...inViewProps}>
                  <motion.h2
                    variants={fadeUp}
                    className="font-serif-display text-4xl sm:text-5xl mb-8"
                    style={{ color: p.primary }}
                  >
                    <E k="rsvp.heading" />
                  </motion.h2>
                  <motion.div variants={fadeUp}>
                    <RsvpForm slug={data.slug} preview={data.preview} />
                  </motion.div>
                </motion.div>
              </div>
            </section>
          );
        }
        return null;
      })}

      {anyEnabled && (
      <footer className="py-16 border-t text-center" style={{ borderColor: p.line }}>
        <p className="font-serif-display text-2xl mb-2" style={{ color: p.primary }}>
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
        <Lightbox
          images={data.galleryImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
