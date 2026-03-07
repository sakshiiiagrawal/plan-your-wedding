import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineCalendar, HiOutlineLocationMarker, HiOutlineClock } from 'react-icons/hi';
import Gallery from '../../components/Gallery';

const WEDDING_DATE = new Date('2026-11-26T07:00:00');

const events = [
  {
    name: 'Mehendi',
    date: 'November 24, 2026',
    time: '6:00 PM onwards',
    venue: 'Hotel Malsi Mist',
    dress: 'Multi-Color Traditional',
    description: 'Join us for an evening of henna, music, and celebration.',
    color: '#228B22'
  },
  {
    name: 'Haldi Carnival',
    date: 'November 25, 2026',
    time: '11:00 AM - 3:00 PM',
    venue: 'Hotel Malsi Mist',
    dress: 'Yellow Attire',
    description: 'A colorful morning filled with turmeric rituals and fun.',
    color: '#FFD700'
  },
  {
    name: 'Engagement & Sangeet',
    date: 'November 25, 2026',
    time: '7:00 PM onwards',
    venue: 'Hotel Malsi Mist',
    dress: 'Indo-Western Bling',
    description: 'Ring ceremony followed by dance performances and party.',
    color: '#1A237E'
  },
  {
    name: 'Wedding',
    date: 'November 26, 2026',
    time: '11:00 AM onwards',
    venue: 'Regal Manor by Grand Dreams',
    dress: 'Traditional',
    description: 'The sacred union of two souls in a traditional ceremony.',
    color: '#8B0000'
  },
];

export default function Home() {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const diff = WEDDING_DATE - now;

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
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-maroon-800 via-maroon-700 to-gold-600" />
        <div className="absolute inset-0 opacity-10">
          {/* Mandala pattern overlay would go here */}
        </div>

        <div className="relative z-10 text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-gold-300 text-lg mb-4">We're getting married!</p>
            <h1 className="font-script text-6xl md:text-8xl text-cream mb-4">
              Sakshi & Ayush
            </h1>
            <p className="text-gold-300 text-xl mb-12">November 26, 2026</p>

            {/* Countdown */}
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

            <a
              href="#rsvp"
              className="inline-block bg-gold-500 text-maroon-900 px-8 py-4 rounded-full font-semibold text-lg hover:bg-gold-400 transition-colors animate-pulse-gold"
            >
              RSVP Now
            </a>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gold-300 rounded-full flex justify-center pt-2">
            <div className="w-1 h-3 bg-gold-300 rounded-full" />
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section id="our-story" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="font-script text-5xl text-maroon-800 mb-4">Our Love Story</h2>
            <div className="w-24 h-1 bg-gold-500 mx-auto mb-8" />

            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Every love story is beautiful, but ours is our favorite. From strangers to friends
              to soulmates, our journey has been nothing short of magical. We can't wait to
              begin the next chapter of our lives together, surrounded by the people we love most.
            </p>

            <div className="grid md:grid-cols-2 gap-8 mt-12">
              <div className="text-center">
                <div className="w-48 h-48 mx-auto bg-pink-100 rounded-full flex items-center justify-center mb-4">
                  <span className="font-script text-6xl text-pink-400">S</span>
                </div>
                <h3 className="font-display text-2xl text-maroon-800 mb-2">Sakshi Agrawal</h3>
                <p className="text-gray-500">The Bride</p>
                <p className="text-sm text-gray-400 mt-1">Daughter of Mr. & Mrs. Agrawal</p>
              </div>
              <div className="text-center">
                <div className="w-48 h-48 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="font-script text-6xl text-blue-400">A</span>
                </div>
                <h3 className="font-display text-2xl text-maroon-800 mb-2">Ayush Dangwal</h3>
                <p className="text-gray-500">The Groom</p>
                <p className="text-sm text-gray-400 mt-1">Son of Mr. & Mrs. Dangwal</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Events Section */}
      <section id="events" className="py-20 bg-cream">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-script text-5xl text-maroon-800 mb-4">Wedding Events</h2>
            <div className="w-24 h-1 bg-gold-500 mx-auto" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {events.map((event, index) => (
              <motion.div
                key={event.name}
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

      {/* RSVP Section */}
      <section id="rsvp" className="py-20 bg-maroon-800">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-script text-5xl text-cream mb-4">RSVP</h2>
            <p className="text-gold-300">We would be honored by your presence</p>
          </div>

          <form className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Full Name *</label>
                <input type="text" className="input" placeholder="Your name" required />
              </div>
              <div>
                <label className="label">Phone *</label>
                <input type="tel" className="input" placeholder="Your phone" required />
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="Your email" />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Side</label>
                <select className="input">
                  <option value="bride">Bride's Side</option>
                  <option value="groom">Groom's Side</option>
                </select>
              </div>
              <div>
                <label className="label">Number of Guests</label>
                <input type="number" className="input" min="1" defaultValue="1" />
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Events Attending</label>
              <div className="flex flex-wrap gap-4 mt-2">
                {['Mehendi', 'Haldi', 'Sangeet', 'Wedding'].map((event) => (
                  <label key={event} className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-maroon-800" />
                    <span>{event}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Dietary Preference</label>
              <select className="input">
                <option value="vegetarian">Vegetarian</option>
                <option value="jain">Jain</option>
                <option value="vegan">Vegan</option>
                <option value="non_vegetarian">Non-Vegetarian</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="label">Message (Optional)</label>
              <textarea className="input" rows="3" placeholder="Any special message or requirements..." />
            </div>

            <button type="submit" className="btn-primary w-full py-4 text-lg">
              Submit RSVP
            </button>
          </form>
        </div>
      </section>

      <Gallery />
    </div>
  );
}
