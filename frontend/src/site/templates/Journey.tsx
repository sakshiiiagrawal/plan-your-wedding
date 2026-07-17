import SiteImage from '../SiteImage';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import type { PartId, TemplateProps } from '../types';
import { SECTION_LABELS } from '../config';
import { SharedE } from '../copy/shared';
import { JOURNEY_COPY } from '../copy/templates/journey';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { motionPreset } from '../motion';
import { JOURNEY_EFFECTS, resolveEffects, SiteEffectsContext } from '../effects/schema';
import { hoverPreset } from '../effects/hover';
import { siteVars } from '../theme';
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

const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];

/**
 * "Our Journey" — reimagined as The Storybook: the couple's site as a book.
 * The hero is the cover page, every milestone is a chapter with a roman
 * numeral folio and a polaroid snapshot, a spine draws with scroll progress,
 * and the RSVP is the next chapter — the one the guest writes themselves into.
 */
export default function Journey({ data }: TemplateProps) {
  const p = data.palette;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { scrollYProgress } = useScroll();
  const spineScale = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const reduced = useReducedMotion() ?? false;

  // Effect controls: scrollAnim shadows the motion imports, galleryHover
  // styles the pasted polaroids.
  const fx = resolveEffects(JOURNEY_EFFECTS, data.effects);
  const { fadeUp, stagger, inViewProps, still } = motionPreset(fx.scrollAnim!);
  const galleryHover = hoverPreset(fx.galleryHover!);

  const coupleNames = `${data.brideName} & ${data.groomName}`;
  const enabled = data.sections.filter((s) => s.enabled);
  const hasSection = (id: PartId) => enabled.some((s) => s.id === id);
  const showHero = hasSection('hero');
  const anyEnabled = enabled.length > 0;
  const showGallery = hasSection('gallery') && data.galleryImages.length > 0;
  const showEvents = hasSection('events') && data.events.length > 0;
  const invitePage = data.pages.find((pg) => pg.kind === 'invite');

  const vars = siteVars(p);

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

  // The center spine only makes sense when photos anchor the two-column layout.
  // With no photos every milestone would be centered *on* the line (text struck
  // through), so we drop the spine and render a clean centered list instead.
  const anyPhotos = timeline.some((it) => it !== 'rsvp' && Boolean(it.photo));

  // Chapter numbering counts real milestones; the RSVP marker takes the next one.
  let chapterIdx = 0;

  const chapterLabel = (n: number) => (
    <p className="text-xs uppercase mb-2 flex items-center gap-3" style={{ color: p.accent, letterSpacing: '0.24em' }}>
      <E k="chapter.label" /> {ROMANS[n] ?? n + 1}
    </p>
  );

  return (
    <SiteEffectsContext.Provider value={fx}>
    <div style={{ ...vars, background: p.bg, color: p.ink }} className="min-h-screen font-body">
      <ScrollProgress color={p.accent} />
      {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}

      {/* Hero — the cover of the book */}
      {showHero && (
      <section
        className="min-h-[88vh] flex items-center justify-center text-center pt-20 pb-16 px-6 relative overflow-hidden"
        style={{ background: p.heroGradient }}
      >
        {/* Nav — transparent, lives inside the hero rather than as a separate chrome bar */}
        {anyEnabled && (
        <nav className="absolute top-0 left-0 right-0 z-20">
          <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href={`/${data.slug}`} className="font-serif-display text-lg" style={{ color: p.onHero }}>
              {data.brideName[0]}
              <span style={{ color: p.accent }}>&amp;</span>
              {data.groomName[0]}
            </a>
            <div className="flex items-center gap-6">
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
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="relative w-full max-w-2xl px-8 py-16 sm:px-16 sm:py-20"
          style={{ border: `1px solid color-mix(in srgb, ${p.onHeroSoft} 55%, transparent)` }}
        >
          {/* Inner rule + corner ticks: an embossed cover plate */}
          <div
            className="absolute inset-2.5 pointer-events-none"
            style={{ border: `1px solid color-mix(in srgb, ${p.onHeroSoft} 35%, transparent)` }}
            aria-hidden
          />
          {[
            'top-0 left-0 border-t-2 border-l-2',
            'top-0 right-0 border-t-2 border-r-2',
            'bottom-0 left-0 border-b-2 border-l-2',
            'bottom-0 right-0 border-b-2 border-r-2',
          ].map((pos) => (
            <span
              key={pos}
              className={`absolute w-4 h-4 ${pos}`}
              style={{ borderColor: p.accent }}
              aria-hidden
            />
          ))}
          <motion.p
            variants={fadeUp}
            className="text-xs uppercase mb-8"
            style={{ color: p.onHeroSoft, letterSpacing: '0.34em' }}
          >
            <E k="hero.kicker" />
          </motion.p>
          <motion.p
            variants={fadeUp}
            className="font-serif-display italic text-2xl mb-4"
            style={{ color: p.onHeroSoft }}
          >
            <E k="hero.coverTitle" />
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="font-serif-display leading-[1.02] mb-8"
            style={{ color: p.onHero, fontSize: 'clamp(2.75rem, 7vw, 5rem)' }}
          >
            <EditableContent field="brideName" value={data.brideName} />
            <span className="italic" style={{ color: p.accent }}>
              {' '}
              &amp;{' '}
            </span>
            <EditableContent field="groomName" value={data.groomName} />
          </motion.h1>
          {data.tagline && (
            <motion.p variants={fadeUp} className="font-serif-display italic text-xl mb-8" style={{ color: p.onHeroSoft }}>
              <EditableContent field="tagline" value={data.tagline} multiline />
            </motion.p>
          )}
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-4" aria-hidden>
            <span className="h-px w-10" style={{ background: `color-mix(in srgb, ${p.onHeroSoft} 60%, transparent)` }} />
            <span style={{ color: p.accent }}>❦</span>
            <span className="h-px w-10" style={{ background: `color-mix(in srgb, ${p.onHeroSoft} 60%, transparent)` }} />
          </motion.div>
          {data.weddingDate && (
            <motion.p variants={fadeUp} className="mt-8 text-sm uppercase" style={{ color: p.onHero, letterSpacing: '0.18em' }}>
              <span style={{ color: p.onHeroSoft }}><E k="hero.beginsOn" /> </span>
              {data.weddingDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </motion.p>
          )}
        </motion.div>
      </section>
      )}

      {/* Timeline */}
      <section className="py-24 max-w-4xl mx-auto px-6">
        {/* The spine lives inside the items wrapper so it spans exactly first→last
            milestone — never bleeding into the section padding or the footer. */}
        <div className="relative space-y-24">
          {anyPhotos && (
            <>
              <div className="absolute left-1/2 top-2 bottom-2 w-px hidden sm:block" style={{ background: p.line, transform: 'translateX(-50%)' }} />
              <motion.div
                className="absolute left-1/2 top-2 w-px hidden sm:block"
                style={{ background: p.accent, transform: 'translateX(-50%)', height: '100%', scaleY: spineScale, transformOrigin: 'top' }}
              />
            </>
          )}
          {timeline.map((item, i) => {
            if (item === 'rsvp') {
              const n = chapterIdx++;
              return (
                <motion.div key="rsvp" id="rsvp" variants={fadeUp} {...inViewProps} className="relative z-10 pt-10 text-center" style={{ background: p.bg }}>
                  {anyPhotos && (
                    <div
                      className="absolute left-1/2 hidden sm:flex items-center justify-center w-4 h-4 rounded-full"
                      style={{ background: p.accent, transform: 'translate(-50%, 0)', top: -8, zIndex: 2 }}
                    />
                  )}
                  <p className="text-xs uppercase mb-2" style={{ color: p.accent, letterSpacing: '0.24em' }}>
                    <E k="chapter.label" /> {ROMANS[n] ?? n + 1} — {SECTION_LABELS.rsvp}
                  </p>
                  <h3 className="font-serif-display text-3xl sm:text-4xl mb-3" style={{ color: p.primary }}>
                    <E k="rsvp.heading" />
                  </h3>
                  <p className="font-serif-display italic mb-10" style={{ color: p.inkSoft }}>
                    <E k="rsvp.subheading" />
                  </p>
                  <div className="max-w-lg mx-auto">
                    <RsvpForm slug={data.slug} preview={data.preview} />
                  </div>
                </motion.div>
              );
            }
            const m = item;
            const n = chapterIdx++;
            const hasPhoto = Boolean(m.photo);
            return (
              <div
                key={m.key}
                className={`relative gap-x-14 gap-y-8 items-center ${
                  anyPhotos ? 'grid sm:grid-cols-2' : 'max-w-2xl mx-auto text-center'
                }`}
              >
                {anyPhotos && (
                  <div
                    className="absolute left-1/2 hidden sm:flex items-center justify-center w-4 h-4 rounded-full"
                    style={{ background: p.accent, transform: 'translate(-50%, 0)', top: 6, zIndex: 2 }}
                  />
                )}
                <motion.div
                  variants={fadeUp}
                  {...inViewProps}
                  className={`relative ${
                    anyPhotos
                      ? i % 2
                        ? 'sm:order-2 sm:text-left'
                        : 'sm:order-1 sm:text-right'
                      : 'text-center'
                  }`}
                >
                  {/* Folio numeral ghosted behind the chapter text */}
                  <span
                    className={`absolute -top-14 font-serif-display italic select-none pointer-events-none leading-none hidden sm:block ${
                      anyPhotos ? (i % 2 ? 'left-0' : 'right-0') : 'left-1/2 -translate-x-1/2'
                    }`}
                    style={{ fontSize: '7rem', color: p.primary, opacity: 0.07 }}
                    aria-hidden
                  >
                    {ROMANS[n] ?? n + 1}
                  </span>
                  {chapterLabel(n)}
                  <h3 className="font-serif-display text-3xl mb-3" style={{ color: p.primary }}>
                    {m.title}
                  </h3>
                  {m.subtitle && (
                    <p className="text-xs uppercase mb-3" style={{ color: p.inkSoft, letterSpacing: '0.18em' }}>
                      {m.subtitle}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: p.inkSoft }}>
                    {m.body}
                  </p>
                  {m.cta && (
                    <div className={`mt-4 flex gap-5 text-xs font-medium uppercase ${anyPhotos ? (i % 2 ? 'sm:justify-start' : 'sm:justify-end') : 'justify-center'}`} style={{ letterSpacing: '0.08em' }}>
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
                {hasPhoto && (
                  <motion.div
                    {...(reduced || still
                      ? {}
                      : {
                          initial: { opacity: 0, rotate: i % 2 ? 2 : -2, scale: 0.94 },
                          whileInView: { opacity: 1, rotate: i % 2 ? 1.2 : -1.2, scale: 1 },
                          viewport: { once: true, margin: '-80px' },
                          transition: { duration: 0.7 },
                        })}
                    {...(reduced ? {} : galleryHover.wrap)}
                    className={`${i % 2 ? 'sm:order-1' : 'sm:order-2'}`}
                  >
                    {/* A polaroid pasted into the album, captioned by hand */}
                    <button
                      onClick={() => setLightboxIndex(data.galleryImages.findIndex((g) => g.url === m.photo))}
                      className="group block w-full p-3 pb-2"
                      style={{ background: p.surface, boxShadow: '0 16px 36px -16px rgba(0,0,0,0.35)', border: `1px solid ${p.line}` }}
                    >
                      <span className="block overflow-hidden">
                        <SiteImage src={m.photo} alt="" loading="lazy" className={`w-full object-cover ${galleryHover.imgClass}`} style={{ aspectRatio: '4/3' }} />
                      </span>
                      <span className="block font-script text-xl pt-2 pb-1 text-center" style={{ color: p.inkSoft }}>
                        {typeof m.title === 'string' ? m.title : coupleNames}
                      </span>
                    </button>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {anyEnabled && (
      <footer className="py-16 border-t text-center" style={{ borderColor: p.line }}>
        <p className="font-serif-display italic text-lg mb-3" style={{ color: p.inkSoft }}>
          <E k="footer.note" />
        </p>
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
    </SiteEffectsContext.Provider>
  );
}
