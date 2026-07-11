import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineLocationMarker,
  HiOutlineMenu,
  HiOutlineX,
} from 'react-icons/hi';
import type { PartId, TemplateProps } from '../types';
import { SECTION_LABELS } from '../config';
import { SharedE } from '../copy/shared';
import { CLASSIC_COPY } from '../copy/templates/classic';
import { EditableContent, makeEditable } from '../copy/useCopy';
import { calendarUrl, directionsUrl, formatEventDate, formatEventTime, icsFileName } from '../calendar';
import { useCountdown } from '../useCountdown';
import { fadeUp, inViewProps, stagger } from '../motion';
import { siteVars, heroShimmer } from '../theme';
import RsvpForm from '../RsvpForm';
import Lightbox from '../Lightbox';
import ShimmerText from '../effects/ShimmerText';
import ScrollProgress from '../effects/ScrollProgress';
import TickerDigit from '../effects/TickerDigit';
import MusicPlayer from '../effects/MusicPlayer';

const { E } = makeEditable('classic', CLASSIC_COPY);

/**
 * "Royal Heritage" — the product's original public site design: ceremonial,
 * centered, card-based. Retrofitted with the invite guide's motion language:
 * photo hero, shimmer names, rolling countdown, staggered reveals.
 */
export default function Classic({ data }: TemplateProps) {
  const p = data.palette;
  const countdown = useCountdown(data.weddingDate);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  const sectionBlocks: Record<PartId, React.ReactNode> = {
    hero: null,
    envelope: null,
    countdown: null,
    final: null,

    story: (
      <section key="story" id="story" className="py-20" style={{ background: p.surface }}>
        <div className="max-w-4xl mx-auto px-4">
          <motion.div variants={stagger} {...inViewProps} className="text-center">
            <motion.h2
              variants={fadeUp}
              className="font-script text-4xl sm:text-5xl mb-4"
              style={{ color: p.primary }}
            >
              <E k="story.heading" />
            </motion.h2>
            <motion.div
              variants={fadeUp}
              className="w-24 h-1 mx-auto mb-8"
              style={{ background: p.accent }}
            />
            <motion.p
              variants={fadeUp}
              className="text-lg leading-relaxed mb-8 whitespace-pre-line"
              style={{ color: p.inkSoft }}
            >
              <EditableContent field="story" value={data.story} multiline />
            </motion.p>

            <div className="grid md:grid-cols-2 gap-8 mt-12">
              {[
                {
                  name: data.brideName,
                  roleKey: 'story.brideRole' as const,
                  tint: `color-mix(in srgb, ${p.accent} 14%, ${p.surface})`,
                  text: p.accent,
                  photo: data.galleryImages[1]?.url ?? null,
                },
                {
                  name: data.groomName,
                  roleKey: 'story.groomRole' as const,
                  tint: `color-mix(in srgb, ${p.primary} 12%, ${p.surface})`,
                  text: p.primary,
                  photo: data.galleryImages[2]?.url ?? null,
                },
              ].map((person) => (
                <motion.div key={person.roleKey} variants={fadeUp} className="text-center">
                  <div
                    className="w-48 h-48 mx-auto rounded-full flex items-center justify-center mb-4 overflow-hidden"
                    style={{ background: person.tint }}
                  >
                    {person.photo ? (
                      <img
                        src={person.photo}
                        alt={person.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-script text-6xl" style={{ color: person.text }}>
                        {person.name[0]}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-2xl mb-2" style={{ color: p.primary }}>
                    {person.name}
                  </h3>
                  <p style={{ color: p.inkSoft }}>
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
      <section key="events" id="events" className="py-20" style={{ background: p.bg }}>
        <div className="max-w-6xl mx-auto px-4">
          <motion.div variants={stagger} {...inViewProps} className="text-center mb-12">
            <motion.h2
              variants={fadeUp}
              className="font-script text-4xl sm:text-5xl mb-4"
              style={{ color: p.primary }}
            >
              <E k="events.heading" />
            </motion.h2>
            <motion.div
              variants={fadeUp}
              className="w-24 h-1 mx-auto"
              style={{ background: p.accent }}
            />
          </motion.div>

          <motion.div variants={stagger} {...inViewProps} className="grid md:grid-cols-2 gap-6">
            {data.events.map((event) => {
              const directions = directionsUrl(event.venue);
              return (
                <motion.div
                  key={event.id}
                  variants={fadeUp}
                  className="rounded-2xl shadow-lg overflow-hidden"
                  style={{ background: p.surface }}
                >
                  <div className="h-2" style={{ backgroundColor: event.color ?? p.accent }} />
                  <div className="p-6">
                    <h3
                      className="font-display text-2xl font-bold mb-3"
                      style={{ color: p.primary }}
                    >
                      {event.name}
                    </h3>
                    {event.description && (
                      <p className="mb-4" style={{ color: p.inkSoft }}>
                        {event.description}
                      </p>
                    )}

                    <div className="space-y-2 text-sm" style={{ color: p.inkSoft }}>
                      <div className="flex items-center gap-2">
                        <HiOutlineCalendar className="w-4 h-4" style={{ color: p.accent }} />
                        <span>{formatEventDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HiOutlineClock className="w-4 h-4" style={{ color: p.accent }} />
                        <span>
                          {formatEventTime(event.start_time)}
                          {event.end_time ? ` – ${formatEventTime(event.end_time)}` : ''}
                        </span>
                      </div>
                      {event.venue && (
                        <div className="flex items-center gap-2">
                          <HiOutlineLocationMarker
                            className="w-4 h-4"
                            style={{ color: p.accent }}
                          />
                          <span>
                            {event.venue.name}
                            {event.venue.city ? `, ${event.venue.city}` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {event.dress_code && (
                      <div className="mt-4 pt-4 border-t" style={{ borderColor: p.line }}>
                        <span className="text-sm" style={{ color: p.inkSoft }}>
                          <SharedE k="events.dressCode" />{' '}
                        </span>
                        <span className="text-sm font-medium" style={{ color: p.ink }}>
                          {event.dress_code}
                        </span>
                      </div>
                    )}

                    <div className="mt-4 flex gap-4 text-sm font-medium">
                      <a
                        href={calendarUrl(event, coupleNames)}
                        download={icsFileName(event.name)}
                        style={{ color: p.primary }}
                        className="hover:underline"
                      >
                        <SharedE k="events.addToCalendar" />
                      </a>
                      {directions && (
                        <a
                          href={directions}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: p.primary }}
                          className="hover:underline"
                        >
                          <SharedE k="events.directions" />
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
    ) : null,

    rsvp: (
      <section key="rsvp" id="rsvp" className="py-20" style={{ background: p.heroGradient }}>
        <div className="max-w-2xl mx-auto px-4">
          <motion.div variants={stagger} {...inViewProps}>
            <div className="text-center mb-12">
              <motion.h2
                variants={fadeUp}
                className="font-script text-4xl sm:text-5xl mb-4"
                style={{ color: p.onHero }}
              >
                <E k="rsvp.heading" />
              </motion.h2>
              <motion.p variants={fadeUp} style={{ color: p.onHeroSoft }}>
                <E k="rsvp.subheading" />
              </motion.p>
            </div>
            <motion.div variants={fadeUp}>
              <RsvpForm slug={data.slug} preview={data.preview} />
            </motion.div>
          </motion.div>
        </div>
      </section>
    ),

    gallery: showGallery ? (
      <section key="gallery" id="gallery" className="py-20" style={{ background: p.surface }}>
        <div className="max-w-6xl mx-auto px-4">
          <motion.div variants={stagger} {...inViewProps} className="text-center mb-12">
            <motion.h2
              variants={fadeUp}
              className="font-script text-4xl sm:text-5xl mb-4"
              style={{ color: p.primary }}
            >
              <E k="gallery.heading" />
            </motion.h2>
            <motion.div
              variants={fadeUp}
              className="w-24 h-1 mx-auto"
              style={{ background: p.accent }}
            />
            {data.gallerySubtitle && (
              <motion.p variants={fadeUp} className="mt-4" style={{ color: p.inkSoft }}>
                {data.gallerySubtitle}
              </motion.p>
            )}
          </motion.div>
          <motion.div
            variants={stagger}
            {...inViewProps}
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
          >
            {data.galleryImages.map((image, i) => (
              <motion.button
                key={image.url}
                variants={fadeUp}
                onClick={() => setLightboxIndex(i)}
                className="aspect-square overflow-hidden rounded-xl group"
              >
                <img
                  src={image.url}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </motion.button>
            ))}
          </motion.div>
        </div>
      </section>
    ) : null,
  };

  return (
    <div style={{ ...vars, background: p.bg, color: p.ink }} className="min-h-screen">
      {!data.preview && <ScrollProgress color={p.accent} colorSoft={p.onHeroSoft} />}
      {data.musicUrl && <MusicPlayer url={data.musicUrl} disabled={data.preview} startTime={data.musicStartTime} endTime={data.musicEndTime} />}

      {/* Nav */}
      {anyEnabled && (
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b"
        style={{ background: `color-mix(in srgb, ${p.bg} 90%, transparent)`, borderColor: p.line }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href={`/${data.slug}`} className="font-script text-2xl" style={{ color: p.primary }}>
              {coupleNames}
            </a>
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.id}
                  href={navHref(link.id)}
                  className="text-sm hover:opacity-70 transition-opacity"
                  style={{ color: p.ink }}
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
                  style={{ color: p.inkSoft }}
                >
                  Dashboard
                </Link>
              )}
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg"
              aria-label="Toggle menu"
              style={{ color: p.primary }}
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

      {/* Hero */}
      {showHero && (
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
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
        <div className="relative z-10 text-center px-4">
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.div
              variants={fadeUp}
              className="flex items-center justify-center gap-3 mb-5"
              style={{ color: p.onHeroSoft }}
            >
              <span className="h-px w-8 sm:w-12" style={{ background: 'currentColor', opacity: 0.6 }} />
              <span className="text-sm sm:text-base uppercase" style={{ letterSpacing: '0.28em' }}>
                <E k="hero.kicker" />
              </span>
              <span className="h-px w-8 sm:w-12" style={{ background: 'currentColor', opacity: 0.6 }} />
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-script text-6xl sm:text-7xl md:text-8xl mb-4"
            >
              <ShimmerText colors={shimmerColors}>
                <EditableContent field="brideName" value={data.brideName} /> &amp;{' '}
                <EditableContent field="groomName" value={data.groomName} />
              </ShimmerText>
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
            <motion.p variants={fadeUp} className="text-xl mb-12" style={{ color: p.onHeroSoft }}>
              {data.weddingDate?.toLocaleDateString('en-IN', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              }) ?? ''}
            </motion.p>

            {data.weddingDate && !countdown.past && (
              <motion.div variants={fadeUp} className="flex justify-center gap-0.5 sm:gap-2 md:gap-8 mb-12 flex-wrap px-2 w-full overflow-hidden">
                {[
                  { value: countdown.days, k: 'countdown.days' as const },
                  { value: countdown.hours, k: 'countdown.hours' as const },
                  { value: countdown.minutes, k: 'countdown.minutes' as const },
                  { value: countdown.seconds, k: 'countdown.seconds' as const },
                ].map((item) => (
                  <div
                    key={item.k}
                    className="bg-white/10 backdrop-blur rounded-xl p-1 sm:p-3 md:p-6 min-w-0"
                  >
                    <TickerDigit
                      value={item.value}
                      className="font-bold"
                      style={{ fontSize: 'clamp(14px, 3.5vw, 48px)', color: p.onHero }}
                    />
                    <div style={{ fontSize: 'clamp(7px, 1.5vw, 14px)', color: p.onHeroSoft }}>
                      <SharedE k={item.k} />
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {hasSection('rsvp') && (
              <motion.a
                variants={fadeUp}
                href="#rsvp"
                className="inline-block px-8 py-4 rounded-full font-semibold text-lg transition-colors"
                style={{ background: p.accent, color: p.onAccent }}
              >
                <E k="hero.rsvpCta" />
              </motion.a>
            )}
          </motion.div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div
            className="w-6 h-10 border-2 rounded-full flex justify-center pt-2"
            style={{ borderColor: p.onHeroSoft }}
          >
            <div className="w-1 h-3 rounded-full" style={{ background: p.onHeroSoft }} />
          </div>
        </div>
      </section>
      )}

      {enabled.map((s) => sectionBlocks[s.id])}

      {/* Footer */}
      {anyEnabled && (
      <footer className="py-12" style={{ background: p.heroGradient, color: p.onHero }}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="font-script text-4xl mb-4">{coupleNames}</h3>
          {data.weddingDate && (
            <p className="mb-6" style={{ color: p.onHeroSoft }}>
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
  );
}
