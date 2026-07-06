import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
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

/**
 * "Garden Romance" — soft pastel washes, arch silhouettes, italic serif,
 * centered storybook composition. Arches hold real couple photos when the
 * gallery has them.
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

  const divider = (
    <div className="flex items-center justify-center gap-2 mb-10" aria-hidden>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.accent }} />
      <span className="w-2 h-2 rounded-full" style={{ background: p.accent }} />
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.accent }} />
    </div>
  );

  const heading = (text: React.ReactNode) => (
    <motion.div variants={fadeUp}>
      <h2
        className="font-serif-display italic text-4xl sm:text-5xl text-center mb-4"
        style={{ color: p.primary }}
      >
        {text}
      </h2>
      {divider}
    </motion.div>
  );

  const sectionBlocks: Partial<Record<PartId, React.ReactNode>> = {
    story: (
      <section key="story" id="story" className="py-24">
        <motion.div
          variants={stagger}
          {...inViewProps}
          className="max-w-3xl mx-auto px-6 text-center"
        >
          {heading(<E k="story.heading" />)}
          <motion.p
            variants={fadeUp}
            className="font-serif-display text-xl leading-relaxed whitespace-pre-line"
            style={{ color: p.inkSoft }}
          >
            <EditableContent field="story" value={data.story} multiline />
          </motion.p>

          <div className="flex justify-center gap-10 sm:gap-16 mt-14">
            {[
              { name: data.brideName, photo: data.galleryImages[1]?.url ?? null },
              { name: data.groomName, photo: data.galleryImages[2]?.url ?? null },
            ].map((person) => (
              <motion.div key={person.name} variants={fadeUp} className="text-center">
                {/* Arch silhouette — holds a real photo when available */}
                <div
                  className="w-32 h-40 sm:w-40 sm:h-52 mx-auto mb-4 overflow-hidden flex items-end justify-center"
                  style={{
                    background: person.photo ? undefined : p.heroGradient,
                    borderRadius: '999px 999px 18px 18px',
                    border: `1px solid ${p.line}`,
                  }}
                >
                  {person.photo ? (
                    <img
                      src={person.photo}
                      alt={person.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-script text-5xl pb-6" style={{ color: p.onHero }}>
                      {person.name[0]}
                    </span>
                  )}
                </div>
                <p className="font-serif-display text-2xl" style={{ color: p.primary }}>
                  {person.name}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>
    ),

    events: showEvents ? (
      <section key="events" id="events" className="py-24" style={{ background: p.surface }}>
        <motion.div variants={stagger} {...inViewProps} className="max-w-3xl mx-auto px-6">
          {heading(<E k="events.heading" />)}
          <div className="space-y-6">
            {data.events.map((event) => {
              const directions = directionsUrl(event.venue);
              return (
                <motion.div
                  key={event.id}
                  variants={fadeUp}
                  className="rounded-3xl p-8 text-center"
                  style={{ background: p.bg, border: `1px solid ${p.line}` }}
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
              );
            })}
          </div>
        </motion.div>
      </section>
    ) : null,

    rsvp: (
      <section key="rsvp" id="rsvp" className="py-24" style={{ background: p.heroGradient }}>
        <motion.div variants={stagger} {...inViewProps} className="max-w-2xl mx-auto px-6">
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
          <motion.div variants={fadeUp}>
            <RsvpForm slug={data.slug} preview={data.preview} />
          </motion.div>
        </motion.div>
      </section>
    ),

    gallery: showGallery ? (
      <section key="gallery" id="gallery" className="py-24">
        <motion.div variants={stagger} {...inViewProps} className="max-w-4xl mx-auto px-6">
          {heading(<E k="gallery.heading" />)}
          {data.gallerySubtitle && (
            <motion.p
              variants={fadeUp}
              className="text-center -mt-6 mb-10"
              style={{ color: p.inkSoft }}
            >
              {data.gallerySubtitle}
            </motion.p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {data.galleryImages.map((image, i) => (
              <motion.button
                key={image.url}
                variants={fadeUp}
                onClick={() => setLightboxIndex(i)}
                className="overflow-hidden group"
                style={{
                  borderRadius: i % 2 === 0 ? '999px 999px 20px 20px' : '20px',
                  aspectRatio: '4 / 5',
                }}
              >
                <img
                  src={image.url}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
      {!data.preview && <ScrollProgress color={p.accent} />}
      {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}

      {/* Nav */}
      {anyEnabled && (
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur border-b"
        style={{ background: `${p.bg}E6`, borderColor: p.line }}
      >
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-center gap-7">
          <a href={`/${data.slug}`} className="font-script text-xl" style={{ color: p.primary }}>
            {data.brideName[0]} &amp; {data.groomName[0]}
          </a>
          {enabled
            .filter(
              (s) =>
                SECTION_LABELS[s.id] &&
                (s.id !== 'gallery' || showGallery) &&
                (s.id !== 'events' || showEvents),
            )
            .map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="hidden sm:block text-sm hover:opacity-60"
                style={{ color: p.inkSoft }}
              >
                {SECTION_LABELS[s.id]}
              </a>
            ))}
          {invitePage && (
            <Link
              to={`/${data.slug}/${invitePage.pageSlug}`}
              className="hidden sm:block text-sm hover:opacity-60"
              style={{ color: p.accent }}
            >
              {invitePage.title}
            </Link>
          )}
          {data.authed && (
            <Link
              to={`/${data.slug}/dashboard`}
              className="text-sm hover:opacity-60"
              style={{ color: p.accent }}
            >
              Dashboard
            </Link>
          )}
        </div>
      </nav>
      )}

      {/* Hero */}
      {showHero && (
      <section
        className="min-h-screen flex items-center justify-center pt-14 px-6 relative overflow-hidden"
        style={{ background: p.heroGradient }}
      >
        <PetalDrift color={p.accent} />
        {/* Arch outline echoing the portrait arches below — the template's motif */}
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
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="text-center py-20 relative z-10"
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
      <footer className="py-14 text-center" style={{ background: p.surface }}>
        <p className="font-script text-3xl mb-2" style={{ color: p.primary }}>
          {coupleNames}
        </p>
        <p className="text-sm" style={{ color: p.inkSoft }}>
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
