import { lazy, Suspense, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { HiOutlineMenu, HiOutlineX } from 'react-icons/hi';
import type { PartId, TemplateProps } from '../types';
import { SECTION_LABELS } from '../config';
import { SharedE } from '../copy/shared';
import { CLASSIC_COPY } from '../copy/templates/classic';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { useCountdown } from '../useCountdown';
import { motionPreset } from '../motion';
import { CLASSIC_EFFECTS, resolveEffects, SiteEffectsContext } from '../effects/schema';
import { siteVars, heroShimmer } from '../theme';
import RsvpForm from '../RsvpForm';
import Lightbox from '../Lightbox';
import ShimmerText from '../effects/ShimmerText';
import ScrollProgress from '../effects/ScrollProgress';
import ScrollCue from '../effects/ScrollCue';
import TickerDigit from '../effects/TickerDigit';
import MusicPlayer from '../effects/MusicPlayer';
import GalleryGrid from '../effects/GalleryGrid';
import { ParallaxLayer } from '../effects/MouseParallax';
import { useMouseParallax } from '../effects/useMouseParallax';

const { E } = makeEditable('classic', CLASSIC_COPY);

// The three.js scene is its own chunk: first paint never waits on it, and the
// reduced-motion/print path never downloads it.
const ClassicHeroScene = lazy(() => import('./ClassicScene'));
const ClassicGoldVeil = lazy(() =>
  import('./ClassicScene').then((m) => ({ default: m.GoldVeil })),
);

/**
 * One corner of the ceremonial frame: an L of double hairlines, drawn on
 * like pen-work. Rotated per corner by the parent.
 */
function CornerFlourish({
  color,
  reduced,
  delay = 0,
  className = '',
}: {
  color: string;
  reduced: boolean;
  delay?: number;
  className?: string;
}) {
  const draw = (d: string, w: number, extraDelay = 0) => (
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
      {...(reduced
        ? {}
        : {
            initial: { pathLength: 0, opacity: 0 },
            animate: { pathLength: 1, opacity: 1 },
            transition: { duration: 1.6, delay: delay + extraDelay, ease: 'easeInOut' },
          })}
    />
  );
  return (
    <svg viewBox="0 0 100 100" className={`w-11 h-11 sm:w-20 sm:h-20 ${className}`} aria-hidden>
      {draw('M4,96 L4,30 Q4,4 30,4 L96,4', 1.5)}
      {draw('M12,96 L12,34 Q12,12 34,12 L96,12', 0.8, 0.25)}
    </svg>
  );
}

/** A gilded flourish rule — hairlines meeting a centre diamond, drawn on. */
function FlourishRule({ color, reduced }: { color: string; reduced: boolean }) {
  return (
    <svg viewBox="0 0 240 16" className="w-56 h-4 mx-auto overflow-visible" aria-hidden>
      {['M112,8 L8,8', 'M128,8 L232,8'].map((d) => (
        <motion.path
          key={d}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="1"
          {...(reduced
            ? {}
            : {
                initial: { pathLength: 0 },
                whileInView: { pathLength: 1 },
                viewport: { once: true },
                transition: { duration: 1.1, ease: 'easeOut' },
              })}
        />
      ))}
      <motion.g
        {...(reduced
          ? {}
          : {
              initial: { opacity: 0 },
              whileInView: { opacity: 1 },
              viewport: { once: true },
              transition: { duration: 0.5, delay: 0.7 },
            })}
      >
        <rect
          x="115.5"
          y="3.5"
          width="9"
          height="9"
          transform="rotate(45 120 8)"
          fill="none"
          stroke={color}
          strokeWidth="1.2"
        />
      </motion.g>
      <circle cx="8" cy="8" r="1.6" fill={color} />
      <circle cx="232" cy="8" r="1.6" fill={color} />
    </svg>
  );
}

/**
 * A story-portrait as a coin medallion: gold-rimmed disc that flips in on
 * scroll and tilts toward the cursor. The tilt is CSS 3D (springs), not a
 * per-card canvas — cheap enough to never matter.
 */
function Medallion({
  photo,
  name,
  tint,
  textColor,
  accent,
  reduced,
  still = false,
  size = 'w-44 h-44 sm:w-52 sm:h-52',
}: {
  photo: string | null;
  name: string;
  tint: string;
  textColor: string;
  accent: string;
  reduced: boolean;
  /** scrollAnim "Off": skip the flip-in entrance but keep the cursor tilt. */
  still?: boolean;
  size?: string;
}) {
  const tiltX = useSpring(0, { stiffness: 140, damping: 14 });
  const tiltY = useSpring(0, { stiffness: 140, damping: 14 });

  return (
    <div
      style={{ perspective: 700 }}
      onMouseMove={(e) => {
        if (reduced) return;
        const r = e.currentTarget.getBoundingClientRect();
        tiltY.set(((e.clientX - r.left) / r.width - 0.5) * 20);
        tiltX.set(-((e.clientY - r.top) / r.height - 0.5) * 20);
      }}
      onMouseLeave={() => {
        tiltX.set(0);
        tiltY.set(0);
      }}
    >
      <motion.div
        {...(reduced || still
          ? {}
          : {
              initial: { rotateY: 160, opacity: 0, scale: 0.85 },
              whileInView: { rotateY: 0, opacity: 1, scale: 1 },
            })}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <motion.div
          className={`${size} rounded-full flex items-center justify-center overflow-hidden`}
          style={{
            background: tint,
            rotateX: tiltX,
            rotateY: tiltY,
            border: `3px solid ${accent}`,
            boxShadow: `0 24px 48px -22px color-mix(in srgb, ${accent} 55%, transparent), inset 0 0 20px color-mix(in srgb, ${accent} 22%, transparent)`,
          }}
        >
          {photo ? (
            <img src={photo} alt={name} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <span className="font-script text-6xl" style={{ color: textColor }}>
              {name[0]}
            </span>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

/**
 * "Royal Heritage" — reimagined as The Durbar: a ceremonial court invitation.
 * A filigree frame draws itself around the hero inside the Hall-of-Mirrors 3D
 * arch, the countdown runs on one gilded strip, the couple share an
 * overlapping locket, and the events read as a ceremonial programme with
 * script numerals and flourish rules. Reduced motion (and ?print=1) renders
 * everything flat and 3D-free.
 */
export default function Classic({ data }: TemplateProps) {
  const p = data.palette;
  const countdown = useCountdown(data.weddingDate);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [rsvpFocused, setRsvpFocused] = useState(false);

  // Effect controls — GalleryGrid reads galleryHover from the provided
  // context; goldDust / heroParallax / headingShimmer are honored below.
  const fx = resolveEffects(CLASSIC_EFFECTS, data.effects);
  const { fadeUp, stagger, inViewProps, still } = motionPreset(fx.scrollAnim!);

  const reduced = useReducedMotion() ?? false;
  const show3d = !reduced && !data.print;
  // Decorative pen-work (flourish corners/rules) counts as an entrance too.
  const sketch = reduced || still;
  const shimmerOn = !reduced && fx.headingShimmer !== 'off';
  const heroRef = useRef<HTMLElement | null>(null);
  // 0 → hero fully in view, 1 → scrolled past. Drives the arch parting and
  // the names' slower-than-scroll float.
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const namesY = useTransform(heroProgress, [0, 1], [0, 130]);
  // Cursor parallax: the names lean gently with the pointer, the filigree
  // frame drifts against it, and the 3D arch tilts in kind (via mouse props).
  const parallax = useMouseParallax(reduced || fx.heroParallax === 'off');

  const coupleNames = `${data.brideName} & ${data.groomName}`;
  const enabled = data.sections.filter((s) => s.enabled);
  const hasSection = (id: PartId) => enabled.some((s) => s.id === id);
  const showHero = hasSection('hero');
  const anyEnabled = enabled.length > 0;
  const showGallery = hasSection('gallery') && data.galleryImages.length > 0;
  const showEvents = hasSection('events') && data.events.length > 0;
  const heroPhoto = data.galleryImages[0]?.url ?? null;
  const invitePage = data.pages.find((pg) => pg.kind === 'invite');

  // Palette-safe against this template's hero gradient (with or without a photo
  // overlay) — the names never wash out when the couple changes the palette.
  const shimmerColors = heroShimmer(p);
  const heroGold = `color-mix(in srgb, ${p.onHeroSoft} 80%, ${p.onHero})`;

  const navLinks = enabled
    .filter(
      (s) =>
        s.id !== 'hero' &&
        s.id !== 'rsvp' &&
        SECTION_LABELS[s.id] &&
        (s.id !== 'gallery' || showGallery) &&
        (s.id !== 'events' || showEvents),
    )
    .map((s) => ({ id: s.id as string, label: SECTION_LABELS[s.id] }));
  if (invitePage) navLinks.push({ id: `page:${invitePage.pageSlug}`, label: invitePage.title });

  const navHref = (id: string) => (id.startsWith('page:') ? `/${data.slug}/${id.slice(5)}` : `#${id}`);

  const vars = siteVars(p);

  // Court-programme heading: a whispered letterspaced kicker, a Playfair
  // display title, and the gilded flourish rule — script is reserved for
  // names and accents so section titles read premium, not greeting-card.
  const heading = (kicker: React.ReactNode, text: React.ReactNode) => (
    <>
      <motion.p
        variants={fadeUp}
        className="text-[11px] uppercase mb-4"
        style={{ color: p.accent, letterSpacing: '0.38em', textIndent: '0.38em' }}
      >
        {kicker}
      </motion.p>
      <motion.h2
        variants={fadeUp}
        className="font-display text-4xl sm:text-5xl mb-6"
        style={{ color: p.primary, letterSpacing: '0.01em' }}
      >
        {text}
      </motion.h2>
      <motion.div variants={fadeUp} className="mb-10">
        <FlourishRule color={p.accent} reduced={sketch} />
      </motion.div>
    </>
  );

  const sectionBlocks: Record<PartId, React.ReactNode> = {
    hero: null,
    envelope: null,
    countdown: null,
    final: null,

    story: (
      <section key="story" id="story" className="py-24 relative overflow-hidden" style={{ background: p.surface }}>
        {/* The couple's initials watermark the page like an embossed seal */}
        <span
          className="absolute -right-6 top-8 font-script select-none pointer-events-none leading-none hidden lg:block"
          style={{ fontSize: '16rem', color: p.primary, opacity: 0.05 }}
          aria-hidden
        >
          {data.brideName[0]}{data.groomName[0]}
        </span>
        <div className="max-w-4xl mx-auto px-6 relative">
          <motion.div variants={stagger} {...inViewProps} className="text-center">
            {heading(<E k="story.kicker" />, <E k="story.heading" />)}
            <motion.p
              variants={fadeUp}
              className="font-serif-display text-lg sm:text-xl mb-14 whitespace-pre-line max-w-2xl mx-auto"
              style={{ color: p.inkSoft, lineHeight: 1.9 }}
            >
              <EditableContent field="story" value={data.story} multiline />
            </motion.p>

            {/* The locket: two medallions overlapping at a gold ampersand */}
            <motion.div variants={fadeUp} className="flex justify-center items-center">
              <div className="relative flex items-center">
                <div className="relative z-0">
                  <Medallion
                    photo={data.galleryImages[1]?.url ?? null}
                    name={data.brideName}
                    tint={`color-mix(in srgb, ${p.accent} 14%, ${p.surface})`}
                    textColor={p.accent}
                    accent={p.accent}
                    reduced={reduced}
                    still={still}
                  />
                </div>
                <div className="relative z-10 -ml-7 sm:-ml-9 mt-16 sm:mt-20">
                  <Medallion
                    photo={data.galleryImages[2]?.url ?? null}
                    name={data.groomName}
                    tint={`color-mix(in srgb, ${p.primary} 12%, ${p.surface})`}
                    textColor={p.primary}
                    accent={p.accent}
                    reduced={reduced}
                    still={still}
                  />
                </div>
                <span
                  className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center font-script text-2xl shadow-lg"
                  style={{ background: p.accent, color: p.onAccent }}
                  aria-hidden
                >
                  &amp;
                </span>
              </div>
            </motion.div>
            <div className="mt-10 flex justify-center gap-16 sm:gap-24">
              {[
                { name: data.brideName, roleKey: 'story.brideRole' as const },
                { name: data.groomName, roleKey: 'story.groomRole' as const },
              ].map((person) => (
                <motion.div key={person.roleKey} variants={fadeUp} className="text-center">
                  <h3 className="font-display text-2xl mb-1" style={{ color: p.primary }}>
                    {person.name}
                  </h3>
                  <p className="text-xs uppercase" style={{ color: p.inkSoft, letterSpacing: '0.2em' }}>
                    <E k={person.roleKey} />
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    ),

    events: showEvents ? (
      <section key="events" id="events" className="py-24" style={{ background: p.bg }}>
        <div className="max-w-3xl mx-auto px-6">
          <motion.div variants={stagger} {...inViewProps} className="text-center mb-14">
            {heading(<E k="events.kicker" />, <E k="events.heading" />)}
          </motion.div>

          <motion.div variants={stagger} {...inViewProps}>
            {data.events.map((event, i) => {
              const directions = directionsUrl(event.venue);
              const stripe = event.color ?? p.accent;
              return (
                <motion.div key={event.id} variants={fadeUp}>
                  {i > 0 && (
                    <div className="py-10">
                      <FlourishRule color={p.line} reduced={sketch} />
                    </div>
                  )}
                  <div className="grid grid-cols-[64px_1fr] sm:grid-cols-[96px_1fr] gap-5 sm:gap-8 items-start">
                    <div className="text-right">
                      <span
                        className="font-serif-display italic leading-none inline-block"
                        style={{ fontSize: 'clamp(2.6rem, 6vw, 4rem)', color: stripe }}
                        aria-hidden
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span
                        className="block h-px mt-3 ml-auto w-8 sm:w-12"
                        style={{ background: `color-mix(in srgb, ${stripe} 55%, transparent)` }}
                        aria-hidden
                      />
                    </div>
                    <div className="pt-2">
                      <div className="flex flex-wrap items-baseline gap-x-4 mb-2">
                        <h3 className="font-display text-3xl font-bold" style={{ color: p.primary }}>
                          {event.name}
                        </h3>
                        {event.event_type && (
                          <span
                            className="text-[10px] uppercase px-2.5 py-1 rounded-full"
                            style={{
                              color: stripe,
                              border: `1px solid color-mix(in srgb, ${stripe} 55%, transparent)`,
                              letterSpacing: '0.16em',
                            }}
                          >
                            {event.event_type}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-sm uppercase mb-3"
                        style={{ color: p.ink, letterSpacing: '0.14em' }}
                      >
                        {formatEventDate(event.date)}
                        <span style={{ color: p.accent }}> ✦ </span>
                        {formatEventTime(event.start_time)}
                        {event.end_time ? ` – ${formatEventTime(event.end_time)}` : ''}
                      </p>
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
                        <p className="text-sm mt-2" style={{ color: p.inkSoft }}>
                          <SharedE k="events.dressCode" />{' '}
                          <span className="font-medium" style={{ color: p.ink }}>
                            {event.dress_code}
                          </span>
                        </p>
                      )}
                      <div className="mt-4 flex gap-5 text-sm font-medium">
                        <a
                          href={calendarUrl(event, coupleNames)}
                          download={icsFileName(event.name)}
                          style={{ color: p.primary }}
                          className="hover:underline underline-offset-4"
                        >
                          <SharedE k="events.addToCalendar" />
                        </a>
                        {directions && (
                          <a
                            href={directions}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: p.primary }}
                            className="hover:underline underline-offset-4"
                          >
                            <SharedE k="events.directions" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>
    ) : null,

    rsvp: (
      <section
        key="rsvp"
        id="rsvp"
        className="py-24 relative overflow-hidden"
        style={{ background: p.heroGradient }}
      >
        {show3d && fx.goldDust !== 'none' && (
          <Suspense fallback={null}>
            <ClassicGoldVeil
              palette={p}
              motes={fx.goldDust!}
              className="absolute inset-0"
              paused={rsvpFocused}
            />
          </Suspense>
        )}
        <div
          className="relative max-w-2xl mx-auto px-6"
          onFocusCapture={() => setRsvpFocused(true)}
          onBlurCapture={() => setRsvpFocused(false)}
        >
          <motion.div variants={stagger} {...inViewProps}>
            <div className="text-center mb-12">
              <motion.p
                variants={fadeUp}
                className="text-[11px] uppercase mb-4"
                style={{ color: heroGold, letterSpacing: '0.38em', textIndent: '0.38em' }}
              >
                <E k="rsvp.kicker" />
              </motion.p>
              <motion.h2
                variants={fadeUp}
                className="font-display text-4xl sm:text-5xl mb-4"
                style={{ color: p.onHero }}
              >
                <E k="rsvp.heading" />
              </motion.h2>
              <motion.p variants={fadeUp} className="font-serif-display italic text-lg" style={{ color: p.onHeroSoft }}>
                <E k="rsvp.subheading" />
              </motion.p>
            </div>
            <motion.div
              variants={fadeUp}
              className="p-1.5"
              style={{ border: `1px solid color-mix(in srgb, ${heroGold} 55%, transparent)` }}
            >
              <div
                className="p-4 sm:p-6"
                style={{ border: `1px solid color-mix(in srgb, ${heroGold} 35%, transparent)` }}
              >
                <RsvpForm slug={data.slug} preview={data.preview} />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    ),

    gallery: showGallery ? (
      <section key="gallery" id="gallery" className="py-24" style={{ background: p.surface }}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div variants={stagger} {...inViewProps} className="text-center mb-12">
            {heading(<E k="gallery.kicker" />, <E k="gallery.heading" />)}
            {data.gallerySubtitle && (
              <motion.p variants={fadeUp} className="-mt-4 mb-4 font-serif-display italic text-lg" style={{ color: p.inkSoft }}>
                {data.gallerySubtitle}
              </motion.p>
            )}
          </motion.div>
          <GalleryGrid
            images={data.galleryImages}
            layout={data.galleryLayout}
            palette={p}
            reduced={reduced}
            onOpen={setLightboxIndex}
          />
        </div>
      </section>
    ) : null,
  };

  return (
    <SiteEffectsContext.Provider value={fx}>
    <div style={{ ...vars, background: p.bg, color: p.ink }} className="min-h-screen">
      <ScrollProgress color={p.accent} colorSoft={p.onHeroSoft} />
      {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}

      {/* Hero — the ceremonial frame inside the Hall of Mirrors */}
      {showHero && (
      <section
        ref={heroRef}
        {...parallax.bind}
        className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16"
      >
        {/* Nav — transparent, lives inside the hero rather than as a separate chrome bar */}
        {anyEnabled && (
        <nav className="absolute top-0 left-0 right-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <a href={`/${data.slug}`} className="font-script text-2xl" style={{ color: p.onHero }}>
                {shimmerOn ? (
                  <ShimmerText colors={[p.onHero, p.accent, p.onHero]}>{coupleNames}</ShimmerText>
                ) : (
                  coupleNames
                )}
              </a>
              <div className="hidden md:flex items-center gap-8">
                {navLinks.map((link) => (
                  <a
                    key={link.id}
                    href={navHref(link.id)}
                    className="text-sm hover:opacity-70 transition-opacity"
                    style={{ color: p.onHero }}
                  >
                    {link.label}
                  </a>
                ))}
                {hasSection('rsvp') && (
                  <a
                    href="#rsvp"
                    className="px-5 py-2 rounded-full text-sm font-semibold"
                    style={{ background: p.accent, color: p.onAccent }}
                  >
                    <E k="nav.rsvp" />
                  </a>
                )}
                {data.authed && (
                  <Link
                    to={`/${data.slug}/dashboard`}
                    className="text-sm hover:opacity-70"
                    style={{ color: p.onHeroSoft }}
                  >
                    Dashboard
                  </Link>
                )}
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg"
                aria-label="Toggle menu"
                style={{ color: p.onHero }}
              >
                {mobileMenuOpen ? (
                  <HiOutlineX className="w-6 h-6" />
                ) : (
                  <HiOutlineMenu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
          {mobileMenuOpen && (
            <div
              className="md:hidden border-t backdrop-blur-sm"
              style={{ borderColor: p.line, background: `color-mix(in srgb, ${p.bg} 95%, transparent)` }}
            >
              <div className="max-w-7xl mx-auto px-4 py-2">
                {[...navLinks, ...(hasSection('rsvp') ? [{ id: 'rsvp', label: 'RSVP' }] : [])].map(
                  (link) => (
                    <a
                      key={link.id}
                      href={navHref(link.id)}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 rounded-lg"
                      style={{ color: p.ink }}
                    >
                      {link.label}
                    </a>
                  ),
                )}
                {data.authed && (
                  <Link
                    to={`/${data.slug}/dashboard`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-lg"
                    style={{ color: p.inkSoft }}
                  >
                    Dashboard
                  </Link>
                )}
              </div>
            </div>
          )}
        </nav>
        )}
        {/* DOM photo+scrim stays underneath always: it is the loading state,
            the reduced-motion path, and the WebGL-failure fallback. */}
        {heroPhoto && (
          <img
            src={heroPhoto}
            alt=""
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center 20%' }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: p.heroGradient, opacity: heroPhoto ? 0.82 : 1 }}
        />
        {show3d && (
          <Suspense fallback={null}>
            <ClassicHeroScene
              palette={p}
              photoUrl={heroPhoto}
              progress={heroProgress}
              mouseX={parallax.x}
              mouseY={parallax.y}
              motes={fx.goldDust!}
              className="absolute inset-0"
            />
          </Suspense>
        )}

        {/* The filigree frame draws itself around the ceremony. It opens below
            the nav (top-20) so the corners never collide with the brand or
            menu, and drifts against the cursor for depth. */}
        <ParallaxLayer
          x={parallax.x}
          y={parallax.y}
          depth={-7}
          className="absolute inset-x-3 top-20 bottom-3 sm:inset-x-6 sm:top-24 sm:bottom-6 pointer-events-none z-10"
        >
          <span aria-hidden>
            <CornerFlourish color={heroGold} reduced={sketch} className="absolute top-0 left-0" />
            <CornerFlourish color={heroGold} reduced={sketch} delay={0.2} className="absolute top-0 right-0 -scale-x-100" />
            <CornerFlourish color={heroGold} reduced={sketch} delay={0.4} className="absolute bottom-0 left-0 -scale-y-100" />
            <CornerFlourish color={heroGold} reduced={sketch} delay={0.6} className="absolute bottom-0 right-0 -scale-x-100 -scale-y-100" />
          </span>
        </ParallaxLayer>

        <motion.div
          className="relative z-10 text-center px-10 sm:px-16 py-24 w-full max-w-4xl"
          {...(show3d ? { style: { y: namesY } } : {})}
        >
          <ParallaxLayer x={parallax.x} y={parallax.y} depth={9}>
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.div
              variants={fadeUp}
              className="flex items-center justify-center gap-3 mb-6"
              style={{ color: p.onHeroSoft }}
            >
              <span className="h-px w-8 sm:w-12" style={{ background: 'currentColor', opacity: 0.6 }} />
              <span className="text-xs sm:text-sm uppercase" style={{ letterSpacing: '0.32em' }}>
                <E k="hero.kicker" />
              </span>
              <span className="h-px w-8 sm:w-12" style={{ background: 'currentColor', opacity: 0.6 }} />
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-script leading-tight mb-1"
              style={{ fontSize: 'clamp(3.4rem, 9vw, 6.5rem)' }}
            >
              {shimmerOn ? (
                <ShimmerText colors={shimmerColors}>
                  <EditableContent field="brideName" value={data.brideName} />
                </ShimmerText>
              ) : (
                <span style={{ color: p.onHero }}>
                  <EditableContent field="brideName" value={data.brideName} />
                </span>
              )}
            </motion.h1>
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-4 my-2" aria-hidden>
              <span className="h-px w-10" style={{ background: heroGold, opacity: 0.7 }} />
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center font-script text-xl"
                style={{ border: `1px solid ${heroGold}`, color: p.onHero }}
              >
                &amp;
              </span>
              <span className="h-px w-10" style={{ background: heroGold, opacity: 0.7 }} />
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-script leading-tight mb-6"
              style={{ fontSize: 'clamp(3.4rem, 9vw, 6.5rem)' }}
            >
              {shimmerOn ? (
                <ShimmerText colors={shimmerColors}>
                  <EditableContent field="groomName" value={data.groomName} />
                </ShimmerText>
              ) : (
                <span style={{ color: p.onHero }}>
                  <EditableContent field="groomName" value={data.groomName} />
                </span>
              )}
            </motion.h1>
            {data.tagline && (
              <motion.p
                variants={fadeUp}
                className="font-display italic text-xl mb-4"
                style={{ color: p.onHero, opacity: 0.9 }}
              >
                <EditableContent field="tagline" value={data.tagline} multiline />
              </motion.p>
            )}
            <motion.p
              variants={fadeUp}
              className="text-sm sm:text-base uppercase mb-12"
              style={{ color: p.onHeroSoft, letterSpacing: '0.24em' }}
            >
              {data.weddingDate?.toLocaleDateString('en-IN', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              }) ?? ''}
            </motion.p>

            {data.weddingDate && !countdown.past && (
              <motion.div variants={fadeUp} className="mb-12 max-w-xl mx-auto">
                {/* One gilded strip — a court proclamation, not app widgets */}
                <div
                  className="flex justify-center items-stretch py-4 px-2"
                  style={{
                    borderTop: `1px solid color-mix(in srgb, ${heroGold} 60%, transparent)`,
                    borderBottom: `1px solid color-mix(in srgb, ${heroGold} 60%, transparent)`,
                  }}
                >
                  {[
                    { value: countdown.days, k: 'countdown.days' as const },
                    { value: countdown.hours, k: 'countdown.hours' as const },
                    { value: countdown.minutes, k: 'countdown.minutes' as const },
                    { value: countdown.seconds, k: 'countdown.seconds' as const },
                  ].map((item, idx) => (
                    <div key={item.k} className="flex items-center min-w-0">
                      {idx > 0 && (
                        <span
                          className="mx-2 sm:mx-5 text-[10px]"
                          style={{ color: heroGold, opacity: 0.8 }}
                          aria-hidden
                        >
                          ◆
                        </span>
                      )}
                      <div className="text-center px-1">
                        <TickerDigit
                          value={item.value}
                          className="font-serif-display"
                          style={{ fontSize: 'clamp(22px, 4.5vw, 44px)', color: p.onHero }}
                        />
                        <div
                          className="uppercase mt-0.5"
                          style={{ fontSize: 'clamp(7px, 1.4vw, 10px)', color: p.onHeroSoft, letterSpacing: '0.24em' }}
                        >
                          <SharedE k={item.k} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {hasSection('rsvp') && (
              <motion.a
                variants={fadeUp}
                href="#rsvp"
                className="inline-block px-10 py-4 rounded-full font-semibold text-sm uppercase transition-colors"
                style={{ background: p.accent, color: p.onAccent, letterSpacing: '0.18em' }}
              >
                <E k="hero.rsvpCta" />
              </motion.a>
            )}
          </motion.div>
          </ParallaxLayer>
        </motion.div>
        <ScrollCue color={p.onHeroSoft} className="absolute bottom-9 left-1/2 -translate-x-1/2 z-10" />
      </section>
      )}

      {enabled.map((s) => sectionBlocks[s.id])}

      {/* Footer */}
      {anyEnabled && (
      <footer className="py-14 relative overflow-hidden" style={{ background: p.heroGradient, color: p.onHero }}>
        <div className="max-w-7xl mx-auto px-4 text-center relative">
          <h3 className="font-script text-4xl mb-4">{coupleNames}</h3>
          {data.weddingDate && (
            <p className="mb-6 text-sm uppercase" style={{ color: p.onHeroSoft, letterSpacing: '0.2em' }}>
              {data.weddingDate.toLocaleDateString('en-IN', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
          {invitePage && (
            <Link
              to={`/${data.slug}/${invitePage.pageSlug}`}
              className="inline-block mb-6 text-sm underline underline-offset-4"
              style={{ color: p.onHeroSoft }}
            >
              <E k="footer.invite" />
            </Link>
          )}
          <p className="text-sm opacity-60">
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
    </SiteEffectsContext.Provider>
  );
}
