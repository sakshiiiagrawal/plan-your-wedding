import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import type { PartId, TemplateProps } from '../types';
import { SECTION_LABELS } from '../config';
import { SharedE } from '../copy/shared';
import { MIDNIGHT_COPY } from '../copy/templates/midnight';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { useCountdown } from '../useCountdown';
import { fadeUp, inViewProps, stagger } from '../motion';
import { siteVars, heroShimmer } from '../theme';
import RsvpForm from '../RsvpForm';
import Lightbox from '../Lightbox';
import ShimmerText from '../effects/ShimmerText';
import ScrollProgress from '../effects/ScrollProgress';
import TickerDigit from '../effects/TickerDigit';
import MusicPlayer from '../effects/MusicPlayer';

const { E } = makeEditable('midnight', MIDNIGHT_COPY);

/** Twinkling star field behind the hero. */
function StarField({ color }: { color: string }) {
  const reduced = useReducedMotion();
  const stars = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        top: `${(i * 53) % 100}%`,
        size: 1 + ((i * 7) % 3),
        delay: (i % 9) * 0.5,
      })),
    [],
  );
  if (reduced) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {stars.map((star, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.15, 0.9, 0.15] }}
          transition={{ duration: 3.4, delay: star.delay, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            borderRadius: '50%',
            background: color,
          }}
        />
      ))}
    </div>
  );
}

/**
 * "Midnight Luxe" — a dark, cinematic canvas with gilded serif type, a star
 * field, shimmering names, and a commanding countdown.
 */
export default function Midnight({ data }: TemplateProps) {
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
  const invitePage = data.pages.find((pg) => pg.kind === 'invite');

  // Names sweep between the palette's own on-hero tokens — always legible on
  // this template's hero gradient, whatever palette the couple picks.
  const shimmerColors = heroShimmer(p);

  const vars = siteVars(p);

  const heading = (text: string) => (
    <motion.div variants={fadeUp} className="text-center mb-14">
      <p className="text-xs uppercase mb-3" style={{ color: p.inkSoft, letterSpacing: '0.35em' }}>
        {text}
      </p>
      <div className="w-16 h-px mx-auto" style={{ background: p.primary }} />
    </motion.div>
  );

  const sectionBlocks: Partial<Record<PartId, React.ReactNode>> = {
    story: (
      <section key="story" id="story" className="py-24">
        <motion.div variants={stagger} {...inViewProps} className="max-w-3xl mx-auto px-6">
          {heading(SECTION_LABELS.story)}
          <motion.p
            variants={fadeUp}
            className="font-serif-display text-2xl leading-relaxed text-center whitespace-pre-line"
            style={{ color: p.ink }}
          >
            <EditableContent field="story" value={data.story} multiline />
          </motion.p>
        </motion.div>
      </section>
    ),

    events: showEvents ? (
      <section key="events" id="events" className="py-24" style={{ background: p.surface }}>
        <motion.div variants={stagger} {...inViewProps} className="max-w-4xl mx-auto px-6">
          {heading(SECTION_LABELS.events)}
          <div className="space-y-5">
            {data.events.map((event) => {
              const directions = directionsUrl(event.venue);
              return (
                <motion.div
                  key={event.id}
                  variants={fadeUp}
                  className="p-8 sm:p-10"
                  style={{ background: p.bg, border: `1px solid ${p.line}` }}
                >
                  <div className="sm:flex items-baseline justify-between gap-6 mb-3">
                    <h3 className="font-serif-display text-3xl" style={{ color: p.primary }}>
                      {event.name}
                    </h3>
                    <p
                      className="text-xs uppercase whitespace-nowrap"
                      style={{ color: p.inkSoft, letterSpacing: '0.16em' }}
                    >
                      {formatEventDate(event.date, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {' · '}
                      {formatEventTime(event.start_time)}
                    </p>
                  </div>
                  {event.venue && (
                    <p className="text-sm mb-1" style={{ color: p.ink }}>
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
                    <p className="text-sm" style={{ color: p.inkSoft }}>
                      <E k="events.dressCode" /> {event.dress_code}
                    </p>
                  )}
                  <div
                    className="mt-5 pt-5 flex gap-6 text-xs uppercase"
                    style={{ borderTop: `1px solid ${p.line}`, letterSpacing: '0.14em' }}
                  >
                    <a
                      href={calendarUrl(event, coupleNames)}
                      download={icsFileName(event.name)}
                      className="hover:opacity-70"
                      style={{ color: p.primary }}
                    >
                      <SharedE k="events.addToCalendar" />
                    </a>
                    {directions && (
                      <a
                        href={directions}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:opacity-70"
                        style={{ color: p.primary }}
                      >
                        <E k="events.directions" />
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>
    ) : null,

    rsvp: (
      <section key="rsvp" id="rsvp" className="py-24">
        <motion.div variants={stagger} {...inViewProps} className="max-w-2xl mx-auto px-6">
          {heading(SECTION_LABELS.rsvp)}
          <motion.p
            variants={fadeUp}
            className="font-serif-display text-2xl text-center mb-10"
            style={{ color: p.ink }}
          >
            <E k="rsvp.subheading" />
          </motion.p>
          <motion.div variants={fadeUp}>
            <RsvpForm slug={data.slug} preview={data.preview} />
          </motion.div>
        </motion.div>
      </section>
    ),

    gallery: showGallery ? (
      <section key="gallery" id="gallery" className="py-24" style={{ background: p.surface }}>
        <motion.div variants={stagger} {...inViewProps} className="max-w-5xl mx-auto px-6">
          {heading(SECTION_LABELS.gallery)}
          {data.gallerySubtitle && (
            <motion.p
              variants={fadeUp}
              className="text-center -mt-8 mb-12 text-sm"
              style={{ color: p.inkSoft }}
            >
              {data.gallerySubtitle}
            </motion.p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.galleryImages.map((image, i) => (
              <motion.button
                key={image.url}
                variants={fadeUp}
                onClick={() => setLightboxIndex(i)}
                className="aspect-square overflow-hidden group"
                style={{ border: `1px solid ${p.line}` }}
              >
                <img
                  src={image.url}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </section>
    ) : null,
  };

  return (
    <div style={{ ...vars, background: p.bg, color: p.ink }} className="min-h-screen font-body">
      {!data.preview && <ScrollProgress color={p.primary} />}
      {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}

      {/* Nav */}
      {anyEnabled && (
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur"
        style={{ background: `${p.bg}D9`, borderColor: p.line }}
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <a
            href={`/${data.slug}`}
            className="font-serif-display text-lg tracking-widest uppercase"
            style={{ color: p.primary }}
          >
            {data.brideName[0]} · {data.groomName[0]}
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
                  style={{ color: p.ink, letterSpacing: '0.16em' }}
                >
                  {SECTION_LABELS[s.id]}
                </a>
              ))}
            {invitePage && (
              <Link
                to={`/${data.slug}/${invitePage.pageSlug}`}
                className="hidden sm:block text-xs uppercase hover:opacity-60"
                style={{ color: p.primary, letterSpacing: '0.16em' }}
              >
                {invitePage.title}
              </Link>
            )}
            {data.authed && (
              <Link
                to={`/${data.slug}/dashboard`}
                className="text-xs uppercase hover:opacity-60"
                style={{ color: p.inkSoft, letterSpacing: '0.16em' }}
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </nav>
      )}

      {/* Hero */}
      {showHero && (
      <section
        className="min-h-screen flex items-center justify-center pt-14 px-6 relative overflow-hidden"
        style={{ background: p.heroGradient }}
      >
        <StarField color={p.onHeroSoft} />
        {/* Cinematic vignette so the star field falls off toward the edges */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.45) 100%)' }}
          aria-hidden
        />
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="text-center py-20 relative z-10 mx-auto max-w-3xl px-8"
          style={{
            borderTop: `1px solid color-mix(in srgb, ${p.onHeroSoft} 45%, transparent)`,
            borderBottom: `1px solid color-mix(in srgb, ${p.onHeroSoft} 45%, transparent)`,
          }}
        >
          <motion.p
            variants={fadeUp}
            className="text-xs uppercase mb-8"
            style={{ color: p.onHeroSoft, letterSpacing: '0.4em' }}
          >
            <E k="hero.kicker" />
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="font-serif-display leading-tight mb-8"
            style={{ fontSize: 'clamp(3rem, 9vw, 7rem)' }}
          >
            <ShimmerText colors={shimmerColors}>
              <EditableContent field="brideName" value={data.brideName} />
            </ShimmerText>
            <span className="block text-2xl my-4" style={{ color: p.onHeroSoft }}>
              ✦
            </span>
            <ShimmerText colors={shimmerColors}>
              <EditableContent field="groomName" value={data.groomName} />
            </ShimmerText>
          </motion.h1>
          {data.tagline && (
            <motion.p
              variants={fadeUp}
              className="font-serif-display italic text-xl mb-8"
              style={{ color: p.onHeroSoft }}
            >
              <EditableContent field="tagline" value={data.tagline} multiline />
            </motion.p>
          )}
          {data.weddingDate && (
            <motion.p
              variants={fadeUp}
              className="text-sm uppercase mb-12"
              style={{ color: p.onHero, letterSpacing: '0.25em' }}
            >
              {data.weddingDate.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </motion.p>
          )}
          {data.weddingDate && !countdown.past && (
            <motion.div
              variants={fadeUp}
              className="inline-flex divide-x mb-12 flex-wrap w-full overflow-hidden px-2 sm:px-0"
              style={{ border: `1px solid color-mix(in srgb, ${p.onHeroSoft} 40%, transparent)` }}
            >
              {[
                { value: countdown.days, k: 'countdown.days' as const },
                { value: countdown.hours, k: 'countdown.hours' as const },
                { value: countdown.minutes, k: 'countdown.minutes' as const },
                { value: countdown.seconds, k: 'countdown.seconds' as const },
              ].map((item) => (
                <div
                  key={item.k}
                  className="px-1 sm:px-2 md:px-4 lg:px-6 py-1.5 sm:py-2 md:py-4 text-center min-w-0"
                  style={{ borderColor: `color-mix(in srgb, ${p.onHeroSoft} 40%, transparent)` }}
                >
                  <TickerDigit
                    value={item.value}
                    className="font-serif-display"
                    style={{ fontSize: 'clamp(14px, 3.5vw, 36px)', color: p.onHero }}
                  />
                  <p
                    className="uppercase mt-0.5 sm:mt-1"
                    style={{ fontSize: 'clamp(6px, 1.5vw, 10px)', color: p.onHeroSoft, letterSpacing: '0.2em' }}
                  >
                    <E k={item.k} />
                  </p>
                </div>
              ))}
            </motion.div>
          )}
          <motion.div variants={fadeUp}>
            {hasSection('rsvp') && (
              <a
                href="#rsvp"
                className="inline-block px-10 py-4 text-xs font-semibold uppercase"
                style={{ background: p.accent, color: p.onAccent, letterSpacing: '0.22em' }}
              >
                <E k="hero.rsvpCta" />
              </a>
            )}
          </motion.div>
        </motion.div>
      </section>
      )}

      {enabled.map((s) => sectionBlocks[s.id])}

      {/* Footer */}
      {anyEnabled && (
      <footer className="py-16 text-center border-t" style={{ borderColor: p.line }}>
        <p
          className="font-serif-display text-xl uppercase mb-2"
          style={{ color: p.primary, letterSpacing: '0.2em' }}
        >
          {coupleNames}
        </p>
        {data.weddingDate && (
          <p className="text-xs uppercase" style={{ color: p.inkSoft, letterSpacing: '0.18em' }}>
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
