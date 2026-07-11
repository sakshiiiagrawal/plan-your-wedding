import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { PartId, PublicEvent, TemplateProps } from '../types';
import { SECTION_LABELS } from '../config';
import { SharedE } from '../copy/shared';
import { EDITORIAL_COPY } from '../copy/templates/editorial';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { useCountdown } from '../useCountdown';
import { drawLine, fadeUp, inViewProps, stagger } from '../motion';
import { siteVars } from '../theme';
import RsvpForm from '../RsvpForm';
import Lightbox from '../Lightbox';
import ScrollProgress from '../effects/ScrollProgress';
import TickerDigit from '../effects/TickerDigit';
import MusicPlayer from '../effects/MusicPlayer';

const { E } = makeEditable('editorial', EDITORIAL_COPY);

/**
 * "Modern Editorial" — magazine layout: quiet color, oversized serif
 * typography, numbered left-rail sections, and a day-by-day itinerary with
 * sticky date headers. Splits the hero with a full-bleed photo when the
 * couple has uploaded one.
 */
export default function Editorial({ data }: TemplateProps) {
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
  const heroPhoto = data.galleryImages[0]?.url ?? null;
  const invitePage = data.pages.find((pg) => pg.kind === 'invite');

  // Multi-day Indian weddings read better as an itinerary than a card grid
  const eventsByDay = useMemo(() => {
    const days = new Map<string, PublicEvent[]>();
    for (const event of data.events) {
      const list = days.get(event.date) ?? [];
      list.push(event);
      days.set(event.date, list);
    }
    return [...days.entries()];
  }, [data.events]);

  const vars = siteVars(p);

  const eyebrow = (text: string) => (
    <p
      className="text-xs font-body font-medium uppercase mb-6"
      style={{ color: p.accent, letterSpacing: '0.25em' }}
    >
      {text}
    </p>
  );

  const sectionBlocks: Partial<Record<PartId, (num: string) => React.ReactNode>> = {
    story: (num) => (
      <section key="story" id="story" className="py-24 border-t" style={{ borderColor: p.line }}>
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[1fr_2fr] gap-10">
          <div>{eyebrow(`${num} — ${SECTION_LABELS.story}`)}</div>
          <motion.div variants={stagger} {...inViewProps}>
            <motion.h2
              variants={fadeUp}
              className="font-serif-display text-4xl sm:text-5xl mb-8 leading-tight"
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
    ),

    events: (num) =>
      showEvents ? (
        <section
          key="events"
          id="events"
          className="py-24 border-t"
          style={{ borderColor: p.line }}
        >
          <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[1fr_2fr] gap-10">
            <div>{eyebrow(`${num} — ${SECTION_LABELS.events}`)}</div>
            <div>
              <h2
                className="font-serif-display text-4xl sm:text-5xl mb-12 leading-tight"
                style={{ color: p.primary }}
              >
                <E k="events.heading" />
              </h2>
              <div className="space-y-14">
                {eventsByDay.map(([date, events]) => (
                  <div key={date}>
                    <div
                      className="sticky z-10"
                      style={{ top: 56, background: p.bg }}
                    >
                      <p
                        className="text-sm font-body font-semibold uppercase pt-2 pb-3"
                        style={{ color: p.ink, letterSpacing: '0.12em' }}
                      >
                        {formatEventDate(date)}
                      </p>
                      <motion.div
                        variants={drawLine}
                        {...inViewProps}
                        className="h-px"
                        style={{ background: p.line, transformOrigin: 'left' }}
                      />
                    </div>
                    <motion.div variants={stagger} {...inViewProps} className="space-y-8 pt-6">
                      {events.map((event) => {
                        const directions = directionsUrl(event.venue);
                        return (
                          <motion.div
                            key={event.id}
                            variants={fadeUp}
                            className="grid sm:grid-cols-[110px_1fr] gap-2 sm:gap-6"
                          >
                            <p className="font-body text-sm pt-1" style={{ color: p.accent }}>
                              {formatEventTime(event.start_time)}
                            </p>
                            <div>
                              <h3
                                className="font-serif-display text-2xl mb-1"
                                style={{ color: p.primary }}
                              >
                                {event.name}
                              </h3>
                              {event.venue && (
                                <p className="text-sm mb-1" style={{ color: p.inkSoft }}>
                                  {event.venue.name}
                                  {event.venue.city ? `, ${event.venue.city}` : ''}
                                </p>
                              )}
                              {event.description && (
                                <p className="text-sm mb-1" style={{ color: p.inkSoft }}>
                                  {event.description}
                                </p>
                              )}
                              {event.dress_code && (
                                <p className="text-sm italic" style={{ color: p.inkSoft }}>
                                  <E k="events.dressCode" /> {event.dress_code}
                                </p>
                              )}
                              <div
                                className="mt-2 flex gap-5 text-xs font-medium uppercase"
                                style={{ letterSpacing: '0.08em' }}
                              >
                                <a
                                  href={calendarUrl(event, coupleNames)}
                                  download={icsFileName(event.name)}
                                  className="hover:opacity-70 underline underline-offset-4"
                                  style={{ color: p.accent }}
                                >
                                  <SharedE k="events.addToCalendar" />
                                </a>
                                {directions && (
                                  <a
                                    href={directions}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:opacity-70 underline underline-offset-4"
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
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null,

    rsvp: (num) => (
      <section key="rsvp" id="rsvp" className="py-24 border-t" style={{ borderColor: p.line }}>
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[1fr_2fr] gap-10">
          <div>{eyebrow(`${num} — ${SECTION_LABELS.rsvp}`)}</div>
          <motion.div variants={stagger} {...inViewProps}>
            <motion.h2
              variants={fadeUp}
              className="font-serif-display text-4xl sm:text-5xl mb-4 leading-tight"
              style={{ color: p.primary }}
            >
              <E k="rsvp.heading" />
            </motion.h2>
            <motion.p variants={fadeUp} className="mb-10" style={{ color: p.inkSoft }}>
              <E k="rsvp.subheading" />
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="rounded-none border p-1"
              style={{ borderColor: p.line, background: p.surface }}
            >
              <RsvpForm slug={data.slug} preview={data.preview} />
            </motion.div>
          </motion.div>
        </div>
      </section>
    ),

    gallery: (num) =>
      showGallery ? (
        <section
          key="gallery"
          id="gallery"
          className="py-24 border-t"
          style={{ borderColor: p.line }}
        >
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid md:grid-cols-[1fr_2fr] gap-10 mb-12">
              <div>{eyebrow(`${num} — ${SECTION_LABELS.gallery}`)}</div>
              <h2
                className="font-serif-display text-4xl sm:text-5xl leading-tight"
                style={{ color: p.primary }}
              >
                {data.gallerySubtitle || <E k="gallery.heading" />}
              </h2>
            </div>
            <div className="columns-2 md:columns-3 gap-3 [&>button]:mb-3">
              {data.galleryImages.map((image, i) => (
                <button
                  key={image.url}
                  onClick={() => setLightboxIndex(i)}
                  className="block w-full overflow-hidden"
                >
                  <img
                    src={image.url}
                    alt=""
                    loading="lazy"
                    className="w-full hover:opacity-90 transition-opacity"
                  />
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null,
  };

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
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <a
            href={`/${data.slug}`}
            className="font-serif-display text-lg"
            style={{ color: p.primary }}
          >
            {data.brideName[0]}
            <span style={{ color: p.accent }}>&amp;</span>
            {data.groomName[0]}
          </a>
          <div className="flex items-center gap-6">
            {enabled
              .filter(
                (s) =>
                  s.id !== 'hero' &&
                  SECTION_LABELS[s.id] &&
                  (s.id !== 'gallery' || showGallery) &&
                  (s.id !== 'events' || showEvents),
              )
              .map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="hidden sm:block text-xs uppercase hover:opacity-60"
                  style={{ color: p.ink, letterSpacing: '0.14em' }}
                >
                  {SECTION_LABELS[s.id]}
                </a>
              ))}
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

      {/* Hero — splits with a full-bleed photo when one exists */}
      {showHero && (
      <section
        className="min-h-screen flex items-center pt-14"
        style={{ background: p.heroGradient }}
      >
        <div
          className={`max-w-6xl mx-auto px-6 w-full py-20 ${
            heroPhoto ? 'grid md:grid-cols-[3fr_2fr] gap-12 items-center' : ''
          }`}
        >
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.p
              variants={fadeUp}
              className="text-xs font-medium uppercase mb-8"
              style={{ color: p.onHeroSoft, letterSpacing: '0.3em' }}
            >
              <E k="hero.kicker" />
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="font-serif-display leading-[0.95] mb-10"
              style={{ color: p.onHero, fontSize: 'clamp(3rem, 8vw, 7rem)' }}
            >
              <EditableContent field="brideName" value={data.brideName} />
              <span className="italic" style={{ color: p.accent }}>
                {' '}
                &amp;{' '}
              </span>
              <EditableContent field="groomName" value={data.groomName} />
            </motion.h1>
            {data.tagline && (
              <motion.p
                variants={fadeUp}
                className="font-serif-display italic text-xl mb-8 max-w-xl"
                style={{ color: p.onHeroSoft }}
              >
                <EditableContent field="tagline" value={data.tagline} multiline />
              </motion.p>
            )}
            <motion.div
              variants={drawLine}
              className="h-px mb-8"
              style={{ background: p.line, transformOrigin: 'left' }}
            />
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap items-center gap-x-8 gap-y-3"
            >
              {data.weddingDate && (
                <p
                  className="text-sm uppercase"
                  style={{ color: p.onHero, letterSpacing: '0.12em' }}
                >
                  {data.weddingDate.toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
              {data.weddingDate && !countdown.past && (
                <p className="text-sm" style={{ color: p.onHeroSoft }}>
                  <TickerDigit value={countdown.days} pad={1} /> <E k="countdown.days" /> ·{' '}
                  <TickerDigit value={countdown.hours} pad={1} /> <E k="countdown.hours" /> ·{' '}
                  <TickerDigit value={countdown.minutes} pad={1} /> <E k="countdown.minToGo" />
                </p>
              )}
              {hasSection('rsvp') && (
                <a
                  href="#rsvp"
                  className="ml-auto px-7 py-3 text-xs font-semibold uppercase"
                  style={{ background: p.accent, color: p.onAccent, letterSpacing: '0.16em' }}
                >
                  <E k="hero.rsvpCta" />
                </a>
              )}
            </motion.div>
          </motion.div>
          {heroPhoto && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="hidden md:block relative"
            >
              {/* Offset outline frame — the gallery-print signature */}
              <div
                className="absolute -inset-x-4 -inset-y-4 translate-x-4 translate-y-4 pointer-events-none"
                style={{ border: `1px solid ${p.accent}`, opacity: 0.55 }}
                aria-hidden
              />
              <div className="relative overflow-hidden" style={{ border: `1px solid ${p.line}` }}>
                <img
                  src={heroPhoto}
                  alt=""
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-full object-cover"
                  style={{ aspectRatio: '4 / 5', objectPosition: 'center 15%' }}
                />
              </div>
            </motion.div>
          )}
        </div>
      </section>
      )}

      {enabled.map((s, i) => sectionBlocks[s.id]?.(String(i + 1).padStart(2, '0')))}

      {/* Footer */}
      {anyEnabled && (
      <footer className="py-16 border-t text-center" style={{ borderColor: p.line }}>
        <p className="font-serif-display text-2xl mb-2" style={{ color: p.primary }}>
          {coupleNames}
        </p>
        {data.weddingDate && (
          <p className="text-xs uppercase" style={{ color: p.inkSoft, letterSpacing: '0.14em' }}>
            {data.weddingDate.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
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
