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
import { siteVars, heroShimmer, heroIsDark } from '../theme';
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
      Array.from({ length: 34 }, (_, i) => ({
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
      {/* A shooting star crosses the sky every little while */}
      <motion.div
        initial={{ x: '-10vw', y: '8vh', opacity: 0 }}
        animate={{ x: '110vw', y: '32vh', opacity: [0, 0.9, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 7, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          width: 90,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${color})`,
          rotate: '12deg',
        }}
      />
    </div>
  );
}

/**
 * The template's signature: the couple drawn as a constellation. Seven stars
 * connected by a hairline that traces itself on load; the two brightest carry
 * the couple's initials.
 */
function Constellation({ a, b, color, reduced }: { a: string; b: string; color: string; reduced: boolean }) {
  const pts: [number, number][] = [
    [12, 62],
    [64, 30],
    [112, 46],
    [160, 14],
    [208, 42],
    [256, 24],
    [308, 58],
  ];
  const d = `M ${pts.map(([x, y]) => `${x},${y}`).join(' L ')}`;
  return (
    <svg viewBox="0 0 320 84" className="w-64 sm:w-80 mx-auto mb-10 overflow-visible" aria-hidden>
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="0.75"
        opacity="0.55"
        {...(reduced
          ? {}
          : { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 2.4, ease: 'easeInOut', delay: 0.4 } })}
      />
      {pts.map(([x, y], i) => {
        const bright = i === 1 || i === 5;
        return (
          <motion.g
            key={i}
            {...(reduced
              ? {}
              : {
                  initial: { opacity: 0 },
                  animate: { opacity: 1 },
                  transition: { delay: 0.4 + i * 0.3, duration: 0.6 },
                })}
          >
            <circle cx={x} cy={y} r={bright ? 3 : 1.6} fill={color} />
            {bright && (
              <>
                <circle cx={x} cy={y} r={7} fill="none" stroke={color} strokeWidth="0.5" opacity="0.5" />
                <text
                  x={x}
                  y={y - 12}
                  textAnchor="middle"
                  fill={color}
                  style={{ font: 'italic 11px "Cormorant Garamond", serif', letterSpacing: '0.1em' }}
                >
                  {i === 1 ? a : b}
                </text>
              </>
            )}
          </motion.g>
        );
      })}
    </svg>
  );
}

/** A countdown unit as an orbital dial — a ring that fills with the value. */
function OrbitalDial({
  value,
  max,
  label,
  ink,
  inkSoft,
}: {
  value: number;
  max: number;
  label: React.ReactNode;
  ink: string;
  inkSoft: string;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const frac = Math.min(Math.max(value / max, 0), 1);
  return (
    <div className="flex flex-col items-center gap-2 min-w-0">
      <div className="relative w-[74px] h-[74px] sm:w-[92px] sm:h-[92px]">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke={inkSoft} strokeOpacity="0.25" strokeWidth="1" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={inkSoft}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - frac)}
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <TickerDigit
            value={value}
            className="font-serif-display"
            style={{ fontSize: 'clamp(20px, 4vw, 28px)', color: ink }}
          />
        </div>
      </div>
      <p className="uppercase" style={{ fontSize: 9, color: inkSoft, letterSpacing: '0.3em' }}>
        {label}
      </p>
    </div>
  );
}

/**
 * "Midnight Luxe" — reimagined as The Observatory: the couple written in the
 * stars. A constellation monogram traces itself over the hero, the countdown
 * runs on orbital dials, the events read as a night programme along a starlit
 * meridian, and the gallery hangs like telescope plates.
 */
export default function Midnight({ data }: TemplateProps) {
  const p = data.palette;
  const countdown = useCountdown(data.weddingDate);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const reduced = useReducedMotion() ?? false;

  const coupleNames = `${data.brideName} & ${data.groomName}`;
  const enabled = data.sections.filter((s) => s.enabled);
  const hasSection = (id: PartId) => enabled.some((s) => s.id === id);
  const showHero = hasSection('hero');
  const anyEnabled = enabled.length > 0;
  const showGallery = hasSection('gallery') && data.galleryImages.length > 0;
  const showEvents = hasSection('events') && data.events.length > 0;
  const invitePage = data.pages.find((pg) => pg.kind === 'invite');
  const darkHero = heroIsDark(p);

  // Names sweep between the palette's own on-hero tokens — always legible on
  // this template's hero gradient, whatever palette the couple picks.
  const shimmerColors = heroShimmer(p);

  const vars = siteVars(p);

  const heading = (text: React.ReactNode) => (
    <motion.div variants={fadeUp} className="text-center mb-14">
      <p
        className="text-xs uppercase flex items-center justify-center gap-4"
        style={{ color: p.inkSoft, letterSpacing: '0.35em' }}
      >
        <span className="h-px w-10" style={{ background: p.line }} />
        <span style={{ color: p.primary }}>✦</span>
        {text}
        <span style={{ color: p.primary }}>✦</span>
        <span className="h-px w-10" style={{ background: p.line }} />
      </p>
    </motion.div>
  );

  const sectionBlocks: Partial<Record<PartId, React.ReactNode>> = {
    story: (
      <section key="story" id="story" className="py-28">
        <motion.div variants={stagger} {...inViewProps} className="max-w-2xl mx-auto px-6">
          {heading(<E k="story.heading" />)}
          <motion.div variants={fadeUp}>
            <p
              className="font-serif-display text-xl sm:text-2xl leading-loose whitespace-pre-line first-letter:text-7xl first-letter:font-serif-display first-letter:float-left first-letter:leading-[0.8] first-letter:mr-3 first-letter:mt-1 first-letter:text-[color:var(--dropcap)]"
              style={{ color: p.ink, '--dropcap': p.primary } as React.CSSProperties}
            >
              <EditableContent field="story" value={data.story} multiline />
            </p>
          </motion.div>
          <motion.p variants={fadeUp} className="text-center mt-12 text-lg tracking-[0.6em]" style={{ color: p.primary }} aria-hidden>
            ✦ ✦ ✦
          </motion.p>
        </motion.div>
      </section>
    ),

    events: showEvents ? (
      <section key="events" id="events" className="py-28" style={{ background: p.surface }}>
        <motion.div variants={stagger} {...inViewProps} className="max-w-3xl mx-auto px-6">
          {heading(<E k="events.heading" />)}
          <div className="relative">
            {/* The meridian — a starlit line the whole evening hangs from */}
            <div
              className="absolute top-1 bottom-1 w-px hidden sm:block"
              style={{ left: 129, background: `linear-gradient(180deg, transparent, ${p.line} 12%, ${p.line} 88%, transparent)` }}
              aria-hidden
            />
            <div className="space-y-14">
              {data.events.map((event) => {
                const directions = directionsUrl(event.venue);
                return (
                  <motion.div
                    key={event.id}
                    variants={fadeUp}
                    className="relative sm:grid sm:grid-cols-[100px_60px_1fr] sm:items-baseline"
                  >
                    <p
                      className="font-serif-display text-lg sm:text-right"
                      style={{ color: p.primary }}
                    >
                      {formatEventTime(event.start_time)}
                    </p>
                    <div className="hidden sm:flex justify-center relative" aria-hidden>
                      <span
                        className="inline-block text-sm relative"
                        style={{ color: p.primary, top: 1, background: p.surface, padding: '0 6px' }}
                      >
                        ✦
                      </span>
                    </div>
                    <div className="mt-1 sm:mt-0">
                      <div className="flex flex-wrap items-baseline gap-x-4 mb-1">
                        <h3 className="font-serif-display text-3xl" style={{ color: p.ink }}>
                          {event.name}
                        </h3>
                        <p
                          className="text-xs uppercase"
                          style={{ color: p.inkSoft, letterSpacing: '0.16em' }}
                        >
                          {formatEventDate(event.date, { day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                      {event.venue && (
                        <p className="text-sm mb-1" style={{ color: p.inkSoft }}>
                          {event.venue.name}
                          {event.venue.city ? `, ${event.venue.city}` : ''}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-sm mb-1 font-serif-display italic" style={{ color: p.inkSoft }}>
                          {event.description}
                        </p>
                      )}
                      {event.dress_code && (
                        <p className="text-xs uppercase mt-2" style={{ color: p.inkSoft, letterSpacing: '0.14em' }}>
                          <E k="events.dressCode" /> {event.dress_code}
                        </p>
                      )}
                      <div className="mt-3 flex gap-6 text-xs uppercase" style={{ letterSpacing: '0.14em' }}>
                        <a
                          href={calendarUrl(event, coupleNames)}
                          download={icsFileName(event.name)}
                          className="hover:opacity-70 underline underline-offset-4 decoration-from-font"
                          style={{ color: p.primary }}
                        >
                          <SharedE k="events.addToCalendar" />
                        </a>
                        {directions && (
                          <a
                            href={directions}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:opacity-70 underline underline-offset-4 decoration-from-font"
                            style={{ color: p.primary }}
                          >
                            <E k="events.directions" />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </section>
    ) : null,

    rsvp: (
      <section key="rsvp" id="rsvp" className="py-28">
        <motion.div variants={stagger} {...inViewProps} className="max-w-2xl mx-auto px-6">
          {heading(SECTION_LABELS.rsvp)}
          <motion.p
            variants={fadeUp}
            className="font-serif-display text-2xl text-center mb-12"
            style={{ color: p.ink }}
          >
            <E k="rsvp.subheading" />
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="p-1.5"
            style={{ border: `1px solid ${p.line}` }}
          >
            <div className="p-5 sm:p-8" style={{ border: `1px solid ${p.line}` }}>
              <RsvpForm slug={data.slug} preview={data.preview} />
            </div>
          </motion.div>
        </motion.div>
      </section>
    ),

    gallery: showGallery ? (
      <section key="gallery" id="gallery" className="py-28" style={{ background: p.surface }}>
        <motion.div variants={stagger} {...inViewProps} className="max-w-5xl mx-auto px-6">
          {heading(<E k="gallery.heading" />)}
          {data.gallerySubtitle && (
            <motion.p
              variants={fadeUp}
              className="text-center -mt-8 mb-12 font-serif-display italic text-lg"
              style={{ color: p.inkSoft }}
            >
              {data.gallerySubtitle}
            </motion.p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[minmax(0,1fr)] grid-flow-dense gap-3">
            {data.galleryImages.map((image, i) => {
              const feature = i % 7 === 0;
              return (
                <motion.button
                  key={image.url}
                  variants={fadeUp}
                  onClick={() => setLightboxIndex(i)}
                  className={`overflow-hidden group relative ${feature ? 'col-span-2 row-span-2' : ''}`}
                  style={{ border: `1px solid ${p.line}`, aspectRatio: '1 / 1' }}
                >
                  <img
                    src={image.url}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.04] transition-all duration-700"
                  />
                  <span
                    className="absolute inset-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ border: `1px solid ${p.primary}` }}
                    aria-hidden
                  />
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
      <ScrollProgress color={p.primary} />
      {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}

      {/* Hero — the night sky the couple is written into */}
      {showHero && (
      <section
        className="min-h-screen flex items-center justify-center pt-14 px-6 relative overflow-hidden"
        style={{ background: p.heroGradient }}
      >
        {/* Nav — transparent, lives inside the hero rather than as a separate chrome bar */}
        {anyEnabled && (
        <nav className="absolute top-0 left-0 right-0 z-20">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <a
              href={`/${data.slug}`}
              className="font-serif-display text-lg tracking-widest uppercase"
              style={{ color: p.onHero }}
            >
              {data.brideName[0]} ✦ {data.groomName[0]}
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
                    style={{ color: p.onHeroSoft, letterSpacing: '0.16em' }}
                  >
                    {SECTION_LABELS[s.id]}
                  </a>
                ))}
              {invitePage && (
                <Link
                  to={`/${data.slug}/${invitePage.pageSlug}`}
                  className="hidden sm:block text-xs uppercase hover:opacity-60"
                  style={{ color: p.onHero, letterSpacing: '0.16em' }}
                >
                  {invitePage.title}
                </Link>
              )}
              {data.authed && (
                <Link
                  to={`/${data.slug}/dashboard`}
                  className="text-xs uppercase hover:opacity-60"
                  style={{ color: p.onHeroSoft, letterSpacing: '0.16em' }}
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </nav>
        )}
        <StarField color={p.onHeroSoft} />
        {darkHero && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.45) 100%)' }}
            aria-hidden
          />
        )}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="text-center py-20 relative z-10 mx-auto max-w-4xl w-full"
        >
          <motion.div variants={fadeUp}>
            <Constellation
              a={data.brideName[0] ?? ''}
              b={data.groomName[0] ?? ''}
              color={p.onHeroSoft}
              reduced={reduced}
            />
          </motion.div>
          <motion.p
            variants={fadeUp}
            className="text-xs uppercase mb-10"
            style={{ color: p.onHeroSoft, letterSpacing: '0.5em' }}
          >
            <E k="hero.kicker" />
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="font-serif-display uppercase leading-none mb-2"
            style={{ fontSize: 'clamp(2.6rem, 8vw, 6rem)', letterSpacing: '0.08em' }}
          >
            <ShimmerText colors={shimmerColors}>
              <EditableContent field="brideName" value={data.brideName} />
            </ShimmerText>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="font-script text-3xl sm:text-4xl my-3"
            style={{ color: p.onHeroSoft }}
          >
            and
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="font-serif-display uppercase leading-none mb-10"
            style={{ fontSize: 'clamp(2.6rem, 8vw, 6rem)', letterSpacing: '0.08em' }}
          >
            <ShimmerText colors={shimmerColors}>
              <EditableContent field="groomName" value={data.groomName} />
            </ShimmerText>
          </motion.h1>
          {data.tagline && (
            <motion.p
              variants={fadeUp}
              className="font-serif-display italic text-xl mb-10"
              style={{ color: p.onHeroSoft }}
            >
              <EditableContent field="tagline" value={data.tagline} multiline />
            </motion.p>
          )}
          {data.weddingDate && (
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-5 mb-14">
              <span className="h-px w-12 sm:w-20" style={{ background: `color-mix(in srgb, ${p.onHeroSoft} 55%, transparent)` }} />
              <p
                className="text-sm uppercase whitespace-nowrap"
                style={{ color: p.onHero, letterSpacing: '0.3em' }}
              >
                {data.weddingDate.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <span className="h-px w-12 sm:w-20" style={{ background: `color-mix(in srgb, ${p.onHeroSoft} 55%, transparent)` }} />
            </motion.div>
          )}
          {data.weddingDate && !countdown.past && (
            <motion.div variants={fadeUp} className="flex justify-center gap-4 sm:gap-10 mb-14 flex-wrap">
              <OrbitalDial value={countdown.days} max={365} label={<E k="countdown.days" />} ink={p.onHero} inkSoft={p.onHeroSoft} />
              <OrbitalDial value={countdown.hours} max={24} label={<E k="countdown.hours" />} ink={p.onHero} inkSoft={p.onHeroSoft} />
              <OrbitalDial value={countdown.minutes} max={60} label={<E k="countdown.minutes" />} ink={p.onHero} inkSoft={p.onHeroSoft} />
              <OrbitalDial value={countdown.seconds} max={60} label={<E k="countdown.seconds" />} ink={p.onHero} inkSoft={p.onHeroSoft} />
            </motion.div>
          )}
          <motion.div variants={fadeUp}>
            {hasSection('rsvp') && (
              <a
                href="#rsvp"
                className="inline-block px-12 py-4 text-xs font-semibold uppercase"
                style={{ background: p.accent, color: p.onAccent, letterSpacing: '0.28em' }}
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
      <footer className="py-20 text-center border-t" style={{ borderColor: p.line }}>
        <p className="text-lg mb-4" style={{ color: p.primary }} aria-hidden>
          ✦
        </p>
        <p
          className="font-serif-display text-xl uppercase mb-3"
          style={{ color: p.ink, letterSpacing: '0.22em' }}
        >
          {coupleNames}
        </p>
        {data.weddingDate && (
          <p className="text-xs uppercase mb-2" style={{ color: p.inkSoft, letterSpacing: '0.18em' }}>
            {data.weddingDate.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}
        <p className="font-serif-display italic text-sm" style={{ color: p.inkSoft }}>
          <E k="footer.note" />
        </p>
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
