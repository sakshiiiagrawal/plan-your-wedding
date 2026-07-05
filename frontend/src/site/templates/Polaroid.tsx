import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { PartId, PublicEvent, TemplateProps } from '../types';
import { POLAROID_COPY } from '../copy/templates/polaroid';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { fadeUp, inViewProps, stagger } from '../motion';
import RsvpForm from '../RsvpForm';
import Lightbox from '../Lightbox';
import ShimmerText from '../effects/ShimmerText';
import MusicPlayer from '../effects/MusicPlayer';

const ROTATIONS = [-8, 5, -3, 9, -6];

const { E } = makeEditable('polaroid', POLAROID_COPY);

function PolaroidStack({
  photos,
  preview,
  onComplete,
}: {
  photos: { url: string }[];
  preview?: boolean | undefined;
  onComplete: () => void;
}) {
  const [scattered, setScattered] = useState(false);
  const handleTap = () => {
    if (scattered) return;
    setScattered(true);
    setTimeout(onComplete, 900);
  };

  const slots = photos.length > 0 ? photos.slice(0, 5) : [{ url: '' }];

  return (
    <motion.div
      onClick={handleTap}
      animate={scattered ? { opacity: 0 } : { opacity: 1 }}
      transition={scattered ? { delay: 0.7, duration: 0.4 } : { duration: 0.2 }}
      style={
        preview
          ? {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '100svh',
              background: '#F5F8F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 100,
            }
          : {
              position: 'fixed',
              inset: 0,
              background: '#F5F8F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 100,
            }
      }
    >
      <div style={{ position: 'relative', width: 200, height: 240 }}>
        {slots.map((photo, i) => {
          const rot = ROTATIONS[i % ROTATIONS.length]!;
          return (
            <motion.div
              key={i}
              animate={
                scattered
                  ? { x: (i - 2) * 90, y: (i % 2 ? -1 : 1) * 60, rotate: rot * 2.4, opacity: 0 }
                  : { x: 0, y: 0, rotate: rot, opacity: 1 }
              }
              transition={{ type: 'spring', stiffness: 180, damping: 16, delay: scattered ? i * 0.03 : 0 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: '#fff',
                padding: 10,
                boxShadow: '0 10px 24px -8px rgba(0,0,0,0.3)',
              }}
            >
              {photo.url ? (
                <img src={photo.url} alt="" className="w-full h-4/5 object-cover" />
              ) : (
                <div className="w-full h-4/5" style={{ background: '#6E9A79' }} />
              )}
              <div className="h-1/5" />
            </motion.div>
          );
        })}
      </div>
      <p className="uppercase" style={{ position: 'absolute', bottom: 60, fontSize: 11, letterSpacing: '0.3em', color: '#33402F' }}>
        <E k="envelope.tapToScatter" />
      </p>
    </motion.div>
  );
}

function EventCard({ event, coupleNames, p, index }: { event: PublicEvent; coupleNames: string; p: TemplateProps['data']['palette']; index: number }) {
  const directions = directionsUrl(event.venue);
  const rot = ROTATIONS[index % ROTATIONS.length]! / 4;
  return (
    <motion.div
      variants={fadeUp}
      className="relative p-4 mx-auto"
      style={{ background: '#fff', width: 260, transform: `rotate(${rot}deg)`, boxShadow: '0 8px 20px -8px rgba(0,0,0,0.2)' }}
    >
      <p className="font-script text-center mb-2" style={{ fontSize: 22, color: p.primary }}>{event.name}</p>
      <p className="text-xs text-center mb-1" style={{ color: p.ink }}>{formatEventDate(event.date)}</p>
      <p className="text-xs text-center mb-3" style={{ color: p.inkSoft }}>{formatEventTime(event.start_time)}</p>
      <div className="flex justify-center gap-3 text-[10px] uppercase" style={{ letterSpacing: '0.1em' }}>
        <a href={calendarUrl(event, coupleNames)} download={icsFileName(event.name)} className="underline" style={{ color: p.accent }}><E k="events.calendar" /></a>
        {directions && <a href={directions} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: p.accent }}><E k="events.map" /></a>}
      </div>
    </motion.div>
  );
}

/**
 * "Polaroid Stack" — stacked polaroids intro that spring-scatter on tap to
 * reveal the hero; script captions; gallery as a rotated polaroid grid;
 * events as pinned notes.
 */
export default function Polaroid({ data }: TemplateProps) {
  const p = data.palette;
  const enabled = data.sections.filter((s) => s.enabled);
  const hasSection = (id: PartId) => enabled.some((s) => s.id === id);
  const envelopeEnabled = hasSection('envelope');
  const showHero = hasSection('hero');
  const [opened, setOpened] = useState(
    () => !envelopeEnabled || (!data.preview && sessionStorage.getItem(`invited:${data.slug}`) === 'true'),
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const coupleNames = `${data.brideName} & ${data.groomName}`;
  const websitePage = data.pages.find((pg) => pg.kind === 'website');
  const heroPhoto = data.galleryImages[0]?.url ?? null;

  const cssVars = {
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
    <div style={{ background: '#33402F' }}>
      <div className="relative w-full overflow-x-hidden font-serif-display" style={{ ...cssVars, background: p.bg, color: p.ink }}>
        {envelopeEnabled && !opened && (
          <PolaroidStack
            photos={data.galleryImages}
            preview={data.preview}
            onComplete={() => {
              if (!data.preview) sessionStorage.setItem(`invited:${data.slug}`, 'true');
              setOpened(true);
              data.onIntroOpen?.();
            }}
          />
        )}
        {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}

        {showHero && (
          <section className="relative flex flex-col items-center justify-center text-center px-8" style={{ minHeight: '100svh' }}>
            {heroPhoto ? (
              <img src={heroPhoto} alt="" loading="eager" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0" style={{ background: p.heroGradient }} />
            )}
            <div className="absolute inset-0" style={{ background: 'rgba(51,64,47,0.35)' }} />
            <div className="relative z-10 max-w-md sm:max-w-xl md:max-w-2xl mx-auto">
              <h1 className="font-script leading-tight" style={{ fontSize: 'clamp(46px, 7vw, 84px)', color: '#fff' }}>
                <ShimmerText colors={['#fff', p.accent, '#fff']}>
                  <EditableContent field="brideName" value={data.brideName} />
                </ShimmerText>
              </h1>
              <p className="uppercase my-2" style={{ fontSize: 10, letterSpacing: '0.5em', color: 'rgba(255,255,255,0.9)' }}><E k="hero.and" /></p>
              <h1 className="font-script leading-tight mb-4" style={{ fontSize: 'clamp(46px, 7vw, 84px)', color: '#fff' }}>
                <ShimmerText colors={['#fff', p.accent, '#fff']}>
                  <EditableContent field="groomName" value={data.groomName} />
                </ShimmerText>
              </h1>
              {data.tagline && (
                <p className="italic mb-3" style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
                  <EditableContent field="tagline" value={data.tagline} multiline />
                </p>
              )}
              {data.weddingDate && (
                <p className="uppercase" style={{ fontSize: 10, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.9)' }}>
                  {data.weddingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </section>
        )}

        {enabled.map((s) => {
          if (s.id === 'story') {
            return (
              <section key="story" className="flex items-center justify-center text-center px-8 py-24" style={{ minHeight: '70svh' }}>
                <motion.div variants={fadeUp} {...inViewProps} className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto">
                  <p className="uppercase mb-5" style={{ fontSize: 10, letterSpacing: '0.4em', color: p.accent }}><E k="story.eyebrow" /></p>
                  <p className="font-serif-display text-xl leading-relaxed whitespace-pre-line" style={{ color: p.inkSoft }}><EditableContent field="story" value={data.story} multiline /></p>
                </motion.div>
              </section>
            );
          }
          if (s.id === 'gallery') {
            return data.galleryImages.length > 0 ? (
              <section key="gallery" className="py-24 px-6" style={{ background: p.surface }}>
                <p className="uppercase text-center mb-10" style={{ fontSize: 10, letterSpacing: '0.4em', color: p.accent }}><E k="gallery.heading" /></p>
                <motion.div variants={stagger} {...inViewProps} className="grid grid-cols-2 gap-6 place-items-center max-w-md sm:max-w-lg mx-auto">
                  {data.galleryImages.map((image, i) => (
                    <motion.button
                      key={image.url}
                      variants={fadeUp}
                      onClick={() => setLightboxIndex(i)}
                      className="p-2 bg-white"
                      style={{ transform: `rotate(${ROTATIONS[i % ROTATIONS.length]! / 2}deg)`, boxShadow: '0 8px 20px -8px rgba(0,0,0,0.25)' }}
                    >
                      <img src={image.url} alt="" loading="lazy" className="w-full object-cover" style={{ aspectRatio: '1/1', width: 140 }} />
                    </motion.button>
                  ))}
                </motion.div>
              </section>
            ) : null;
          }
          if (s.id === 'events') {
            return data.events.length > 0 ? (
              <section key="events" className="py-24 px-6">
                <p className="uppercase text-center mb-10" style={{ fontSize: 10, letterSpacing: '0.4em', color: p.accent }}><E k="events.heading" /></p>
                <motion.div variants={stagger} {...inViewProps} className="space-y-8 max-w-md sm:max-w-xl mx-auto">
                  {data.events.map((event, i) => (
                    <EventCard key={event.id} event={event} coupleNames={coupleNames} p={p} index={i} />
                  ))}
                </motion.div>
              </section>
            ) : null;
          }
          if (s.id === 'rsvp') {
            return (
              <section key="rsvp" id="rsvp" className="flex flex-col items-center justify-center px-6 py-24" style={{ minHeight: '100svh', background: p.surface }}>
                <motion.div variants={fadeUp} {...inViewProps} className="w-full max-w-md sm:max-w-lg mx-auto">
                  <p className="uppercase text-center mb-3" style={{ fontSize: 10, letterSpacing: '0.4em', color: p.accent }}><E k="rsvp.eyebrow" /></p>
                  <h2 className="font-script text-center mb-8" style={{ fontSize: 40, color: p.primary }}><E k="rsvp.heading" /></h2>
                  <RsvpForm slug={data.slug} preview={data.preview} />
                </motion.div>
              </section>
            );
          }
          if (s.id === 'final') {
            return (
              <section key="final" className="flex flex-col items-center justify-center text-center px-8 py-24" style={{ minHeight: '50svh' }}>
                <motion.div variants={fadeUp} {...inViewProps} className="max-w-md sm:max-w-xl mx-auto">
                  <p className="font-script mb-3" style={{ fontSize: 36, color: p.ink }}><ShimmerText>{coupleNames}</ShimmerText></p>
                  <p className="uppercase" style={{ fontSize: 10, letterSpacing: '0.35em', color: p.inkSoft }}><E k="final.note" /></p>
                  <div className="mt-10 flex flex-col items-center gap-3">
                    {websitePage && (
                      <Link to={`/${data.slug}`} className="text-xs uppercase hover:opacity-60 underline underline-offset-4" style={{ color: p.accent, letterSpacing: '0.2em' }}><E k="final.website" /></Link>
                    )}
                    {data.authed && (
                      <Link to={`/${data.slug}/dashboard`} className="text-xs uppercase hover:opacity-60" style={{ color: p.inkSoft, letterSpacing: '0.2em' }}>Dashboard</Link>
                    )}
                  </div>
                </motion.div>
              </section>
            );
          }
          return null;
        })}

        {lightboxIndex !== null && (
          <Lightbox images={data.galleryImages} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onNavigate={setLightboxIndex} />
        )}
      </div>
    </div>
  );
}
