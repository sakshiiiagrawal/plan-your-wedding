import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
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

const { E, useT } = makeEditable('editorial', EDITORIAL_COPY);

// Editorial's single 3D idea — suspended gallery prints — ships as its own
// chunk and is skipped entirely on the reduced-motion/print path.
const EditorialHeroScene = lazy(() => import('./EditorialScene'));

/**
 * The hero photo as a cover plate: offset accent outline drawn on, gentle
 * cursor lean, and a caption rule like a printed figure.
 */
function CoverPlate({
  url,
  accent,
  line,
  caption,
  captionColor,
  reduced,
}: {
  url: string;
  accent: string;
  line: string;
  caption: string;
  captionColor: string;
  reduced: boolean;
}) {
  const tiltX = useSpring(0, { stiffness: 130, damping: 17 });
  const tiltY = useSpring(0, { stiffness: 130, damping: 17 });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="hidden md:block relative"
      style={{ perspective: 900 }}
      onMouseMove={(e) => {
        if (reduced) return;
        const r = e.currentTarget.getBoundingClientRect();
        tiltY.set(((e.clientX - r.left) / r.width - 0.5) * 7);
        tiltX.set(-((e.clientY - r.top) / r.height - 0.5) * 7);
      }}
      onMouseLeave={() => {
        tiltX.set(0);
        tiltY.set(0);
      }}
    >
      {/* Offset outline frame — the gallery-print signature, drawn on. */}
      {reduced ? (
        <div
          className="absolute -inset-x-4 -inset-y-4 translate-x-4 translate-y-4 pointer-events-none"
          style={{ border: `1px solid ${accent}`, opacity: 0.55 }}
          aria-hidden
        />
      ) : (
        <svg
          className="absolute -inset-x-4 -inset-y-4 translate-x-4 translate-y-4 pointer-events-none w-[calc(100%+2rem)] h-[calc(100%+2rem)]"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <motion.rect
            x="0.5"
            y="0.5"
            width="99"
            height="99"
            fill="none"
            stroke={accent}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            opacity="0.55"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, delay: 0.5, ease: 'easeInOut' }}
          />
        </svg>
      )}
      <motion.div
        className="relative overflow-hidden"
        style={{ border: `1px solid ${line}`, rotateX: tiltX, rotateY: tiltY }}
      >
        <img
          src={url}
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover"
          style={{ aspectRatio: '4 / 5', objectPosition: 'center 15%' }}
        />
      </motion.div>
      <p
        className="mt-3 text-[10px] uppercase text-right"
        style={{ color: captionColor, letterSpacing: '0.22em' }}
      >
        {caption}
      </p>
    </motion.div>
  );
}

/** The running masthead strip — "Save the date · 12 December 2026 ·" on loop. */
function Marquee({
  text,
  bg,
  ink,
  reduced,
}: {
  text: string;
  bg: string;
  ink: string;
  reduced: boolean;
}) {
  const items = Array.from({ length: 10 }, (_, i) => (
    <span key={i} className="inline-flex items-center gap-6 pr-6 whitespace-nowrap">
      {text}
      <span aria-hidden>·</span>
    </span>
  ));
  return (
    <div
      className="absolute bottom-0 left-0 right-0 overflow-hidden py-2.5 text-[11px] uppercase"
      style={{ background: bg, color: ink, letterSpacing: '0.28em' }}
      aria-hidden={reduced ? undefined : true}
    >
      {reduced ? (
        <p className="text-center">{text}</p>
      ) : (
        <motion.div
          className="flex w-max"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        >
          <div className="flex">{items}</div>
          <div className="flex">{items}</div>
        </motion.div>
      )}
    </div>
  );
}

/**
 * "Modern Editorial" — reimagined as The Wedding Issue: a magazine cover, not
 * a webpage. Masthead meta row, one name set solid and one as an ink outline,
 * the cover photo overlapped by the headline, a running save-the-date marquee,
 * ghost folio numerals behind each section, a day-by-day itinerary, and a
 * horizontally scrolling plate gallery. Reduced motion / ?print=1 stays flat.
 */
export default function Editorial({ data }: TemplateProps) {
  const p = data.palette;
  const countdown = useCountdown(data.weddingDate);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const t = useT();

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

  const reduced = useReducedMotion() ?? false;
  const show3d = !reduced && !data.print;
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const dateLine = data.weddingDate?.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const weddingCity = data.events.find((ev) => ev.venue?.city)?.venue?.city ?? null;

  // The numbered rail, now with a folio-sized ghost numeral behind the section.
  const eyebrow = (num: string, label: string) => (
    <div className="relative">
      <span
        className="absolute -top-10 -left-2 font-serif-display select-none pointer-events-none leading-none hidden md:block"
        style={{ fontSize: '9rem', color: p.ink, opacity: 0.05 }}
        aria-hidden
      >
        {num}
      </span>
      <p
        className="relative text-xs font-body font-medium uppercase mb-6"
        style={{ color: p.accent, letterSpacing: '0.25em' }}
      >
        <motion.span
          className="inline-block font-serif-display text-2xl mr-2 align-middle"
          {...(reduced
            ? {}
            : {
                initial: { opacity: 0, scale: 1.9, filter: 'blur(3px)' },
                whileInView: { opacity: 1, scale: 1, filter: 'blur(0px)' },
                viewport: { once: true, margin: '-80px' },
                transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
              })}
          style={{ transformOrigin: 'left bottom' }}
        >
          {num}
        </motion.span>
        — {label}
      </p>
    </div>
  );

  const sectionBlocks: Partial<Record<PartId, (num: string) => React.ReactNode>> = {
    story: (num) => (
      <section key="story" id="story" className="py-24 border-t" style={{ borderColor: p.line }}>
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[1fr_2fr] gap-10">
          <div>{eyebrow(num, SECTION_LABELS.story)}</div>
          <motion.div variants={stagger} {...inViewProps}>
            <motion.h2
              variants={fadeUp}
              className="font-serif-display text-4xl sm:text-5xl mb-8 leading-tight"
              style={{ color: p.primary }}
            >
              <E k="story.heading" />
            </motion.h2>
            <motion.div variants={fadeUp}>
              <p
                className="font-serif-display text-xl leading-relaxed whitespace-pre-line first-letter:text-6xl first-letter:font-serif-display first-letter:float-left first-letter:leading-[0.85] first-letter:mr-2.5 first-letter:text-[color:var(--dropcap)]"
                style={{ color: p.inkSoft, '--dropcap': p.accent } as React.CSSProperties}
              >
                <EditableContent field="story" value={data.story} multiline />
              </p>
            </motion.div>
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
            <div>{eyebrow(num, SECTION_LABELS.events)}</div>
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
                            className="relative grid sm:grid-cols-[110px_1fr] gap-2 sm:gap-6 pt-3"
                          >
                            {/* A quiet agenda rule: draws from the time column
                                toward the title as the row enters view. */}
                            <motion.div
                              variants={drawLine}
                              className="absolute top-0 left-0 w-full h-px"
                              style={{ background: p.accent, opacity: 0.35, transformOrigin: 'left' }}
                            />
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
          <div>{eyebrow(num, SECTION_LABELS.rsvp)}</div>
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
              <div>{eyebrow(num, SECTION_LABELS.gallery)}</div>
              <h2
                className="font-serif-display text-4xl sm:text-5xl leading-tight"
                style={{ color: p.primary }}
              >
                {data.gallerySubtitle || <E k="gallery.heading" />}
              </h2>
            </div>
          </div>
          {/* Plates run edge-to-edge in their own horizontal gallery rail */}
          <motion.div variants={fadeUp} {...inViewProps}>
            <div
              className="flex gap-8 overflow-x-auto pb-6 px-6 md:px-[max(1.5rem,calc((100vw-64rem)/2))]"
              style={{ scrollSnapType: 'x proximity' }}
            >
              {data.galleryImages.map((image, i) => {
                const tall = i % 3 === 0;
                return (
                  <figure key={image.url} className="flex-shrink-0" style={{ scrollSnapAlign: 'center' }}>
                    <button
                      onClick={() => setLightboxIndex(i)}
                      className="block overflow-hidden group"
                      style={{ border: `1px solid ${p.line}` }}
                    >
                      <img
                        src={image.url}
                        alt=""
                        loading="lazy"
                        className="object-cover group-hover:scale-[1.03] transition-transform duration-700"
                        style={{
                          height: 'min(52vh, 420px)',
                          width: 'auto',
                          aspectRatio: tall ? '4 / 5' : '3 / 2',
                        }}
                      />
                    </button>
                    <figcaption
                      className="mt-3 text-[10px] uppercase flex items-baseline justify-between"
                      style={{ color: p.inkSoft, letterSpacing: '0.22em' }}
                    >
                      <span>
                        <E k="gallery.plate" /> {String(i + 1).padStart(2, '0')}
                      </span>
                      <span style={{ color: p.accent }}>—</span>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </motion.div>
        </section>
      ) : null,
  };

  return (
    <div style={{ ...vars, background: p.bg, color: p.ink }} className="min-h-screen font-body">
      <ScrollProgress color={p.accent} />
      {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}

      {/* Hero — the cover of the issue */}
      {showHero && (
      <section
        ref={heroRef}
        className="min-h-screen flex items-center pt-14 pb-16 relative overflow-hidden"
        style={{ background: p.heroGradient }}
      >
        {/* Nav — transparent, lives inside the hero rather than as a separate chrome bar */}
        {anyEnabled && (
        <nav className="absolute top-0 left-0 right-0 z-20">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <a
              href={`/${data.slug}`}
              className="font-serif-display text-lg"
              style={{ color: p.onHero }}
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
                    style={{ color: p.onHeroSoft, letterSpacing: '0.14em' }}
                  >
                    {SECTION_LABELS[s.id]}
                  </a>
                ))}
              {invitePage && (
                <Link
                  to={`/${data.slug}/${invitePage.pageSlug}`}
                  className="hidden sm:block text-xs uppercase hover:opacity-60"
                  style={{ color: p.onHero, letterSpacing: '0.14em' }}
                >
                  {invitePage.title}
                </Link>
              )}
              {data.authed && (
                <Link
                  to={`/${data.slug}/dashboard`}
                  className="text-xs uppercase hover:opacity-60"
                  style={{ color: p.onHeroSoft, letterSpacing: '0.14em' }}
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </nav>
        )}
        {show3d && (
          <Suspense fallback={null}>
            <EditorialHeroScene
              palette={p}
              photos={data.galleryImages.slice(0, 6).map((g) => g.url)}
              progress={heroProgress}
              className="absolute inset-0"
            />
          </Suspense>
        )}
        {/* No photo yet: the serif monogram floats as the sculptural moment. */}
        {!heroPhoto && (
          <motion.div
            aria-hidden
            className="absolute right-[4%] top-[14%] hidden md:block font-serif-display italic select-none pointer-events-none"
            style={{
              fontSize: 'clamp(10rem, 26vw, 22rem)',
              color: p.onHeroSoft,
              opacity: 0.12,
              lineHeight: 1,
            }}
            {...(reduced
              ? {}
              : {
                  animate: { y: [0, -20, 0], rotate: [0, 1.2, 0] },
                  transition: { duration: 11, repeat: Infinity, ease: 'easeInOut' },
                })}
          >
            {data.brideName[0]}
            &amp;
            {data.groomName[0]}
          </motion.div>
        )}
        <div className="relative z-10 max-w-6xl mx-auto px-6 w-full py-14">
          {/* Masthead meta row */}
          <motion.div
            {...(reduced ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 } })}
            transition={{ duration: 0.8 }}
            className="flex items-baseline justify-between gap-4 border-b pb-3 mb-10 text-[10px] sm:text-[11px] uppercase"
            style={{ borderColor: `color-mix(in srgb, ${p.onHeroSoft} 40%, transparent)`, color: p.onHeroSoft, letterSpacing: '0.22em' }}
          >
            <span><E k="hero.issue" /></span>
            {weddingCity && <span className="hidden sm:inline">{weddingCity}</span>}
            {dateLine && <span>{dateLine}</span>}
          </motion.div>

          <div className={heroPhoto ? 'grid md:grid-cols-[7fr_5fr] gap-10 items-center' : ''}>
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className={heroPhoto ? 'relative z-10 md:-mr-24' : ''}
            >
              <motion.p
                variants={fadeUp}
                className="text-xs font-medium uppercase mb-8"
                style={{ color: p.onHeroSoft, letterSpacing: '0.3em' }}
              >
                <E k="hero.kicker" />
              </motion.p>
              <motion.h1
                variants={fadeUp}
                className="font-serif-display leading-[0.9] mb-2"
                style={{ color: p.onHero, fontSize: 'clamp(3.4rem, 10vw, 8.5rem)' }}
              >
                <EditableContent field="brideName" value={data.brideName} />
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="font-serif-display italic leading-none my-1"
                style={{ color: p.accent, fontSize: 'clamp(2rem, 5vw, 4rem)' }}
              >
                &amp;
              </motion.p>
              <motion.h1
                variants={fadeUp}
                className="font-serif-display leading-[0.9] mb-10 md:pl-[0.08em]"
                style={{
                  fontSize: 'clamp(3.4rem, 10vw, 8.5rem)',
                  color: 'transparent',
                  WebkitTextStroke: `1.5px ${p.onHero}`,
                }}
              >
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
                className="h-px mb-8 max-w-xl"
                style={{ background: `color-mix(in srgb, ${p.onHeroSoft} 45%, transparent)`, transformOrigin: 'left' }}
              />
              <motion.div
                variants={fadeUp}
                className="flex flex-wrap items-center gap-x-8 gap-y-3 max-w-xl"
              >
                {data.weddingDate && !countdown.past && (
                  <span className="inline-block">
                    <p className="text-sm" style={{ color: p.onHeroSoft }}>
                      <TickerDigit value={countdown.days} pad={1} /> <E k="countdown.days" /> ·{' '}
                      <TickerDigit value={countdown.hours} pad={1} /> <E k="countdown.hours" /> ·{' '}
                      <TickerDigit value={countdown.minutes} pad={1} /> <E k="countdown.minToGo" />
                    </p>
                    <motion.div
                      variants={drawLine}
                      className="h-px mt-1.5"
                      style={{ background: p.accent, opacity: 0.7, transformOrigin: 'left' }}
                    />
                  </span>
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
              <CoverPlate
                url={heroPhoto}
                accent={p.accent}
                line={p.line}
                caption={`${data.brideName} & ${data.groomName} — ${dateLine ?? ''}`}
                captionColor={p.onHeroSoft}
                reduced={reduced}
              />
            )}
          </div>
        </div>
        {dateLine && (
          <Marquee
            text={`${t('hero.marquee')} — ${dateLine}`}
            bg={p.accent}
            ink={p.onAccent}
            reduced={reduced}
          />
        )}
      </section>
      )}

      {enabled.map((s, i) => sectionBlocks[s.id]?.(String(i + 1).padStart(2, '0')))}

      {/* Footer — the colophon */}
      {anyEnabled && (
      <footer className="py-16 border-t text-center" style={{ borderColor: p.line }}>
        <p
          className="text-[10px] uppercase mb-4"
          style={{ color: p.inkSoft, letterSpacing: '0.28em' }}
        >
          <E k="footer.colophon" />
        </p>
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
