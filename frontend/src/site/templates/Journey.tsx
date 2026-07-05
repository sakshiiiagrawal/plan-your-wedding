import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import type { PartId, TemplateProps } from '../types';
import { SECTION_LABELS } from '../config';
import { SharedE } from '../copy/shared';
import { JOURNEY_COPY } from '../copy/templates/journey';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { fadeUp, inViewProps, stagger } from '../motion';
import RsvpForm from '../RsvpForm';
import Lightbox from '../Lightbox';
import ScrollProgress from '../effects/ScrollProgress';
import MusicPlayer from '../effects/MusicPlayer';

const { E } = makeEditable('journey', JOURNEY_COPY);

interface Milestone {
  key: string;
  title: React.ReactNode;
  subtitle?: string | undefined;
  body: React.ReactNode;
  photo?: string | undefined;
  cta?: { label: React.ReactNode; href: string; download?: string }[] | undefined;
}

/**
 * "Our Journey" — vertical scrollytelling timeline: a center spine that
 * draws with scroll progress, milestones alternating left/right, gallery
 * photos woven in as tilted snapshots. RSVP is the final milestone.
 */
export default function Journey({ data }: TemplateProps) {
  const p = data.palette;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { scrollYProgress } = useScroll();
  const spineScale = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  const coupleNames = `${data.brideName} & ${data.groomName}`;
  const enabled = data.sections.filter((s) => s.enabled);
  const hasSection = (id: PartId) => enabled.some((s) => s.id === id);
  const showHero = hasSection('hero');
  const anyEnabled = enabled.length > 0;
  const showGallery = hasSection('gallery') && data.galleryImages.length > 0;
  const showEvents = hasSection('events') && data.events.length > 0;
  const invitePage = data.pages.find((pg) => pg.kind === 'invite');

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

  // Timeline items follow the couple's saved section order; 'rsvp' is a
  // marker slot rendered as the RSVP milestone, gallery photos are woven in.
  const timeline: (Milestone | 'rsvp')[] = [];
  for (const s of enabled) {
    if (s.id === 'story') {
      timeline.push({
        key: 'story',
        title: <E k="story.title" />,
        body: <EditableContent field="story" value={data.story} multiline />,
        photo: data.galleryImages[0]?.url,
      });
    } else if (s.id === 'events' && showEvents) {
      data.events.forEach((event, i) => {
        const directions = directionsUrl(event.venue);
        timeline.push({
          key: event.id,
          title: event.name,
          subtitle: `${formatEventDate(event.date)} · ${formatEventTime(event.start_time)}`,
          body: [event.venue?.name, event.venue?.city].filter(Boolean).join(', ') || (event.description ?? ''),
          photo: showGallery ? data.galleryImages[i + 1]?.url : undefined,
          cta: [
            { label: <SharedE k="events.addToCalendar" />, href: calendarUrl(event, coupleNames), download: icsFileName(event.name) },
            ...(directions ? [{ label: <E k="events.directions" />, href: directions }] : []),
          ],
        });
      });
    } else if (s.id === 'rsvp') {
      timeline.push('rsvp');
    }
  }

  return (
    <div style={{ ...vars, background: p.bg, color: p.ink }} className="min-h-screen font-body">
      {!data.preview && <ScrollProgress color={p.accent} />}
      {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}

      {anyEnabled && (
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur"
        style={{ background: `${p.bg}E6`, borderColor: p.line }}
      >
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href={`/${data.slug}`} className="font-serif-display text-lg" style={{ color: p.primary }}>
            {data.brideName[0]}
            <span style={{ color: p.accent }}>&amp;</span>
            {data.groomName[0]}
          </a>
          <div className="flex items-center gap-6">
            {invitePage && (
              <Link
                to={`/${data.slug}/${invitePage.pageSlug}`}
                className="hidden sm:block text-xs uppercase hover:opacity-60"
                style={{ color: p.accent, letterSpacing: '0.14em' }}
              >
                {invitePage.title}
              </Link>
            )}
            {data.authed && (
              <Link
                to={`/${data.slug}/dashboard`}
                className="text-xs uppercase hover:opacity-60"
                style={{ color: p.inkSoft, letterSpacing: '0.14em' }}
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </nav>
      )}

      {showHero && (
      <section
        className="min-h-screen flex items-center justify-center text-center pt-14 px-6"
        style={{ background: p.heroGradient }}
      >
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.p
            variants={fadeUp}
            className="text-xs uppercase mb-8"
            style={{ color: p.onHeroSoft, letterSpacing: '0.3em' }}
          >
            <E k="hero.kicker" />
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="font-serif-display leading-[0.95] mb-8"
            style={{ color: p.onHero, fontSize: 'clamp(2.75rem, 7vw, 5.5rem)' }}
          >
            <EditableContent field="brideName" value={data.brideName} />
            <span className="italic" style={{ color: p.accent }}>
              {' '}
              &amp;{' '}
            </span>
            <EditableContent field="groomName" value={data.groomName} />
          </motion.h1>
          {data.tagline && (
            <motion.p variants={fadeUp} className="font-serif-display italic text-xl mb-6" style={{ color: p.onHeroSoft }}>
              <EditableContent field="tagline" value={data.tagline} multiline />
            </motion.p>
          )}
          {data.weddingDate && (
            <motion.p variants={fadeUp} className="text-sm uppercase" style={{ color: p.onHero, letterSpacing: '0.14em' }}>
              {data.weddingDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </motion.p>
          )}
        </motion.div>
      </section>
      )}

      {/* Timeline */}
      <section className="relative py-24 max-w-4xl mx-auto px-6">
        <div className="absolute left-1/2 top-0 bottom-0 w-px hidden sm:block" style={{ background: p.line, transform: 'translateX(-50%)' }} />
        <motion.div
          className="absolute left-1/2 top-0 w-px hidden sm:block"
          style={{ background: p.accent, transform: 'translateX(-50%)', height: '100%', scaleY: spineScale, transformOrigin: 'top' }}
        />
        <div className="space-y-20">
          {timeline.map((item, i) => {
            if (item === 'rsvp') {
              return (
                <motion.div key="rsvp" id="rsvp" variants={fadeUp} {...inViewProps} className="relative pt-4 text-center">
                  <div
                    className="absolute left-1/2 hidden sm:flex items-center justify-center w-4 h-4 rounded-full"
                    style={{ background: p.accent, transform: 'translate(-50%, 0)', top: 6, zIndex: 2 }}
                  />
                  <p className="text-xs uppercase mb-2" style={{ color: p.accent, letterSpacing: '0.2em' }}>
                    {SECTION_LABELS.rsvp}
                  </p>
                  <h3 className="font-serif-display text-3xl mb-8" style={{ color: p.primary }}>
                    <E k="rsvp.heading" />
                  </h3>
                  <div className="max-w-lg mx-auto">
                    <RsvpForm slug={data.slug} preview={data.preview} />
                  </div>
                </motion.div>
              );
            }
            const m = item;
            return (
              <div key={m.key} className={`relative grid sm:grid-cols-2 gap-8 items-center ${i % 2 ? 'sm:[&>*:first-child]:order-2' : ''}`}>
                <div
                  className="absolute left-1/2 hidden sm:flex items-center justify-center w-4 h-4 rounded-full"
                  style={{ background: p.accent, transform: 'translate(-50%, 0)', top: 6, zIndex: 2 }}
                />
                <motion.div variants={fadeUp} {...inViewProps} className={i % 2 ? 'sm:text-left' : 'sm:text-right'}>
                  {m.subtitle && (
                    <p className="text-xs uppercase mb-2" style={{ color: p.accent, letterSpacing: '0.2em' }}>
                      {m.subtitle}
                    </p>
                  )}
                  <h3 className="font-serif-display text-3xl mb-3" style={{ color: p.primary }}>
                    {m.title}
                  </h3>
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: p.inkSoft }}>
                    {m.body}
                  </p>
                  {m.cta && (
                    <div className={`mt-4 flex gap-5 text-xs font-medium uppercase ${i % 2 ? 'justify-start' : 'sm:justify-end'}`} style={{ letterSpacing: '0.08em' }}>
                      {m.cta.map((c) => (
                        <a
                          key={c.href}
                          href={c.href}
                          download={c.download}
                          target={c.download ? undefined : '_blank'}
                          rel={c.download ? undefined : 'noopener noreferrer'}
                          className="underline underline-offset-4"
                          style={{ color: p.accent }}
                        >
                          {c.label}
                        </a>
                      ))}
                    </div>
                  )}
                </motion.div>
                {m.photo ? (
                  <motion.div
                    initial={{ opacity: 0, rotate: i % 2 ? 3 : -3, scale: 0.94 }}
                    whileInView={{ opacity: 1, rotate: i % 2 ? 2 : -2, scale: 1 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.7 }}
                    className="overflow-hidden"
                    style={{ border: `4px solid ${p.surface}`, boxShadow: '0 12px 32px -12px rgba(0,0,0,0.3)' }}
                  >
                    <button onClick={() => setLightboxIndex(data.galleryImages.findIndex((g) => g.url === m.photo))} className="block w-full">
                      <img src={m.photo} alt="" loading="lazy" className="w-full object-cover" style={{ aspectRatio: '4/3' }} />
                    </button>
                  </motion.div>
                ) : (
                  <div />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {anyEnabled && (
      <footer className="py-16 border-t text-center" style={{ borderColor: p.line }}>
        <p className="font-serif-display text-2xl mb-2" style={{ color: p.primary }}>
          {coupleNames}
        </p>
        {data.weddingDate && (
          <p className="text-xs uppercase" style={{ color: p.inkSoft, letterSpacing: '0.14em' }}>
            {data.weddingDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </footer>
      )}

      {lightboxIndex !== null && lightboxIndex >= 0 && (
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
