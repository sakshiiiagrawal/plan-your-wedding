import SiteImage from '../SiteImage';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import Confetti from 'react-confetti';
import type { PartId, TemplateProps } from '../types';
import { SECTION_LABELS } from '../config';
import { SharedE } from '../copy/shared';
import { FIESTA_COPY } from '../copy/templates/fiesta';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { useCountdown } from '../useCountdown';
import { motionPreset } from '../motion';
import { FIESTA_EFFECTS, resolveEffects, SiteEffectsContext } from '../effects/schema';
import { hoverPreset } from '../effects/hover';
import { siteVars } from '../theme';
import RsvpForm from '../RsvpForm';
import Lightbox from '../Lightbox';
import ScrollProgress from '../effects/ScrollProgress';
import TickerDigit from '../effects/TickerDigit';
import MusicPlayer from '../effects/MusicPlayer';

const { E } = makeEditable('fiesta', FIESTA_COPY);

/** A hanging marigold garland (toran) — the festive signature. Beads dip in a
 *  gentle swag and sway softly. Colors pull from the palette + warm festival hues. */
function Garland({ accent, primary }: { accent: string; primary: string }) {
  const beads = Array.from({ length: 21 }, (_, i) => i);
  const hues = [accent, primary, '#FF8F00', '#E8570D'];
  return (
    <div className="flex justify-center items-start gap-[6px] sm:gap-2 w-full overflow-hidden px-2" aria-hidden>
      {beads.map((i) => {
        // Parabolic swag: middle beads hang lowest
        const t = (i - (beads.length - 1) / 2) / ((beads.length - 1) / 2);
        const dip = (1 - t * t) * 22;
        const size = 8 + ((i % 3) * 3);
        return (
          <motion.span
            key={i}
            style={{
              display: 'block',
              width: size,
              height: size,
              borderRadius: '50%',
              marginTop: dip,
              background: `radial-gradient(circle at 35% 30%, #fff6, ${hues[i % hues.length]})`,
              boxShadow: `0 0 0 2px color-mix(in srgb, ${hues[i % hues.length]} 55%, transparent)`,
            }}
            animate={{ y: [0, 3, 0] }}
            transition={{ duration: 2.4 + (i % 4) * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.05 }}
          />
        );
      })}
    </div>
  );
}

/** The great mandala — a line-drawn chakra slowly turning behind the names. */
function Mandala({ color, reduced }: { color: string; reduced: boolean }) {
  const petals = Array.from({ length: 16 }, (_, i) => i * 22.5);
  const inner = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className="absolute left-1/2 top-1/2 pointer-events-none"
      style={{
        width: 'min(88vw, 620px)',
        height: 'min(88vw, 620px)',
        x: '-50%',
        y: '-50%',
        opacity: 0.28,
      }}
      {...(reduced ? {} : { animate: { rotate: 360 }, transition: { duration: 90, repeat: Infinity, ease: 'linear' } })}
      aria-hidden
    >
      <circle cx="100" cy="100" r="96" fill="none" stroke={color} strokeWidth="0.5" />
      <circle cx="100" cy="100" r="88" fill="none" stroke={color} strokeWidth="0.35" strokeDasharray="2 4" />
      <circle cx="100" cy="100" r="58" fill="none" stroke={color} strokeWidth="0.5" />
      <circle cx="100" cy="100" r="30" fill="none" stroke={color} strokeWidth="0.35" />
      {petals.map((deg) => (
        <path
          key={`p${deg}`}
          d="M100,12 C108,30 108,44 100,58 C92,44 92,30 100,12"
          fill="none"
          stroke={color}
          strokeWidth="0.5"
          transform={`rotate(${deg} 100 100)`}
        />
      ))}
      {inner.map((deg) => (
        <path
          key={`i${deg}`}
          d="M100,64 C105,75 105,84 100,92 C95,84 95,75 100,64"
          fill="none"
          stroke={color}
          strokeWidth="0.4"
          transform={`rotate(${deg + 11} 100 100)`}
        />
      ))}
      {inner.map((deg) => (
        <circle
          key={`d${deg}`}
          cx="100"
          cy="36"
          r="1.6"
          fill={color}
          transform={`rotate(${deg} 100 100)`}
        />
      ))}
    </motion.svg>
  );
}

/** Scalloped shamiana edge — the tent border between sections. */
function ScallopEdge({ fill, up = false }: { fill: string; up?: boolean }) {
  return (
    <div
      className="w-full h-3.5"
      style={{
        background: `radial-gradient(circle at 12px ${up ? '14px' : '0px'}, ${fill} 11px, transparent 11.5px)`,
        backgroundSize: '24px 14px',
        backgroundRepeat: 'repeat-x',
      }}
      aria-hidden
    />
  );
}

/** Triangular bunting strung across the hero, palette-tinted. */
function Bunting({ colors }: { colors: string[] }) {
  const flags = Array.from({ length: 14 }, (_, i) => i);
  return (
    <svg viewBox="0 0 700 46" className="w-full h-9" preserveAspectRatio="none" aria-hidden>
      <path d="M0,6 Q350,26 700,6" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      {flags.map((i) => {
        const x = 14 + i * 48;
        const t = (i - 6.5) / 6.5;
        const y = 8 + (1 - t * t * 0.4) * 8;
        return (
          <path
            key={i}
            d={`M${x},${y} L${x + 34},${y} L${x + 17},${y + 30} Z`}
            fill={colors[i % colors.length]}
            opacity="0.9"
          />
        );
      })}
    </svg>
  );
}

/** The rotated rubber-stamp badge on each ticket. */
function Stamp({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="inline-flex items-center justify-center text-center uppercase font-semibold -rotate-6 px-3 py-2 rounded-full"
      style={{
        fontSize: 9,
        letterSpacing: '0.18em',
        color,
        border: `1.5px dashed ${color}`,
        opacity: 0.9,
        maxWidth: 110,
      }}
    >
      {text}
    </span>
  );
}

/**
 * "Shaadi Fiesta" — reimagined as The Mela: a festival poster, not a webpage.
 * A line-drawn mandala turns slowly behind the names under bunting and a
 * marigold garland, sections meet on scalloped shamiana edges, and each event
 * is a perforated mela ticket with a rubber-stamp badge. Confetti on arrival.
 */
export default function Fiesta({ data }: TemplateProps) {
  const p = data.palette;
  const countdown = useCountdown(data.weddingDate);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Effect controls: confetti gates the arrival burst, mandala picks the
  // chakra's mode, scrollAnim shadows the motion imports, galleryHover the
  // pinned prints.
  const fx = resolveEffects(FIESTA_EFFECTS, data.effects);
  const { fadeUp, scaleIn, stagger, inViewProps } = motionPreset(fx.scrollAnim!);
  const galleryHover = hoverPreset(fx.galleryHover!);

  // Client-only app: the window is measurable on first render, so the burst
  // can start immediately — the effect only schedules its end.
  const [confetti, setConfetti] = useState(fx.confetti === 'burst');
  const [size] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const reduced = useReducedMotion() ?? false;

  // Re-runs when the Studio pick changes, so toggling "Burst" replays it live.
  useEffect(() => {
    if (fx.confetti !== 'burst') {
      setConfetti(false);
      return;
    }
    setConfetti(true);
    const t = setTimeout(() => setConfetti(false), 4500);
    return () => clearTimeout(t);
  }, [fx.confetti]);

  const coupleNames = `${data.brideName} & ${data.groomName}`;
  const enabled = data.sections.filter((s) => s.enabled);
  const hasSection = (id: PartId) => enabled.some((s) => s.id === id);
  const showHero = hasSection('hero');
  const anyEnabled = enabled.length > 0;
  const showGallery = hasSection('gallery') && data.galleryImages.length > 0;
  const showEvents = hasSection('events') && data.events.length > 0;
  const invitePage = data.pages.find((pg) => pg.kind === 'invite');

  const vars = siteVars(p);

  // Festive tinted band — lively section rhythm without leaving the palette.
  const band = (weight: number) =>
    `color-mix(in srgb, ${p.accent} ${weight}%, ${p.bg})`;

  const festiveHues = [p.accent, '#FF8F00', '#E8570D', p.primary];

  return (
    <SiteEffectsContext.Provider value={fx}>
    <div style={{ ...vars, background: p.bg, color: p.ink }} className="min-h-screen font-body relative">
      <ScrollProgress color={p.accent} />
      {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}
      {confetti && !reduced && size.width > 0 && (
        <Confetti width={size.width} height={size.height} numberOfPieces={220} recycle={false} colors={[p.accent, p.primary, '#FF8F00', '#E91E63']} />
      )}

      <div
        className="fixed top-0 left-0 right-0 h-2 z-40"
        style={{ background: `repeating-linear-gradient(90deg, ${p.accent} 0 10px, ${p.primary} 10px 20px)` }}
      />

      {showHero && (
      <section className="min-h-screen flex flex-col items-center justify-center text-center pt-16 px-6 relative overflow-hidden" style={{ background: p.heroGradient }}>
        {/* Nav — transparent, lives inside the hero rather than as a separate chrome bar */}
        {anyEnabled && (
        <nav className="absolute top-2 left-0 right-0 z-20">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href={data.homePath} className="font-script text-2xl" style={{ color: p.onHero }}>
              {data.brideName[0]}&amp;{data.groomName[0]}
            </a>
            <div className="flex items-center gap-6">
              {invitePage && (
                <Link to={data.pagePath(invitePage.pageSlug)} className="hidden sm:block text-xs uppercase hover:opacity-60" style={{ color: p.onHero, letterSpacing: '0.14em' }}>
                  {invitePage.title}
                </Link>
              )}
              {data.authed && (
                <Link to={data.pagePath('dashboard')} className="text-xs uppercase hover:opacity-60" style={{ color: p.onHeroSoft, letterSpacing: '0.14em' }}>
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </nav>
        )}
        {/* Bunting + garland strung across the top of the shamiana */}
        <div className="absolute top-14 left-0 right-0 z-10">
          <Bunting colors={festiveHues} />
          <div className="-mt-2">
            <Garland accent={p.accent} primary={p.onHeroSoft} />
          </div>
        </div>
        {fx.mandala !== 'hidden' && (
          <Mandala color={p.onHeroSoft} reduced={reduced || fx.mandala === 'still'} />
        )}
        <motion.div variants={stagger} initial="hidden" animate="visible" className="relative z-10 pt-14">
          <motion.p variants={fadeUp} className="text-xs uppercase mb-6" style={{ color: p.onHeroSoft, letterSpacing: '0.3em' }}>
            <E k="hero.kicker" />
          </motion.p>
          <motion.h1 variants={fadeUp} className="font-script leading-tight" style={{ color: p.onHero, fontSize: 'clamp(3.6rem, 10vw, 7rem)' }}>
            <EditableContent field="brideName" value={data.brideName} />
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="uppercase my-2 flex items-center justify-center gap-4"
            style={{ color: p.onHeroSoft, fontSize: 12, letterSpacing: '0.5em' }}
          >
            <span aria-hidden>❁</span> <E k="hero.weds" /> <span aria-hidden>❁</span>
          </motion.p>
          <motion.h1 variants={fadeUp} className="font-script leading-tight mb-6" style={{ color: p.onHero, fontSize: 'clamp(3.6rem, 10vw, 7rem)' }}>
            <EditableContent field="groomName" value={data.groomName} />
          </motion.h1>
          {data.tagline && (
            <motion.p variants={fadeUp} className="italic text-lg mb-4" style={{ color: p.onHeroSoft }}>
              <EditableContent field="tagline" value={data.tagline} multiline />
            </motion.p>
          )}
          {data.weddingDate && (
            <motion.p variants={fadeUp} className="text-sm uppercase mb-8" style={{ color: p.onHero, letterSpacing: '0.22em' }}>
              {data.weddingDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
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
            <section key="story" id="story" style={{ background: band(7) }}>
              <ScallopEdge fill={p.bg} />
              <div className="py-20 text-center max-w-2xl mx-auto px-6">
                <p className="text-xs uppercase mb-2" style={{ color: p.accent, letterSpacing: '0.25em' }}>
                  {SECTION_LABELS.story}
                </p>
                <p className="font-script text-3xl mb-8" style={{ color: p.primary }} aria-hidden>
                  ❁
                </p>
                <motion.p variants={fadeUp} {...inViewProps} className="font-serif-display text-xl leading-relaxed whitespace-pre-line" style={{ color: p.inkSoft }}>
                  <EditableContent field="story" value={data.story} multiline />
                </motion.p>
              </div>
              <ScallopEdge fill={p.bg} up />
            </section>
          );
        }
        if (s.id === 'events' && showEvents) {
          return (
            <section key="events" id="events" className="py-24">
              <div className="max-w-3xl mx-auto px-6">
                <p className="text-xs uppercase mb-3 text-center" style={{ color: p.accent, letterSpacing: '0.25em' }}>
                  {SECTION_LABELS.events}
                </p>
                <h2 className="font-script text-4xl sm:text-5xl mb-12 text-center" style={{ color: p.primary }}>
                  <E k="events.heading" />
                </h2>
                <motion.div variants={stagger} {...inViewProps} className="space-y-8">
                  {data.events.map((event, i) => {
                    const directions = directionsUrl(event.venue);
                    const tint = event.color ?? festiveHues[i % festiveHues.length]!;
                    return (
                      <motion.div
                        key={event.id}
                        variants={fadeUp}
                        className="relative grid grid-cols-[84px_1fr] sm:grid-cols-[110px_1fr] rounded-2xl overflow-hidden"
                        style={{
                          background: p.surface,
                          border: `2px solid ${tint}`,
                          transform: reduced ? undefined : `rotate(${i % 2 ? 0.8 : -0.8}deg)`,
                          boxShadow: '0 14px 30px -16px rgba(0,0,0,0.3)',
                        }}
                      >
                        {/* Ticket stub, torn off along the perforation */}
                        <div
                          className="relative flex flex-col items-center justify-center gap-2 py-6"
                          style={{
                            background: `color-mix(in srgb, ${tint} 12%, ${p.surface})`,
                            borderRight: `2px dashed color-mix(in srgb, ${tint} 55%, transparent)`,
                          }}
                        >
                          <span
                            className="absolute -top-3 right-0 translate-x-1/2 w-6 h-6 rounded-full"
                            style={{ background: p.bg, border: `2px solid ${tint}` }}
                            aria-hidden
                          />
                          <span
                            className="absolute -bottom-3 right-0 translate-x-1/2 w-6 h-6 rounded-full"
                            style={{ background: p.bg, border: `2px solid ${tint}` }}
                            aria-hidden
                          />
                          <p
                            className="uppercase font-semibold"
                            style={{
                              writingMode: 'vertical-rl',
                              fontSize: 10,
                              letterSpacing: '0.3em',
                              color: tint,
                            }}
                          >
                            <E k="events.admit" />
                          </p>
                          <p className="font-mono text-[10px]" style={{ color: p.inkSoft }}>
                            № {String(i + 1).padStart(2, '0')}
                          </p>
                        </div>
                        <div className="p-6 text-left">
                          <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
                            <h3 className="font-script text-3xl sm:text-4xl" style={{ color: tint }}>
                              {event.name}
                            </h3>
                            {event.event_type && <Stamp text={event.event_type} color={tint} />}
                          </div>
                          <p className="text-sm font-medium mb-0.5" style={{ color: p.ink }}>
                            {formatEventDate(event.date)} · {formatEventTime(event.start_time)}
                          </p>
                          {event.venue && (
                            <p className="text-sm mb-1" style={{ color: p.inkSoft }}>
                              {event.venue.name}
                              {event.venue.city ? `, ${event.venue.city}` : ''}
                            </p>
                          )}
                          {event.description && (
                            <p className="text-sm mb-1 italic" style={{ color: p.inkSoft }}>
                              {event.description}
                            </p>
                          )}
                          {event.dress_code && (
                            <p className="text-xs uppercase mt-2" style={{ color: p.inkSoft, letterSpacing: '0.12em' }}>
                              <SharedE k="events.dressCode" /> {event.dress_code}
                            </p>
                          )}
                          <div className="mt-4 flex gap-4 text-xs font-semibold uppercase" style={{ letterSpacing: '0.08em' }}>
                            <a href={calendarUrl(event, coupleNames)} download={icsFileName(event.name)} className="underline underline-offset-4" style={{ color: tint }}>
                              <SharedE k="events.addToCalendar" />
                            </a>
                            {directions && (
                              <a href={directions} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4" style={{ color: tint }}>
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
        if (s.id === 'gallery' && showGallery) {
          return (
            <section key="gallery" id="gallery" style={{ background: band(5) }}>
              <ScallopEdge fill={p.bg} />
              <div className="py-20 max-w-5xl mx-auto px-6">
                <p className="text-xs uppercase mb-10 text-center" style={{ color: p.accent, letterSpacing: '0.25em' }}>
                  {data.gallerySubtitle || SECTION_LABELS.gallery}
                </p>
                <motion.div variants={stagger} {...inViewProps} className="flex flex-wrap justify-center gap-6">
                  {data.galleryImages.map((image, i) => {
                    const tilt = [-2.4, 1.8, -1.2, 2.6][i % 4] ?? 0;
                    return (
                      <motion.button
                        key={image.url}
                        variants={scaleIn}
                        onClick={() => setLightboxIndex(i)}
                        className="group block overflow-hidden"
                        {...(reduced ? {} : galleryHover.wrap)}
                        style={{
                          rotate: reduced ? 0 : `${tilt}deg`,
                          width: 'min(42vw, 220px)',
                          aspectRatio: '3 / 4',
                          border: `6px solid ${p.surface}`,
                          outline: `2px solid ${festiveHues[i % festiveHues.length]}`,
                          boxShadow: '0 14px 28px -14px rgba(0,0,0,0.35)',
                        }}
                      >
                        <SiteImage
                          src={image.url}
                          alt=""
                          loading="lazy"
                          className={`w-full h-full object-cover ${galleryHover.imgClass}`}
                        />
                      </motion.button>
                    );
                  })}
                </motion.div>
              </div>
              <ScallopEdge fill={p.bg} up />
            </section>
          );
        }
        if (s.id === 'rsvp') {
          return (
            <section key="rsvp" id="rsvp" className="py-24">
              <div className="max-w-xl mx-auto px-6 text-center">
                <p className="text-xs uppercase mb-6" style={{ color: p.accent, letterSpacing: '0.25em' }}>
                  {SECTION_LABELS.rsvp}
                </p>
                <h2 className="font-script text-4xl mb-8" style={{ color: p.primary }}>
                  <E k="rsvp.heading" />
                </h2>
                <div
                  className="p-4 sm:p-6 rounded-3xl"
                  style={{ border: `2px dashed color-mix(in srgb, ${p.accent} 60%, transparent)` }}
                >
                  <RsvpForm slug={data.slug} preview={data.preview} />
                </div>
              </div>
            </section>
          );
        }
        return null;
      })}

      {anyEnabled && (
      <footer className="border-t text-center" style={{ borderColor: p.line, background: band(7) }}>
        <div className="py-14">
          <p className="font-script text-3xl mb-2" style={{ color: p.primary }}>
            {coupleNames}
          </p>
          {data.weddingDate && (
            <p className="text-xs uppercase" style={{ color: p.inkSoft, letterSpacing: '0.14em' }}>
              {data.weddingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </footer>
      )}

      {lightboxIndex !== null && (
        <Lightbox images={data.galleryImages} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNavigate={setLightboxIndex} />
      )}
    </div>
    </SiteEffectsContext.Provider>
  );
}
