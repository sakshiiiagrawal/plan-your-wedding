import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineCalendar, HiOutlineLocationMarker, HiOutlineClock } from 'react-icons/hi';
import Gallery from '../../components/Gallery';
import api from '../../api/axios';
import { useHeroContent, usePublicEvents, useOurStory } from '../../hooks/useApi';
import { parseLocalDate } from '../../utils/date';

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// Mirrors the theme palette in dashboard/Website.tsx
const THEME_STYLES: Record<string, { heroGradient: string; accentColor: string }> = {
  royal: {
    heroGradient: 'linear-gradient(160deg, #8B0000 0%, #5C0000 100%)',
    accentColor: '#D4AF37',
  },
  desert: {
    heroGradient: 'linear-gradient(160deg, #C9A96E 0%, #A0785A 100%)',
    accentColor: '#B87676',
  },
  mandala: {
    heroGradient: 'linear-gradient(160deg, #1B2A4A 0%, #0D1629 100%)',
    accentColor: '#C9A96E',
  },
};

export default function Home() {
  const { slug } = useParams<{ slug: string }>();
  const [countdown, setCountdown] = useState<Countdown>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [rsvpForm, setRsvpForm] = useState({
    fullName: '',
    attending: 'yes',
    guests: 1,
    message: '',
  });
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);
  const [rsvpDone, setRsvpDone] = useState(false);

  const { data: heroContent } = useHeroContent(slug);
  const { data: events = [] } = usePublicEvents(slug);
  const { data: storyContent } = useOurStory(slug);

  const brideName = heroContent?.bride_name || 'Bride';
  const groomName = heroContent?.groom_name || 'Groom';
  const weddingDateStr = heroContent?.wedding_date ?? null;
  const weddingDate = weddingDateStr ? parseLocalDate(weddingDateStr) : null;

  const theme = THEME_STYLES[(heroContent as any)?.theme] ?? THEME_STYLES.royal!;
  const sections: Record<string, boolean> = (heroContent as any)?.sections ?? {};
  const showSection = (id: string) => sections[id] !== false;

  const storyText =
    (storyContent as any)?.story ||
    'Every love story is beautiful, but ours is our favorite. From strangers to friends to soulmates, our journey has been nothing short of magical. We can’t wait to begin the next chapter of our lives together, surrounded by the people we love most.';

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameParts = rsvpForm.fullName.trim().split(/\s+/);
    setRsvpSubmitting(true);
    try {
      await api.post(`/public/${slug}/rsvp`, {
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(' ') || null,
        attending: rsvpForm.attending === 'yes',
        // API caps plus_ones at 10; the input's max attr doesn't stop typed values
        plus_ones: Math.min(10, Math.max(0, rsvpForm.guests - 1)),
        notes: rsvpForm.message || null,
      });
      setRsvpDone(true);
      toast.success('RSVP recorded. Thank you!');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error || 'Something went wrong submitting your RSVP. Please retry.',
      );
    } finally {
      setRsvpSubmitting(false);
    }
  };

  useEffect(() => {
    if (!weddingDateStr) return;

    const timer = setInterval(() => {
      const now = new Date();
      const diff = weddingDate!.getTime() - now.getTime();

      if (diff > 0) {
        setCountdown({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [weddingDateStr]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
        <div className="absolute inset-0" style={{ background: theme.heroGradient }} />

        <div className="relative z-10 text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-gold-300 text-lg mb-4">We&apos;re getting married!</p>
            <h1 className="font-script text-6xl sm:text-7xl md:text-8xl text-cream mb-4">
              {brideName} & {groomName}
            </h1>
            <p className="text-gold-300 text-xl mb-12">
              {weddingDate?.toLocaleDateString('en-IN', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              }) ?? ''}
            </p>

            <div className="flex justify-center gap-4 md:gap-8 mb-12">
              {[
                { value: countdown.days, label: 'Days' },
                { value: countdown.hours, label: 'Hours' },
                { value: countdown.minutes, label: 'Minutes' },
                { value: countdown.seconds, label: 'Seconds' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-white/10 backdrop-blur rounded-xl p-4 md:p-6 min-w-[70px] md:min-w-[100px]"
                >
                  <div className="text-3xl md:text-5xl font-bold text-cream">{item.value}</div>
                  <div className="text-xs md:text-sm text-gold-300">{item.label}</div>
                </div>
              ))}
            </div>

            {showSection('rsvp') && (
              <a
                href="#rsvp"
                className="inline-block px-8 py-4 rounded-full font-semibold text-lg transition-colors animate-pulse-gold"
                style={{ background: theme.accentColor, color: '#1a1a1a' }}
              >
                RSVP Now
              </a>
            )}
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gold-300 rounded-full flex justify-center pt-2">
            <div className="w-1 h-3 bg-gold-300 rounded-full" />
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      {showSection('story') && (
      <section id="our-story" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="font-script text-4xl sm:text-5xl text-maroon-800 mb-4">
              Our Love Story
            </h2>
            <div className="w-24 h-1 bg-gold-500 mx-auto mb-8" />

            <p className="text-gray-600 text-lg leading-relaxed mb-8 whitespace-pre-line">
              {storyText}
            </p>

            <div className="grid md:grid-cols-2 gap-8 mt-12">
              <div className="text-center">
                <div className="w-48 h-48 mx-auto bg-pink-100 rounded-full flex items-center justify-center mb-4">
                  <span className="font-script text-6xl text-pink-400">{brideName[0]}</span>
                </div>
                <h3 className="font-display text-2xl text-maroon-800 mb-2">{brideName}</h3>
                <p className="text-gray-500">The Bride</p>
              </div>
              <div className="text-center">
                <div className="w-48 h-48 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="font-script text-6xl text-blue-400">{groomName[0]}</span>
                </div>
                <h3 className="font-display text-2xl text-maroon-800 mb-2">{groomName}</h3>
                <p className="text-gray-500">The Groom</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* Events Section */}
      {showSection('events') && (
      <section id="events" className="py-20 bg-cream">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-script text-4xl sm:text-5xl text-maroon-800 mb-4">
              Wedding Events
            </h2>
            <div className="w-24 h-1 bg-gold-500 mx-auto" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {events.map((event, index) => (
              <motion.div
                key={event.name ?? index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden"
              >
                <div className="h-2" style={{ backgroundColor: event.color }} />
                <div className="p-6">
                  <h3 className="font-display text-2xl font-bold text-maroon-800 mb-3">
                    {event.name}
                  </h3>
                  <p className="text-gray-600 mb-4">{event.description}</p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <HiOutlineCalendar className="w-4 h-4 text-gold-500" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <HiOutlineClock className="w-4 h-4 text-gold-500" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <HiOutlineLocationMarker className="w-4 h-4 text-gold-500" />
                      <span>{event.venue}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gold-100">
                    <span className="text-sm text-gray-500">Dress Code: </span>
                    <span className="text-sm font-medium text-gray-700">{event.dress}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* RSVP Section */}
      {showSection('rsvp') && (
      <section id="rsvp" className="py-20" style={{ background: theme.heroGradient }}>
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-script text-4xl sm:text-5xl text-cream mb-4">RSVP</h2>
            <p style={{ color: theme.accentColor }}>We would be honored by your presence</p>
          </div>

          {rsvpDone ? (
            <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
              <h3 className="font-display text-2xl text-maroon-800 mb-2">Thank you!</h3>
              <p className="text-gray-600">
                Your RSVP has been recorded. We can&apos;t wait to celebrate with you.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRsvpSubmit} className="bg-white rounded-2xl p-8 shadow-2xl">
              <div className="mb-4">
                <label className="label">Full Name (as on your invitation) *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Your name"
                  value={rsvpForm.fullName}
                  onChange={(e) => setRsvpForm({ ...rsvpForm, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Will you attend? *</label>
                  <select
                    className="input"
                    value={rsvpForm.attending}
                    onChange={(e) => setRsvpForm({ ...rsvpForm, attending: e.target.value })}
                  >
                    <option value="yes">Joyfully accept</option>
                    <option value="no">Regretfully decline</option>
                  </select>
                </div>
                <div>
                  <label className="label">Number of Guests (including you)</label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    max="11"
                    value={rsvpForm.guests}
                    onChange={(e) =>
                      setRsvpForm({ ...rsvpForm, guests: parseInt(e.target.value, 10) || 1 })
                    }
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="label">Message (Optional)</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Any special message or requirements..."
                  value={rsvpForm.message}
                  onChange={(e) => setRsvpForm({ ...rsvpForm, message: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={rsvpSubmitting}
                className="btn-primary w-full py-4 text-lg disabled:opacity-50"
              >
                {rsvpSubmitting ? 'Submitting…' : 'Submit RSVP'}
              </button>
            </form>
          )}
        </div>
      </section>
      )}

      {showSection('gallery') && <Gallery slug={slug ?? null} />}
    </div>
  );
}
