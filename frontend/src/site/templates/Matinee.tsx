import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import type { PartId, TemplateProps } from '../types';
import { SECTION_LABELS } from '../config';
import { MATINEE_COPY } from '../copy/templates/matinee';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { fadeUp, inViewProps, stagger } from '../motion';
import RsvpForm from '../RsvpForm';
import Lightbox from '../Lightbox';
import ScrollProgress from '../effects/ScrollProgress';
import MusicPlayer from '../effects/MusicPlayer';

const GRAIN_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/></svg>";

const { E } = makeEditable('matinee', MATINEE_COPY);

/**
 * "Vintage Matinee" — retro film-poster hero with starring credits, a
 * film-grain overlay, ticket-stub events, and slow ken-burns gallery stills.
 */
export default function Matinee({ data }: TemplateProps) {
  const p = data.palette;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const reduced = useReducedMotion();

  const coupleNames = `${data.brideName} & ${data.groomName}`;
  const enabled = data.sections.filter((s) => s.enabled);
  const hasSection = (id: PartId) => enabled.some((s) => s.id === id);
  const showHero = hasSection('hero');
  const anyEnabled = enabled.length > 0;
  const showGallery = hasSection('gallery') && data.galleryImages.length > 0;
  const showEvents = hasSection('events') && data.events.length > 0;
  const invitePage = data.pages.find((pg) => pg.kind === 'invite');
  const heroPhoto = data.galleryImages[0]?.url ?? null;

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

  return (
    <div style={{ ...vars, background: p.bg, color: p.ink }} className="min-h-screen font-body relative">
      {!data.preview && <ScrollProgress color={p.accent} />}
      {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}
      <div
        className="pointer-events-none fixed inset-0 z-30 mix-blend-overlay opacity-50"
        style={{ backgroundImage: `url("${GRAIN_SVG}")` }}
      />

      {anyEnabled && (
      <nav className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur" style={{ background: `${p.bg}E6`, borderColor: p.line }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href={`/${data.slug}`} className="font-serif-display text-lg tracking-widest" style={{ color: p.primary }}>
            {data.brideName[0]}&amp;{data.groomName[0]}
          </a>
          <div className="flex items-center gap-6">
            {invitePage && (
              <Link to={`/${data.slug}/${invitePage.pageSlug}`} className="hidden sm:block text-xs uppercase hover:opacity-60" style={{ color: p.accent, letterSpacing: '0.14em' }}>
                {invitePage.title}
              </Link>
            )}
            {data.authed && (
              <Link to={`/${data.slug}/dashboard`} className="text-xs uppercase hover:opacity-60" style={{ color: p.inkSoft, letterSpacing: '0.14em' }}>
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </nav>
      )}

      {showHero && (
      <section className="min-h-screen flex items-center pt-14 relative overflow-hidden" style={{ background: heroPhoto ? undefined : p.heroGradient }}>
        {heroPhoto && (
          <>
            <img src={heroPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'grayscale(35%) contrast(1.1)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.75))' }} />
          </>
        )}
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center w-full">
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.p variants={fadeUp} className="text-xs uppercase mb-6" style={{ color: heroPhoto ? 'rgba(255,255,255,0.75)' : p.onHeroSoft, letterSpacing: '0.4em' }}>
              <E k="hero.kicker" />
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="font-serif-display uppercase leading-[0.95] mb-6"
              style={{ color: heroPhoto ? '#fff' : p.onHero, fontSize: 'clamp(2.75rem, 8vw, 6rem)', letterSpacing: '0.02em' }}
            >
              <EditableContent field="brideName" value={data.brideName} /> &amp;{' '}
              <EditableContent field="groomName" value={data.groomName} />
            </motion.h1>
            <motion.p variants={fadeUp} className="text-sm uppercase mb-2" style={{ color: heroPhoto ? 'rgba(255,255,255,0.85)' : p.onHeroSoft, letterSpacing: '0.2em' }}>
              <E k="hero.starring" />
            </motion.p>
            {data.tagline && (
              <motion.p variants={fadeUp} className="italic text-lg mb-6" style={{ color: heroPhoto ? 'rgba(255,255,255,0.85)' : p.onHeroSoft }}>
                <EditableContent field="tagline" value={data.tagline} multiline />
              </motion.p>
            )}
            {data.weddingDate && (
              <motion.p variants={fadeUp} className="text-sm uppercase" style={{ color: heroPhoto ? '#fff' : p.onHero, letterSpacing: '0.14em' }}>
                {data.weddingDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </motion.p>
            )}
            {hasSection('rsvp') && (
              <motion.a
                variants={fadeUp}
                href="#rsvp"
                className="inline-block mt-8 px-8 py-3 text-xs font-semibold uppercase"
                style={{ background: p.accent, color: p.onAccent, letterSpacing: '0.16em' }}
              >
                <E k="hero.rsvpCta" />
              </motion.a>
            )}
          </motion.div>
        </div>
      </section>
      )}

      {enabled.map((s) => {
        if (s.id === 'story') {
          return (
            <section key="story" id="story" className="py-24 border-t text-center" style={{ borderColor: p.line }}>
              <div className="max-w-2xl mx-auto px-6">
                <p className="text-xs uppercase mb-6" style={{ color: p.accent, letterSpacing: '0.25em' }}>
                  {SECTION_LABELS.story}
                </p>
                <motion.p variants={fadeUp} {...inViewProps} className="font-serif-display text-xl leading-relaxed whitespace-pre-line" style={{ color: p.inkSoft }}>
                  <EditableContent field="story" value={data.story} multiline />
                </motion.p>
              </div>
            </section>
          );
        }
        if (s.id === 'events' && showEvents) {
          return (
            <section key="events" id="events" className="py-24 border-t" style={{ borderColor: p.line }}>
              <div className="max-w-4xl mx-auto px-6">
                <p className="text-xs uppercase mb-12 text-center" style={{ color: p.accent, letterSpacing: '0.25em' }}>
                  {SECTION_LABELS.events}
                </p>
                <motion.div variants={stagger} {...inViewProps} className="grid sm:grid-cols-2 gap-6">
                  {data.events.map((event) => {
                    const directions = directionsUrl(event.venue);
                    return (
                      <motion.div
                        key={event.id}
                        variants={fadeUp}
                        className="relative flex"
                        style={{
                          background: p.surface,
                          border: `1px dashed ${p.line}`,
                        }}
                      >
                        <div className="flex-1 p-6">
                          <p className="text-[10px] uppercase mb-2" style={{ color: p.accent, letterSpacing: '0.2em' }}>
                            <E k="events.admitOne" />
                          </p>
                          <h3 className="font-serif-display text-2xl mb-2" style={{ color: p.primary }}>
                            {event.name}
                          </h3>
                          <p className="text-sm" style={{ color: p.inkSoft }}>
                            {formatEventDate(event.date)}
                          </p>
                          <p className="text-sm mb-3" style={{ color: p.inkSoft }}>
                            {formatEventTime(event.start_time)}
                          </p>
                          {event.venue && (
                            <p className="text-sm mb-3" style={{ color: p.inkSoft }}>
                              {event.venue.name}
                              {event.venue.city ? `, ${event.venue.city}` : ''}
                            </p>
                          )}
                          <div className="flex gap-4 text-xs font-semibold uppercase" style={{ letterSpacing: '0.08em' }}>
                            <a href={calendarUrl(event, coupleNames)} download={icsFileName(event.name)} className="underline underline-offset-4" style={{ color: p.accent }}>
                              <E k="events.calendar" />
                            </a>
                            {directions && (
                              <a href={directions} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4" style={{ color: p.accent }}>
                                <E k="events.directions" />
                              </a>
                            )}
                          </div>
                        </div>
                        <div
                          className="w-14 flex items-center justify-center"
                          style={{
                            borderLeft: `1px dashed ${p.line}`,
                            writingMode: 'vertical-rl',
                            color: p.accent,
                            fontSize: 10,
                            letterSpacing: '0.3em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {event.event_type || 'Ticket'}
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
            <section key="gallery" id="gallery" className="py-24 border-t" style={{ borderColor: p.line }}>
              <div className="max-w-5xl mx-auto px-6">
                <p className="text-xs uppercase mb-10 text-center" style={{ color: p.accent, letterSpacing: '0.25em' }}>
                  {data.gallerySubtitle || SECTION_LABELS.gallery}
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {data.galleryImages.map((image, i) => (
                    <button key={image.url} onClick={() => setLightboxIndex(i)} className="overflow-hidden">
                      <motion.img
                        src={image.url}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                        style={{ aspectRatio: '4/5', filter: 'grayscale(15%)' }}
                        initial={{ scale: 1 }}
                        whileHover={reduced ? {} : { scale: 1.08 }}
                        transition={{ duration: 6, ease: 'linear' }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </section>
          );
        }
        if (s.id === 'rsvp') {
          return (
            <section key="rsvp" id="rsvp" className="py-24 border-t" style={{ borderColor: p.line }}>
              <div className="max-w-xl mx-auto px-6 text-center">
                <p className="text-xs uppercase mb-6" style={{ color: p.accent, letterSpacing: '0.25em' }}>
                  {SECTION_LABELS.rsvp}
                </p>
                <h2 className="font-serif-display text-4xl mb-8 uppercase" style={{ color: p.primary }}>
                  <E k="rsvp.heading" />
                </h2>
                <RsvpForm slug={data.slug} preview={data.preview} />
              </div>
            </section>
          );
        }
        return null;
      })}

      {anyEnabled && (
      <footer className="py-16 border-t text-center" style={{ borderColor: p.line }}>
        <p className="font-serif-display text-2xl uppercase mb-2" style={{ color: p.primary, letterSpacing: '0.1em' }}>
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
        <Lightbox images={data.galleryImages} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNavigate={setLightboxIndex} />
      )}
    </div>
  );
}
