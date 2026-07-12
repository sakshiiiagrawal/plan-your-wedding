import { lazy, Suspense, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import type { PartId, TemplateProps } from '../types';
import { SECTION_LABELS } from '../config';
import { SharedE } from '../copy/shared';
import { BOTANICAL_COPY } from '../copy/templates/botanical';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { useCountdown } from '../useCountdown';
import { fadeUp, inViewProps, stagger } from '../motion';
import { siteVars } from '../theme';
import RsvpForm from '../RsvpForm';
import Lightbox from '../Lightbox';
import ScrollProgress from '../effects/ScrollProgress';
import TickerDigit from '../effects/TickerDigit';
import MusicPlayer from '../effects/MusicPlayer';

const { E } = makeEditable('botanical', BOTANICAL_COPY);

// The 3D garden (living arch + volumetric petal canopy) is its own chunk;
// the reduced-motion/print path keeps the flat arch + 2D PetalDrift instead.
const BotanicalHeroScene = lazy(() => import('./BotanicalScene'));

/** A few softly drifting petals behind the hero — storybook ambience. */
function PetalDrift({ color }: { color: string }) {
  const reduced = useReducedMotion();
  if (reduced) return null;
  const petals = [
    { left: '12%', size: 10, delay: 0, duration: 11 },
    { left: '28%', size: 7, delay: 2.5, duration: 13 },
    { left: '55%', size: 9, delay: 1, duration: 12 },
    { left: '72%', size: 6, delay: 4, duration: 14 },
    { left: '88%', size: 8, delay: 3, duration: 10 },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {petals.map((petal, i) => (
        <motion.div
          key={i}
          initial={{ y: '-10%', opacity: 0 }}
          animate={{ y: '110vh', opacity: [0, 0.7, 0.7, 0], rotate: 320 }}
          transition={{
            duration: petal.duration,
            delay: petal.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            left: petal.left,
            top: 0,
            width: petal.size,
            height: petal.size * 1.4,
            background: color,
            opacity: 0.5,
            borderRadius: '50% 0 50% 50%',
          }}
        />
      ))}
    </div>
  );
}

/** A hand-drawn branch that sketches itself in — the herbarium's pen work. */
function BranchSketch({
  color,
  reduced,
  className = '',
  delay = 0,
}: {
  color: string;
  reduced: boolean;
  className?: string;
  delay?: number;
}) {
  const leaves = [
    'M30,118 q-16,-4 -18,-20 q16,2 18,20',
    'M44,88 q-18,-2 -22,-18 q18,0 22,18',
    'M58,62 q-16,-6 -17,-22 q15,3 17,22',
    'M52,96 q14,-10 30,-6 q-10,14 -30,6',
    'M68,68 q12,-12 28,-10 q-8,15 -28,10',
    'M84,40 q10,-13 26,-13 q-5,16 -26,13',
  ];
  return (
    <svg viewBox="0 0 130 150" className={`w-24 h-28 sm:w-32 sm:h-36 ${className}`} aria-hidden>
      <motion.path
        d="M22,148 C30,110 44,80 66,56 C82,38 96,28 112,22"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        {...(reduced
          ? {}
          : {
              initial: { pathLength: 0 },
              animate: { pathLength: 1 },
              transition: { duration: 2, delay, ease: 'easeInOut' },
            })}
      />
      {leaves.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="1.1"
          strokeLinecap="round"
          {...(reduced
            ? {}
            : {
                initial: { pathLength: 0, opacity: 0 },
                animate: { pathLength: 1, opacity: 1 },
                transition: { duration: 0.9, delay: delay + 0.5 + i * 0.22, ease: 'easeOut' },
              })}
        />
      ))}
    </svg>
  );
}

/** Soft organic edge between two section colours — no hard bands anywhere. */
function WaveEdge({ fill, flip = false }: { fill: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 1440 56"
      preserveAspectRatio="none"
      className={`block w-full h-10 sm:h-14 ${flip ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path
        d="M0,32 C180,56 360,8 560,20 C760,32 900,52 1100,40 C1260,30 1360,14 1440,24 L1440,56 L0,56 Z"
        fill={fill}
      />
    </svg>
  );
}

/** The winding dashed stem that links one garden event to the next. */
function StemConnector({ color, mirror, reduced }: { color: string; mirror: boolean; reduced: boolean }) {
  return (
    <svg
      viewBox="0 0 200 90"
      className={`h-20 w-48 mx-auto block ${mirror ? '-scale-x-100' : ''}`}
      aria-hidden
    >
      <motion.path
        d="M40,4 C40,40 160,50 160,86"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeDasharray="1 7"
        strokeLinecap="round"
        {...(reduced
          ? {}
          : {
              initial: { pathLength: 0 },
              whileInView: { pathLength: 1 },
              viewport: { once: true, margin: '-40px' },
              transition: { duration: 1.1, ease: 'easeInOut' },
            })}
      />
      <motion.path
        d="M96,40 q-14,-4 -16,-18 q14,2 16,18"
        fill="none"
        stroke={color}
        strokeWidth="1.1"
        {...(reduced
          ? {}
          : {
              initial: { opacity: 0 },
              whileInView: { opacity: 1 },
              viewport: { once: true },
              transition: { duration: 0.6, delay: 0.7 },
            })}
      />
    </svg>
  );
}

/** A portrait as a cameo: oval ring, hanging from a sketched stem. */
function Cameo({
  photo,
  name,
  palette,
  reduced,
}: {
  photo: string | null;
  name: string;
  palette: { line: string; accent: string; primary: string; onHero: string; heroGradient: string; surface: string };
  reduced: boolean;
}) {
  return (
    <div className="text-center">
      <motion.div
        className="relative mx-auto mb-4 w-36 h-48 sm:w-44 sm:h-56"
        {...(reduced
          ? {}
          : {
              initial: { opacity: 0, scale: 0.92 },
              whileInView: { opacity: 1, scale: 1 },
              viewport: { once: true, margin: '-60px' },
              whileHover: { rotate: 1.5 },
              transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
            })}
      >
        <div
          className="absolute inset-0 overflow-hidden flex items-center justify-center"
          style={{
            borderRadius: '50%',
            border: `1px solid ${palette.accent}`,
            boxShadow: `inset 0 0 0 6px ${palette.surface}, inset 0 0 0 7px ${palette.line}`,
            background: photo ? undefined : palette.heroGradient,
          }}
        >
          {photo ? (
            <img src={photo} alt={name} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <span className="font-script text-5xl" style={{ color: palette.onHero }}>
              {name[0]}
            </span>
          )}
        </div>
      </motion.div>
      <p className="font-serif-display italic text-2xl" style={{ color: palette.primary }}>
        {name}
      </p>
    </div>
  );
}

/**
 * "Garden Romance" — reimagined as The Herbarium: a pressed-flower garden
 * album. Hand-drawn branches sketch themselves around the hero, sections meet
 * on organic wave edges instead of hard bands, the couple hang as cameo
 * portraits, the events grow along a winding dashed stem as leaf-shaped
 * cards, and gallery photos are pinned like specimens under washi tape.
 */
export default function Botanical({ data }: TemplateProps) {
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

  const vars = siteVars(p);

  const reduced = useReducedMotion() ?? false;
  const show3d = !reduced && !data.print;
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  // Names rise faster than the page scrolls — "rising through the garden
  // arch" (the arch itself swells to let them pass; see BotanicalScene).
  const namesY = useTransform(heroProgress, [0, 1], [0, -110]);

  const heading = (text: React.ReactNode) => (
    <motion.div variants={fadeUp}>
      <h2
        className="font-serif-display italic text-4xl sm:text-5xl text-center mb-4"
        style={{ color: p.primary }}
      >
        {text}
      </h2>
      <div className="flex items-center justify-center gap-3 mb-10" aria-hidden>
        <span className="h-px w-10" style={{ background: p.line }} />
        <svg viewBox="0 0 24 14" className="w-6 h-3.5">
          <path
            d="M12,12 q-8,-1 -10,-9 q9,1 10,9 q1,-8 10,-9 q-2,8 -10,9"
            fill="none"
            stroke={p.accent}
            strokeWidth="1.1"
          />
        </svg>
        <span className="h-px w-10" style={{ background: p.line }} />
      </div>
    </motion.div>
  );

  const sectionBlocks: Partial<Record<PartId, React.ReactNode>> = {
    story: (
      <section key="story" id="story" className="pt-16 pb-24 relative">
        <motion.div
          variants={stagger}
          {...inViewProps}
          className="max-w-3xl mx-auto px-6 text-center"
        >
          {heading(<E k="story.heading" />)}
          {/* The pressed page: story mounted like a specimen sheet */}
          <motion.div
            variants={fadeUp}
            className="relative px-7 py-10 sm:px-12 sm:py-12 mx-auto"
            style={{
              background: p.surface,
              border: `1px solid ${p.line}`,
              boxShadow: '0 18px 40px -28px rgba(50,60,40,0.35)',
            }}
          >
            <BranchSketch
              color={`color-mix(in srgb, ${p.accent} 70%, ${p.inkSoft})`}
              reduced={reduced}
              className="absolute -top-8 -left-6 opacity-60"
            />
            <BranchSketch
              color={`color-mix(in srgb, ${p.accent} 70%, ${p.inkSoft})`}
              reduced={reduced}
              delay={0.4}
              className="absolute -bottom-8 -right-6 rotate-180 opacity-60"
            />
            <p
              className="font-serif-display text-xl leading-loose whitespace-pre-line"
              style={{ color: p.inkSoft }}
            >
              <EditableContent field="story" value={data.story} multiline />
            </p>
          </motion.div>

          <div className="flex justify-center items-end gap-8 sm:gap-16 mt-16">
            <Cameo
              photo={data.galleryImages[1]?.url ?? null}
              name={data.brideName}
              palette={p}
              reduced={reduced}
            />
            <span className="font-script text-4xl pb-10" style={{ color: p.accent }} aria-hidden>
              &amp;
            </span>
            <Cameo
              photo={data.galleryImages[2]?.url ?? null}
              name={data.groomName}
              palette={p}
              reduced={reduced}
            />
          </div>
        </motion.div>
      </section>
    ),

    events: showEvents ? (
      <section key="events" id="events" className="relative" style={{ background: p.surface }}>
        <WaveEdge fill={p.bg} flip />
        <div className="py-20 max-w-3xl mx-auto px-6">
          <motion.div variants={stagger} {...inViewProps}>
            {heading(<E k="events.heading" />)}
          </motion.div>
          <div className="flex flex-col">
            {data.events.map((event, i) => {
              const directions = directionsUrl(event.venue);
              const leafRadius = i % 2 ? '12px 56px 12px 56px' : '56px 12px 56px 12px';
              return (
                <div key={event.id}>
                  {i > 0 && (
                    <StemConnector
                      color={`color-mix(in srgb, ${p.accent} 75%, ${p.inkSoft})`}
                      mirror={i % 2 === 0}
                      reduced={reduced}
                    />
                  )}
                  <motion.div
                    variants={fadeUp}
                    {...inViewProps}
                    className={`w-full max-w-md p-8 text-center ${i % 2 ? 'self-end ml-auto' : 'self-start mr-auto'}`}
                    style={{
                      background: p.bg,
                      border: `1px solid ${p.line}`,
                      borderRadius: leafRadius,
                      boxShadow: '0 16px 36px -28px rgba(50,60,40,0.4)',
                    }}
                  >
                    <p
                      className="text-xs uppercase mb-2"
                      style={{ color: p.accent, letterSpacing: '0.2em' }}
                    >
                      {formatEventDate(event.date, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                      {' · '}
                      {formatEventTime(event.start_time)}
                    </p>
                    <h3
                      className="font-serif-display italic text-3xl mb-2"
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
                    <div className="mt-4 flex justify-center gap-6 text-sm">
                      <a
                        href={calendarUrl(event, coupleNames)}
                        download={icsFileName(event.name)}
                        className="hover:opacity-70 underline underline-offset-4"
                        style={{ color: p.primary }}
                      >
                        <SharedE k="events.addToCalendar" />
                      </a>
                      {directions && (
                        <a
                          href={directions}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:opacity-70 underline underline-offset-4"
                          style={{ color: p.primary }}
                        >
                          <SharedE k="events.directions" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
        <WaveEdge fill={p.bg} />
      </section>
    ) : null,

    rsvp: (
      <section
        key="rsvp"
        id="rsvp"
        className="py-24 relative overflow-hidden"
        style={{ background: p.heroGradient }}
      >
        <PetalDrift color={p.accent} />
        <motion.div variants={stagger} {...inViewProps} className="relative max-w-2xl mx-auto px-6">
          <motion.h2
            variants={fadeUp}
            className="font-serif-display italic text-4xl sm:text-5xl text-center mb-3"
            style={{ color: p.onHero }}
          >
            <E k="rsvp.heading" />
          </motion.h2>
          <motion.p variants={fadeUp} className="text-center mb-10" style={{ color: p.onHeroSoft }}>
            <E k="rsvp.subheading" />
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="p-4 sm:p-6"
            style={{
              border: `1px solid color-mix(in srgb, ${p.onHeroSoft} 50%, transparent)`,
              borderRadius: '160px 160px 24px 24px',
              paddingTop: '2.5rem',
            }}
          >
            <RsvpForm slug={data.slug} preview={data.preview} />
          </motion.div>
        </motion.div>
      </section>
    ),

    gallery: showGallery ? (
      <section key="gallery" id="gallery" className="py-24 relative overflow-hidden">
        {/* One petal keeps falling across the grid — the gallery stays "outside" */}
        {!reduced && (
          <motion.div
            aria-hidden
            className="absolute pointer-events-none"
            style={{
              width: 13,
              height: 18,
              background: p.accent,
              borderRadius: '50% 0 50% 50%',
              top: 0,
              left: '12%',
            }}
            animate={{
              x: [0, 140, 60, 220],
              y: [0, 320, 640, 980],
              rotate: [0, 150, 270, 430],
              opacity: [0, 0.5, 0.5, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
          />
        )}
        <motion.div variants={stagger} {...inViewProps} className="max-w-4xl mx-auto px-6">
          {heading(<E k="gallery.heading" />)}
          {data.gallerySubtitle && (
            <motion.p
              variants={fadeUp}
              className="text-center -mt-6 mb-10 font-serif-display italic text-lg"
              style={{ color: p.inkSoft }}
            >
              {data.gallerySubtitle}
            </motion.p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {data.galleryImages.map((image, i) => {
              const arch = i % 2 === 0;
              const tilt = [-1.6, 1.2, -0.8, 1.8][i % 4] ?? 0;
              return (
                <motion.button
                  key={image.url}
                  variants={fadeUp}
                  onClick={() => setLightboxIndex(i)}
                  className="relative group"
                  style={{ rotate: reduced ? 0 : `${tilt}deg` }}
                >
                  {/* Washi tape pins the specimen to the page */}
                  <span
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-16 h-5 z-10 -rotate-3"
                    style={{
                      background: `color-mix(in srgb, ${p.accent} 35%, ${p.surface})`,
                      opacity: 0.85,
                    }}
                    aria-hidden
                  />
                  <span
                    className="block overflow-hidden"
                    style={{
                      borderRadius: arch ? '999px 999px 20px 20px' : '20px',
                      aspectRatio: '4 / 5',
                      border: `6px solid ${p.surface}`,
                      boxShadow: '0 14px 30px -18px rgba(50,60,40,0.45)',
                    }}
                  >
                    <img
                      src={image.url}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </span>
                </motion.button>
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

      {/* Hero */}
      {showHero && (
      <section
        ref={heroRef}
        className="min-h-screen flex items-center justify-center pt-14 px-6 relative overflow-hidden"
        style={{ background: p.heroGradient }}
      >
        {/* Nav — transparent, lives inside the hero rather than as a separate chrome bar */}
        {anyEnabled && (
        <nav className="absolute top-0 left-0 right-0 z-20">
          <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-center gap-7">
            <a href={`/${data.slug}`} className="font-script text-xl" style={{ color: p.onHero }}>
              {data.brideName[0]} &amp; {data.groomName[0]}
            </a>
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
                  className="hidden sm:block text-sm hover:opacity-60"
                  style={{ color: p.onHeroSoft }}
                >
                  {SECTION_LABELS[s.id]}
                </a>
              ))}
            {invitePage && (
              <Link
                to={`/${data.slug}/${invitePage.pageSlug}`}
                className="hidden sm:block text-sm hover:opacity-60"
                style={{ color: p.onHero }}
              >
                {invitePage.title}
              </Link>
            )}
            {data.authed && (
              <Link
                to={`/${data.slug}/dashboard`}
                className="text-sm hover:opacity-60"
                style={{ color: p.onHero }}
              >
                Dashboard
              </Link>
            )}
          </div>
        </nav>
        )}
        {show3d ? (
          <Suspense fallback={null}>
            <BotanicalHeroScene palette={p} progress={heroProgress} className="absolute inset-0" />
          </Suspense>
        ) : (
          <>
            <PetalDrift color={p.accent} />
            {/* Flat arch outline — the pre-3D motif, kept as the fallback */}
            <div
              className="absolute z-0 pointer-events-none hidden sm:block left-1/2 top-1/2"
              style={{
                width: 'min(360px, 70vw)',
                height: 'min(480px, 84vh)',
                transform: 'translate(-50%, -50%)',
                border: `1px solid color-mix(in srgb, ${p.onHeroSoft} 45%, transparent)`,
                borderRadius: '999px 999px 12px 12px',
              }}
              aria-hidden
            />
          </>
        )}
        {/* Hand-sketched branches grow in from opposite corners */}
        <BranchSketch
          color={`color-mix(in srgb, ${p.onHeroSoft} 85%, transparent)`}
          reduced={reduced}
          className="absolute top-16 left-3 sm:top-20 sm:left-10 z-10 pointer-events-none"
        />
        <BranchSketch
          color={`color-mix(in srgb, ${p.onHeroSoft} 85%, transparent)`}
          reduced={reduced}
          delay={0.6}
          className="absolute bottom-6 right-3 sm:bottom-12 sm:right-10 rotate-180 z-10 pointer-events-none"
        />
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="text-center py-20 relative z-10"
          {...(show3d ? { style: { y: namesY } } : {})}
        >
          <motion.p
            variants={fadeUp}
            className="text-xs uppercase mb-6"
            style={{ color: p.onHeroSoft, letterSpacing: '0.3em' }}
          >
            <E k="hero.kicker" />
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="font-serif-display italic leading-tight mb-2"
            style={{ color: p.onHero, fontSize: 'clamp(2.8rem, 8vw, 5.5rem)' }}
          >
            <EditableContent field="brideName" value={data.brideName} />
          </motion.h1>
          <motion.p variants={fadeUp} className="font-script text-4xl my-1" style={{ color: p.onHeroSoft }}>
            &amp;
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="font-serif-display italic leading-tight mb-6"
            style={{ color: p.onHero, fontSize: 'clamp(2.8rem, 8vw, 5.5rem)' }}
          >
            <EditableContent field="groomName" value={data.groomName} />
          </motion.h1>
          {data.tagline && (
            <motion.p
              variants={fadeUp}
              className="font-serif-display text-lg mb-6"
              style={{ color: p.onHeroSoft }}
            >
              <EditableContent field="tagline" value={data.tagline} multiline />
            </motion.p>
          )}
          {data.weddingDate && (
            <motion.p
              variants={fadeUp}
              className="text-sm uppercase mb-10"
              style={{ color: p.onHero, letterSpacing: '0.18em' }}
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
            <motion.div variants={fadeUp} className="flex justify-center gap-1 sm:gap-3 md:gap-6 mb-10 flex-wrap px-2 sm:px-0 w-full overflow-hidden">
              {[
                { value: countdown.days, k: 'countdown.days' as const },
                { value: countdown.hours, k: 'countdown.hours' as const },
                { value: countdown.minutes, k: 'countdown.minutes' as const },
              ].map((item) => (
                <div key={item.k} className="text-center min-w-0">
                  <TickerDigit
                    value={item.value}
                    pad={1}
                    className="font-serif-display"
                    style={{ fontSize: 'clamp(20px, 5vw, 48px)', color: p.onHero }}
                  />
                  <p
                    className="uppercase"
                    style={{ fontSize: 'clamp(8px, 2vw, 12px)', color: p.onHeroSoft, letterSpacing: '0.14em' }}
                  >
                    <E k={item.k} />
                  </p>
                </div>
              ))}
            </motion.div>
          )}
          {hasSection('rsvp') && (
            <motion.a
              variants={fadeUp}
              href="#rsvp"
              className="inline-block px-9 py-3.5 rounded-full text-sm font-semibold"
              style={{ background: p.accent, color: p.onAccent }}
            >
              <E k="hero.rsvpCta" />
            </motion.a>
          )}
        </motion.div>
      </section>
      )}

      {enabled.map((s) => sectionBlocks[s.id])}

      {/* Footer */}
      {anyEnabled && (
      <footer className="relative" style={{ background: p.surface }}>
        <WaveEdge fill={p.bg} flip />
        <div className="py-12 text-center">
          <p className="font-script text-3xl mb-2" style={{ color: p.primary }}>
            {coupleNames}
          </p>
          <p className="text-sm" style={{ color: p.inkSoft }}>
            <E k="footer.note" />
          </p>
        </div>
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
