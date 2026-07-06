import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import type { PartId, PublicEvent, TemplateProps } from '../types';
import { SharedE } from '../copy/shared';
import { INVITE_COPY } from '../copy/templates/invite';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { useCountdown } from '../useCountdown';
import { fadeUp, inViewProps, scaleIn, stagger } from '../motion';
import { siteVars, heroShimmer, PHOTO_SHIMMER } from '../theme';
import RsvpForm from '../RsvpForm';
import Lightbox from '../Lightbox';
import ShimmerText from '../effects/ShimmerText';
import MusicPlayer from '../effects/MusicPlayer';

/**
 * "Luxury Invite" — port of the original MakingAIdoIt invite design
 * (weddingplannerdesign): tap-to-open envelope with wax seal, full-screen
 * photo hero, live countdown slide, one cinematic slide per ceremony with
 * its own heading colour, gold shimmer names, scroll progress bar, and an
 * optional soundtrack. Mobile-first: the column is capped at 430px and
 * centered on desktop.
 */

const { E } = makeEditable('invite', INVITE_COPY);

function Envelope({
  initials,
  preview,
  onComplete,
}: {
  initials: string;
  preview?: boolean | undefined;
  onComplete: () => void;
}) {
  const [opened, setOpened] = useState(false);

  const handleTap = () => {
    if (opened) return;
    setOpened(true);
    setTimeout(onComplete, 1400);
  };

  return (
    <motion.div
      onClick={handleTap}
      animate={opened ? { opacity: 0 } : { opacity: 1 }}
      transition={opened ? { delay: 0.9, duration: 0.5 } : { duration: 0.2 }}
      style={
        preview
          ? {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '100svh',
              background: '#f5ece0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 100,
            }
          : {
              position: 'fixed',
              inset: 0,
              background: '#f5ece0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 100,
            }
      }
    >
      <motion.div
        animate={opened ? { y: 80, opacity: 0 } : { y: [0, -8, 0] }}
        transition={
          opened ? { duration: 0.8 } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
        }
        style={{ position: 'relative', width: 280, height: 190 }}
      >
        {/* Envelope body */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, #fdf8f0 0%, #f0e4d0 100%)',
            borderRadius: 10,
            boxShadow: '0 18px 40px -14px rgba(74, 34, 8, 0.35)',
            border: '1px solid #e2d2b8',
          }}
        />
        {/* Flap */}
        <motion.div
          animate={opened ? { rotateX: 180 } : { rotateX: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 95,
            transformOrigin: 'top',
            background: 'linear-gradient(180deg, #f7efe1 0%, #ecdcc2 100%)',
            clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            borderRadius: '10px 10px 0 0',
          }}
        />
        {/* Wax seal */}
        <motion.div
          animate={opened ? { scale: 0, opacity: 0 } : { scale: 1 }}
          transition={{ duration: 0.35 }}
          style={{
            position: 'absolute',
            left: '50%',
            top: 78,
            transform: 'translateX(-50%)',
            width: 62,
            height: 62,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #b03434, #7d1f1f 70%)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3), inset 0 0 0 4px rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span className="font-script" style={{ color: '#f3d9b0', fontSize: 22 }}>
            {initials}
          </span>
        </motion.div>
      </motion.div>
      <p
        className="uppercase"
        style={{ marginTop: 40, fontSize: 11, letterSpacing: '0.35em', color: '#4a2208' }}
      >
        <E k="envelope.tapToOpen" />
      </p>
    </motion.div>
  );
}

function EventSlide({
  event,
  index,
  coupleNames,
  vars,
}: {
  event: PublicEvent;
  index: number;
  coupleNames: string;
  vars: { cream: string; surface: string; textDark: string; textMedium: string; gold: string; onGold: string };
}) {
  const headingColor = event.color ?? vars.textDark;
  const directions = directionsUrl(event.venue);
  return (
    <section
      className="flex flex-col items-center justify-center text-center px-8"
      style={{ minHeight: '100svh', background: index % 2 ? vars.surface : vars.cream }}
    >
      <motion.div variants={fadeUp} {...inViewProps} className="max-w-md sm:max-w-xl mx-auto">
        {event.event_type && (
          <p
            className="uppercase mb-5"
            style={{ fontSize: 10, letterSpacing: '0.4em', color: vars.gold }}
          >
            {event.event_type}
          </p>
        )}
        <h2 className="font-script mb-6" style={{ fontSize: 52, color: headingColor }}>
          {event.name}
        </h2>
        <div className="w-10 h-px mx-auto mb-6" style={{ background: vars.gold }} />
        {event.description && (
          <p className="italic text-sm mb-5 mx-auto" style={{ color: vars.textMedium, maxWidth: 300 }}>
            {event.description}
          </p>
        )}
        <p className="font-serif-display text-lg mb-1" style={{ color: vars.textDark }}>
          {formatEventDate(event.date)}
        </p>
        <p className="font-serif-display mb-4" style={{ color: vars.textMedium }}>
          {formatEventTime(event.start_time)}
          {event.end_time ? ` – ${formatEventTime(event.end_time)}` : <> <E k="events.onwards" /></>}
        </p>
        {event.venue && (
          <p className="font-serif-display italic mb-1" style={{ color: vars.textMedium }}>
            {event.venue.name}
            {event.venue.city ? `, ${event.venue.city}` : ''}
          </p>
        )}
        {event.dress_code && (
          <p
            className="uppercase mt-4"
            style={{ fontSize: 10, letterSpacing: '0.3em', color: vars.textMedium }}
          >
            <E k="events.dressCode" /> {event.dress_code}
          </p>
        )}
        <div className="mt-8 flex justify-center gap-4">
          {directions && (
            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-full text-xs uppercase"
              style={{
                border: `1px solid ${vars.gold}`,
                color: vars.textDark,
                letterSpacing: '0.18em',
              }}
            >
              <E k="events.viewMap" />
            </a>
          )}
          <a
            href={calendarUrl(event, coupleNames)}
            download={icsFileName(event.name)}
            className="px-5 py-2.5 rounded-full text-xs uppercase"
            style={{ background: vars.gold, color: vars.onGold, letterSpacing: '0.18em' }}
          >
            <SharedE k="events.addToCalendar" />
          </a>
        </div>
      </motion.div>
    </section>
  );
}

export default function Invite({ data }: TemplateProps) {
  const p = data.palette;
  const countdown = useCountdown(data.weddingDate);
  const enabled = data.sections.filter((s) => s.enabled);
  const hasSection = (id: PartId) => enabled.some((s) => s.id === id);

  const showHero = hasSection('hero');
  const envelopeEnabled = hasSection('envelope');
  const [opened, setOpened] = useState(
    () =>
      !envelopeEnabled ||
      data.print ||
      (!data.preview && sessionStorage.getItem(`invited:${data.slug}`) === 'true'),
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  const coupleNames = `${data.brideName} & ${data.groomName}`;
  const initials = `${data.brideName[0] ?? ''}${data.groomName[0] ?? ''}`;
  const websitePage = data.pages.find((pg) => pg.kind === 'website');

  // The original design uses couple.jpg / couple2.jpg; here the couple's
  // gallery uploads fill those slots, falling back to the palette gradient.
  const heroPhoto = data.galleryImages[0]?.url ?? null;
  const countdownPhoto = data.galleryImages[1]?.url ?? heroPhoto;
  // With fewer than three photos, reuse them so the reel doesn't vanish
  const reelOffset = data.galleryImages.length > 2 ? 2 : 0;
  const reelPhotos = data.galleryImages.slice(reelOffset);
  // Over a photo the hero text sits on a dark scrim (white ink); without one
  // it sits on the palette's hero gradient, so use its contrast tokens.
  const heroInk = heroPhoto ? '#fff' : p.onHero;
  const heroInkSoft = heroPhoto ? 'rgba(255,255,255,0.9)' : p.onHeroSoft;
  // Gold sheen over a photo scrim; palette-safe ramp when there's no photo.
  const heroShimmerColors = heroPhoto ? PHOTO_SHIMMER : heroShimmer(p);

  useEffect(() => {
    if (heroPhoto) {
      const img = new Image();
      img.src = heroPhoto;
    }
  }, [heroPhoto]);

  const vars = {
    gold: p.accent,
    onGold: p.onAccent,
    cream: p.bg,
    surface: p.surface,
    textDark: p.ink,
    textMedium: p.inkSoft,
  };

  const cssVars = siteVars(p);

  const photoSlide = (photo: string | null, children: React.ReactNode) => (
    <div className="relative flex flex-col" style={{ minHeight: '100svh' }}>
      {photo ? (
        <img
          src={photo}
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 10%' }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: p.heroGradient }} />
      )}
      {children}
    </div>
  );

  const partBlocks: Partial<Record<PartId, React.ReactNode>> = {
    story: (
      <section
        key="story"
        className="flex items-center justify-center text-center px-8 py-24"
        style={{ minHeight: '80svh' }}
      >
        <motion.div variants={fadeUp} {...inViewProps} className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto">
          <p
            className="uppercase mb-5"
            style={{ fontSize: 10, letterSpacing: '0.4em', color: vars.gold }}
          >
            <E k="story.eyebrow" />
          </p>
          <p
            className="font-serif-display text-xl leading-relaxed whitespace-pre-line"
            style={{ color: vars.textMedium }}
          >
            <EditableContent field="story" value={data.story} multiline />
          </p>
        </motion.div>
      </section>
    ),

    countdown:
      data.weddingDate && !countdown.past ? (
        <div key="countdown">
          {photoSlide(
            countdownPhoto,
            <div
              className="relative z-10 flex flex-col items-center justify-center text-center px-3 sm:px-6 w-full overflow-hidden"
              style={{ minHeight: '100svh', background: 'rgba(15,8,2,0.45)' }}
            >
              <motion.div variants={scaleIn} {...inViewProps} className="w-full">
                <p
                  className="uppercase mb-6 sm:mb-8"
                  style={{ fontSize: 'clamp(8px, 2vw, 10px)', letterSpacing: '0.45em', color: '#f0d080' }}
                >
                  <E k="countdown.kicker" />
                </p>
                <div className="flex justify-center gap-1 sm:gap-3 md:gap-5 flex-wrap px-1">
                  {[
                    { value: countdown.days, k: 'countdown.days' as const },
                    { value: countdown.hours, k: 'countdown.hours' as const },
                    { value: countdown.minutes, k: 'countdown.minutes' as const },
                    { value: countdown.seconds, k: 'countdown.seconds' as const },
                  ].map((item) => (
                    <div key={item.k} className="text-center min-w-0">
                      <p className="font-serif-display" style={{ fontSize: 'clamp(16px, 4vw, 48px)', color: '#fff' }}>
                        {String(item.value).padStart(2, '0')}
                      </p>
                      <p
                        className="uppercase mt-0.5 sm:mt-1"
                        style={{
                          fontSize: 'clamp(5px, 1.5vw, 9px)',
                          letterSpacing: '0.25em',
                          color: 'rgba(255,255,255,0.75)',
                        }}
                      >
                        <E k={item.k} />
                      </p>
                    </div>
                  ))}
                </div>
                <p className="font-script mt-10" style={{ fontSize: 30, color: '#f0d080' }}>
                  <E k="countdown.note" />
                </p>
              </motion.div>
            </div>,
          )}
        </div>
      ) : null,

    events: (
      <div key="events">
        {data.events.map((event, i) => (
          <EventSlide
            key={event.id}
            event={event}
            index={i}
            coupleNames={coupleNames}
            vars={vars}
          />
        ))}
      </div>
    ),

    gallery:
      reelPhotos.length > 0 ? (
        <section key="gallery" className="py-24" style={{ background: vars.surface }}>
          <motion.div variants={stagger} {...inViewProps}>
            <motion.p
              variants={fadeUp}
              className="uppercase text-center mb-10"
              style={{ fontSize: 10, letterSpacing: '0.4em', color: vars.gold }}
            >
              <E k="gallery.heading" />
            </motion.p>
            <div
              className="flex gap-4 overflow-x-auto px-8 pb-4"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {reelPhotos.map((image, i) => (
                <motion.button
                  key={image.url}
                  variants={fadeUp}
                  onClick={() => setLightboxIndex(i + reelOffset)}
                  className="flex-shrink-0 overflow-hidden"
                  style={{
                    width: 240,
                    aspectRatio: '3 / 4',
                    borderRadius: 14,
                    scrollSnapAlign: 'center',
                    border: `1px solid ${p.line}`,
                  }}
                >
                  <img
                    src={image.url}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </motion.button>
              ))}
            </div>
          </motion.div>
        </section>
      ) : null,

    rsvp: (
      <section
        key="rsvp"
        id="rsvp"
        className="flex flex-col items-center justify-center px-6 py-24"
        style={{ minHeight: '100svh', background: vars.surface }}
      >
        <motion.div variants={fadeUp} {...inViewProps} className="w-full max-w-md sm:max-w-lg mx-auto">
          <p
            className="uppercase text-center mb-3"
            style={{ fontSize: 10, letterSpacing: '0.4em', color: vars.gold }}
          >
            <E k="rsvp.eyebrow" />
          </p>
          <h2
            className="font-script text-center mb-8"
            style={{ fontSize: 44, color: vars.textDark }}
          >
            <E k="rsvp.heading" />
          </h2>
          <RsvpForm slug={data.slug} preview={data.preview} />
        </motion.div>
      </section>
    ),

    final: (
      <section
        key="final"
        className="flex flex-col items-center justify-center text-center px-8 py-24"
        style={{ minHeight: '60svh' }}
      >
        <motion.div variants={fadeUp} {...inViewProps}>
          <p className="font-script mb-3" style={{ fontSize: 40 }}>
            <ShimmerText>{coupleNames}</ShimmerText>
          </p>
          <p
            className="uppercase"
            style={{ fontSize: 10, letterSpacing: '0.35em', color: vars.textMedium }}
          >
            <E k="final.note" />
          </p>
          <div className="mt-10 flex flex-col items-center gap-3">
            {websitePage && (
              <Link
                to={`/${data.slug}`}
                className="text-xs uppercase hover:opacity-60 underline underline-offset-4"
                style={{ color: vars.gold, letterSpacing: '0.2em' }}
              >
                <E k="final.website" />
              </Link>
            )}
            {data.authed && (
              <Link
                to={`/${data.slug}/dashboard`}
                className="text-xs uppercase hover:opacity-60"
                style={{ color: vars.textMedium, letterSpacing: '0.2em' }}
              >
                Dashboard
              </Link>
            )}
          </div>
        </motion.div>
      </section>
    ),
  };

  return (
    <div className="flex justify-center" style={{ background: '#171310' }}>
      {/* An invite is a phone-first experience — present it as a centered card
          column on desktop (letterboxed) instead of stretching full-width. */}
      <div
        className="relative w-full max-w-[480px] overflow-x-hidden font-serif-display shadow-2xl"
        style={{ ...cssVars, background: vars.cream, color: vars.textDark }}
      >
        {envelopeEnabled && !opened && (
          <Envelope
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

        {/* Scroll progress bar — position:fixed, so keep it out of the
            Site Studio preview where it would track the dashboard scroll */}
        {!data.preview && (
          <motion.div
            className="fixed top-0 right-0 h-screen"
            style={{
              width: 3,
              background: 'linear-gradient(180deg, #c9942a, #f0d080)',
              transformOrigin: 'top',
              scaleY,
              zIndex: 60,
            }}
          />
        )}

        {/* Hero slide */}
        {showHero &&
          photoSlide(
            heroPhoto,
            <div className="relative z-10 flex flex-col" style={{ minHeight: '100svh' }}>
              <div className="pt-9 px-6 text-center">
                <div
                  className="mx-auto w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    border: `1px solid ${heroPhoto ? 'rgba(255,255,255,0.6)' : p.onHeroSoft}`,
                    color: heroPhoto ? '#fff' : p.onHero,
                  }}
                >
                  <span className="font-script text-lg">{initials}</span>
                </div>
                <p
                  className="uppercase mt-3"
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.4em',
                    color: heroPhoto ? 'rgba(255,255,255,0.85)' : p.onHeroSoft,
                  }}
                >
                  <E k="hero.kicker" />
                </p>
              </div>
              <div style={{ flex: 1, minHeight: 180 }} />
              <div
                className="text-center max-w-md sm:max-w-xl md:max-w-2xl mx-auto"
                style={{
                  background: heroPhoto ? 'rgba(15,8,2,0.22)' : 'transparent',
                  backdropFilter: heroPhoto ? 'blur(12px)' : undefined,
                  WebkitBackdropFilter: heroPhoto ? 'blur(12px)' : undefined,
                  borderRadius: 16,
                  padding: '20px 24px 36px',
                  margin: '0 12px 12px',
                }}
              >
                <h1 className="font-script leading-tight" style={{ fontSize: 'clamp(44px, 7vw, 84px)' }}>
                  <ShimmerText colors={heroShimmerColors}>
                    <EditableContent field="brideName" value={data.brideName} />
                  </ShimmerText>
                </h1>
                <p
                  className="uppercase my-1"
                  style={{ fontSize: 10, letterSpacing: '0.5em', color: heroInkSoft }}
                >
                  <E k="hero.and" />
                </p>
                <h1 className="font-script leading-tight mb-3" style={{ fontSize: 'clamp(44px, 7vw, 84px)' }}>
                  <ShimmerText colors={heroShimmerColors}>
                    <EditableContent field="groomName" value={data.groomName} />
                  </ShimmerText>
                </h1>
                {data.tagline && (
                  <p className="italic" style={{ fontSize: 14, color: heroInkSoft }}>
                    <EditableContent field="tagline" value={data.tagline} multiline />
                  </p>
                )}
                {data.weddingDate && (
                  <p
                    className="uppercase mt-3"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.3em',
                      color: heroInk,
                    }}
                  >
                    {data.weddingDate.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>,
          )}

        {enabled.map((s) => partBlocks[s.id])}

        {lightboxIndex !== null && (
          <Lightbox
            images={data.galleryImages}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        )}
      </div>
    </div>
  );
}
