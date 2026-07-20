import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { goToWedding } from '../utils/tenant';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa';
import {
  FiArrowRight,
  FiBell,
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiCheckSquare,
  FiCreditCard,
  FiGlobe,
  FiHome,
  FiImage,
  FiPieChart,
  FiUsers,
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import BrandLogo from '../components/ui/BrandLogo';

/* ── Loop driver: advances a step counter while the infographic is on
      screen; parks on `restStep` when the user prefers reduced motion. ──── */
function useLoop(steps: number, ms: number, restStep: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-80px' });
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduce) {
      setStep(restStep);
      return;
    }
    if (!inView) return;
    const id = setInterval(() => setStep((s) => (s + 1) % steps), ms);
    return () => clearInterval(id);
  }, [inView, reduce, steps, ms, restStep]);
  return { ref, step };
}

const spring = { type: 'spring', stiffness: 380, damping: 30 } as const;

const rise = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-70px' },
  transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as const },
} as const;

/* ══ Infographic 1 — RSVP over WhatsApp ══════════════════════════════════ */
function RsvpInfographic() {
  const { ref, step } = useLoop(6, 1500, 4);
  const confirmed = step >= 3 ? 187 : 186;
  return (
    <div ref={ref} className="relative mx-auto w-full max-w-sm">
      {/* phone */}
      <div className="overflow-hidden rounded-[26px] border border-line bg-surface-panel shadow-[0_28px_70px_-28px_rgba(64,48,32,0.4)]">
        <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white">
            <FaWhatsapp size={17} />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Sakshi &amp; Ayush&rsquo;s Wedding</p>
            <p className="text-[10px] text-white/70">RSVP assistant</p>
          </div>
        </div>
        <div className="flex min-h-[280px] flex-col gap-3 bg-[#f2ece2] p-4">
          <AnimatePresence>
            {step >= 0 && (
              <motion.div
                key="invite"
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="max-w-[85%] rounded-xl rounded-tl-sm bg-white p-3 shadow-sm"
              >
                <p className="text-[13px] leading-snug text-ink-mid">
                  Namaste, Anaya. You&rsquo;re invited to Sakshi &amp; Ayush&rsquo;s wedding on{' '}
                  <b>26 Nov</b>. Please confirm your attendance.
                </p>
                <div className="mt-2.5 flex gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors duration-500 ${
                      step >= 2
                        ? 'bg-[#25D366] text-white'
                        : 'border border-[#25D366]/50 text-[#128C7E]'
                    }`}
                  >
                    Joyfully accept
                  </span>
                  <span className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-low">
                    Regretfully decline
                  </span>
                </div>
              </motion.div>
            )}
            {step === 1 && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={spring}
                className="ml-auto flex gap-1 rounded-xl rounded-tr-sm bg-[#dcf8c6] px-3.5 py-2.5 shadow-sm"
              >
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="h-1.5 w-1.5 rounded-full bg-[#128C7E]/60"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.7, delay: d * 0.15 }}
                  />
                ))}
              </motion.div>
            )}
            {step >= 2 && (
              <motion.div
                key="reply"
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="ml-auto max-w-[75%] rounded-xl rounded-tr-sm bg-[#dcf8c6] p-3 shadow-sm"
              >
                <p className="text-[13px] text-ink-mid">
                  We&rsquo;ll be there. 2 guests, both vegetarian.
                </p>
              </motion.div>
            )}
            {step >= 3 && (
              <motion.div
                key="logged"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="mx-auto mt-1 flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[11px] text-ink-low shadow-sm"
              >
                <FiCheck className="text-[#128C7E]" />
                Guest list updated. Meal preference saved.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* floating counter card */}
      <motion.div
        animate={step >= 3 ? { scale: [1, 1.06, 1] } : {}}
        transition={{ duration: 0.5 }}
        className="absolute -right-3 -top-4 rounded-xl border border-line-soft bg-surface-panel px-4 py-2.5 shadow-[var(--shadow-card)] sm:-right-8"
      >
        <p className="text-[9px] uppercase tracking-[0.25em] text-ink-low">Confirmed</p>
        <p className="font-serif-display text-2xl leading-tight text-gold-700">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={confirmed}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={spring}
              className="inline-block"
            >
              {confirmed}
            </motion.span>
          </AnimatePresence>{' '}
          <span className="text-sm text-ink-dim">/ 240</span>
        </p>
      </motion.div>
    </div>
  );
}

/* ══ Infographic 2 — Room allocation ═════════════════════════════════════ */
const ROOM_GUESTS = [
  { id: 'g1', label: 'Sharmas', count: 3, room: 0, atStep: 1 },
  { id: 'g2', label: 'Priya +1', count: 2, room: 1, atStep: 2 },
  { id: 'g3', label: 'Meera', count: 1, room: 2, atStep: 3 },
] as const;
const ROOMS = [
  { name: 'Room 201', cap: 3 },
  { name: 'Room 202', cap: 2 },
  { name: 'Suite 3', cap: 2 },
] as const;

function RoomsInfographic() {
  const { ref, step } = useLoop(6, 1450, 4);
  const queue = ROOM_GUESTS.filter((g) => step < g.atStep);
  return (
    <div ref={ref} className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-line bg-surface-panel p-5 shadow-[0_28px_70px_-28px_rgba(64,48,32,0.4)]">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.3em] text-ink-low">
            Grand Lotus Hotel · Nov 25–27
          </p>
          <AnimatePresence>
            {step >= 4 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="flex items-center gap-1 rounded-full bg-[#256f44]/10 px-2.5 py-1 text-[10px] font-medium text-[#256f44]"
              >
                <FiCheck size={11} /> All allocated
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* unassigned queue */}
        <div className="mb-4 min-h-[46px] rounded-lg border border-dashed border-line bg-cream p-2.5">
          <p className="mb-1.5 text-[9px] uppercase tracking-[0.25em] text-ink-dim">
            Awaiting rooms
          </p>
          <div className="flex min-h-[24px] flex-wrap gap-2">
            {queue.length === 0 && (
              <span className="text-[11px] italic text-ink-dim">Everyone has a confirmed stay</span>
            )}
            {queue.map((g) => (
              <motion.span
                key={g.id}
                layoutId={g.id}
                transition={spring}
                className="rounded-full border border-gold-300 bg-gold-50 px-2.5 py-1 text-[11px] font-medium text-gold-800"
              >
                {g.label}
              </motion.span>
            ))}
          </div>
        </div>

        {/* rooms */}
        <div className="grid grid-cols-3 gap-2.5">
          {ROOMS.map((room, ri) => {
            const occupants = ROOM_GUESTS.filter((g) => g.room === ri && step >= g.atStep);
            const filled = occupants.reduce((s, g) => s + g.count, 0);
            const full = filled >= room.cap;
            return (
              <div
                key={room.name}
                className={`rounded-lg border p-2.5 transition-colors duration-500 ${
                  full ? 'border-gold-300 bg-gold-50/60' : 'border-line-soft bg-surface-panel'
                }`}
              >
                <p className="text-[11px] font-semibold text-ink-high">{room.name}</p>
                <div className="mt-1.5 flex gap-1">
                  {Array.from({ length: room.cap }, (_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-full rounded-full transition-colors duration-500 ${
                        i < filled ? 'bg-gold-500' : 'bg-surface-highest'
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-2 flex min-h-[40px] flex-col gap-1.5">
                  {occupants.map((g) => (
                    <motion.span
                      key={g.id}
                      layoutId={g.id}
                      transition={spring}
                      className="truncate rounded-full border border-gold-300 bg-gold-50 px-2 py-0.5 text-[10px] font-medium text-gold-800"
                    >
                      {g.label}
                    </motion.span>
                  ))}
                </div>
                <p className="mt-1 text-[9px] text-ink-dim">
                  {filled}/{room.cap} beds
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══ Infographic 3 — Payment reminders & expense chart ═══════════════════ */
const EXPENSE_BARS = [
  { label: 'Venue', planned: 92, spent: 80 },
  { label: 'Catering', planned: 100, spent: 46 },
  { label: 'Décor', planned: 64, spent: 52 },
  { label: 'Photo', planned: 55, spent: 30 },
  { label: 'Music', planned: 38, spent: 34 },
] as const;

function PaymentsInfographic() {
  const { ref, step } = useLoop(6, 1550, 3);
  const paid = step >= 2;
  const cateringSpent = paid ? 78 : 46;
  return (
    <div ref={ref} className="relative mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-line bg-surface-panel p-5 shadow-[0_28px_70px_-28px_rgba(64,48,32,0.4)]">
        <div className="mb-5 flex items-baseline justify-between">
          <p className="text-[10px] uppercase tracking-[0.3em] text-ink-low">Budget · spent vs planned</p>
          <p className="font-serif-display text-lg text-ink-high">
            ₹{paid ? '9.1' : '8.6'}L <span className="text-xs text-ink-dim">of ₹12L</span>
          </p>
        </div>
        <div className="flex h-36 items-end gap-3.5 px-1">
          {EXPENSE_BARS.map((b, i) => {
            const spent = b.label === 'Catering' ? cateringSpent : b.spent;
            return (
              <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="relative flex h-28 w-full items-end rounded-md bg-surface-raised">
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: `${b.planned}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute bottom-0 w-full rounded-md border border-gold-300/60 bg-gold-100/50"
                  />
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${spent}%` }}
                    transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    className={`relative w-full rounded-md ${
                      b.label === 'Catering' && paid
                        ? 'bg-gradient-to-t from-maroon-800 to-maroon-500'
                        : 'bg-gradient-to-t from-gold-600 to-gold-400'
                    }`}
                  />
                </div>
                <span className="text-[9px] uppercase tracking-wider text-ink-low">{b.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* reminder toast */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="due"
            initial={{ opacity: 0, y: 20, x: 10 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={spring}
            className="absolute -bottom-6 -right-2 flex w-64 items-start gap-3 rounded-xl border border-line bg-surface-panel p-3.5 shadow-[0_16px_40px_-16px_rgba(64,48,32,0.5)] sm:-right-8"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a85f00]/10 text-[#a85f00]">
              <FiBell size={15} />
            </span>
            <div>
              <p className="text-[12px] font-semibold text-ink-high">Caterer advance due Friday</p>
              <p className="text-[11px] text-ink-low">₹50,000 · Sharma Caterers</p>
            </div>
          </motion.div>
        )}
        {step >= 2 && step < 5 && (
          <motion.div
            key="paid"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring}
            className="absolute -bottom-6 -right-2 flex w-64 items-start gap-3 rounded-xl border border-[#256f44]/25 bg-surface-panel p-3.5 shadow-[0_16px_40px_-16px_rgba(64,48,32,0.5)] sm:-right-8"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#256f44]/10 text-[#256f44]">
              <FiCheck size={15} />
            </span>
            <div>
              <p className="text-[12px] font-semibold text-ink-high">Paid &amp; logged</p>
              <p className="text-[11px] text-ink-low">Catering updated automatically</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══ Hero — live activity stack ══════════════════════════════════════════ */
const FEED = [
  { icon: FaWhatsapp, tint: '#128C7E', title: 'RSVP confirmed', body: 'Anaya Sharma · 2 guests · vegetarian' },
  { icon: FiHome, tint: '#7e6227', title: 'Stay assigned', body: 'Kapoor family · Grand Lotus · Nov 25-27' },
  { icon: FiBell, tint: '#a85f00', title: 'Vendor payment due', body: 'Photographer balance · due in 5 days' },
  { icon: FiCheckSquare, tint: '#256f44', title: 'Timeline complete', body: 'Final menu tasting · owner marked done' },
  { icon: FiPieChart, tint: '#74232f', title: 'Budget movement', body: 'Decor at ₹1.2L of ₹1.5L planned' },
] as const;

function ActivityStack() {
  const { ref, step } = useLoop(FEED.length, 1900, 2);
  const visible = [0, 1, 2].map((o) => FEED[(step - o + FEED.length * 2) % FEED.length]!);
  return (
    <div ref={ref} className="relative mx-auto h-[240px] w-full max-w-sm" aria-hidden="true">
      <AnimatePresence initial={false}>
        {visible.map((item, pos) => (
          <motion.div
            key={`${item.title}-${(step - pos + FEED.length * 2) % FEED.length}`}
            initial={{ opacity: 0, y: -46, scale: 1 }}
            animate={{ opacity: 1 - pos * 0.28, y: pos * 68, scale: 1 - pos * 0.045 }}
            exit={{ opacity: 0, y: 200 }}
            transition={spring}
            style={{ zIndex: 10 - pos }}
            className="absolute inset-x-0 top-0 flex items-start gap-3.5 rounded-2xl border border-line bg-surface-panel p-4 shadow-[0_18px_44px_-18px_rgba(64,48,32,0.45)]"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: `${item.tint}18`, color: item.tint }}
            >
              <item.icon size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-high">{item.title}</p>
              <p className="text-[13px] text-ink-low">{item.body}</p>
            </div>
            <span className="ml-auto mt-1 text-[10px] text-ink-dim">now</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ══ Page ════════════════════════════════════════════════════════════════ */
const HERO_METRICS = [
  { value: 'Guest records', label: 'for invites, RSVPs, meals, households and event access' },
  { value: 'Room lists', label: 'for hotel blocks, check-in dates and family groups' },
  { value: 'Payment tracking', label: 'for vendor advances, balances and due dates' },
] as const;

const MORE_FEATURES = [
  {
    icon: FiGlobe,
    title: 'Wedding website',
    body: 'Publish guest-facing event details, RSVP links, gallery, music, QR codes and templates while keeping planning records private.',
  },
  {
    icon: FiCalendar,
    title: 'Events and timeline',
    body: 'Track ceremonies, arrival windows, vendor deadlines and family responsibilities by date and owner.',
  },
  {
    icon: FiBriefcase,
    title: 'Vendor records',
    body: 'Store contacts, contracts, deliverables, notes and payment terms for venues, caterers, decorators, photographers, artists and logistics teams.',
  },
  {
    icon: FiCreditCard,
    title: 'Budget and payments',
    body: 'Track planned, allocated, paid and pending amounts by category so money discussions start from current numbers.',
  },
  {
    icon: FiUsers,
    title: 'Guest and family records',
    body: 'Segment guests by side, event, RSVP status, meal preference, household, travel needs and accommodation requirements.',
  },
  {
    icon: FiImage,
    title: 'Guest photo gallery',
    body: 'Collect photos across events in one place for the couple, families and guests.',
  },
];

const USE_CASES = [
  'Destination weddings that need hotel blocks, check-in dates and room lists.',
  'Indian weddings where mehendi, haldi, sangeet, wedding and reception have different guest lists.',
  'Parents and siblings coordinating from different cities and WhatsApp groups.',
  'Couples who need a guest website plus private planning records.',
  'Planners preparing exports for catering counts, hotel front desks, vendor calls and payment reviews.',
] as const;

export default function Marketing() {
  const navigate = useNavigate();
  const { isAuthenticated, slug, loading } = useAuth();

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    // Accounts with no wedding yet — their home is the workspace hub
    if (slug) goToWedding(slug, '/dashboard', navigate, { replace: true });
    else navigate('/hub', { replace: true });
  }, [loading, isAuthenticated, slug, navigate]);

  // A returning (token-bearing) user is about to be redirected the instant
  // /auth/me resolves. On slow mobile that round-trip is visible — don't flash
  // the marketing CTA (and tempt a "Sign In" tap) while we still might redirect.
  if (loading || isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#fbf7ef] text-ink-mid antialiased">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 border-b border-[#e7dccb] bg-[#fbf7ef]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <a href="/">
            <BrandLogo />
          </a>
          <div className="hidden items-center gap-8 text-sm text-[#6f655b] md:flex">
            <a href="#platform" className="transition-colors hover:text-[#201a17]">
              Platform
            </a>
            <a href="#rsvp" className="transition-colors hover:text-[#201a17]">
              RSVPs
            </a>
            <a href="#rooms" className="transition-colors hover:text-[#201a17]">
              Rooms
            </a>
            <a href="#payments" className="transition-colors hover:text-[#201a17]">
              Budget
            </a>
            <a href="#more" className="transition-colors hover:text-[#201a17]">
              Use cases
            </a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="px-2 text-sm text-[#6f655b] transition-colors hover:text-[#201a17]"
            >
              Sign in
            </a>
            <button
              onClick={() => navigate('/onboard')}
              className="rounded-full bg-[#3a1722] px-5 py-2 text-sm font-semibold text-white shadow-[0_14px_34px_-24px_rgba(58,23,34,0.8)] transition-all hover:-translate-y-0.5 hover:bg-[#4a1d2b]"
            >
              Start free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="relative overflow-hidden bg-[#fbf7ef]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(55% 45% at 82% 16%, rgba(201,172,112,0.24) 0%, transparent 64%), radial-gradient(45% 42% at 8% 82%, rgba(74,29,43,0.08) 0%, transparent 68%)',
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 sm:py-28 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
              className="mb-6 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#9b7a3e]"
            >
              For couples, parents, and planners
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08 }}
              className="font-serif-display text-5xl font-semibold leading-[0.98] tracking-[-0.035em] text-[#201a17] sm:text-7xl"
            >
              Keep headcount, rooms, and payments consistent.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="mt-7 max-w-2xl text-lg leading-8 text-[#5f554d]"
            >
              From invitations to accommodations, vendor coordination to your wedding
              website—everything lives in one shared workspace for you, your family, and your
              friends.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.28 }}
              className="mt-9 flex flex-wrap items-center gap-4"
            >
              <button
                onClick={() => navigate('/onboard')}
                className="group flex items-center gap-2 rounded-full bg-[#3a1722] px-7 py-3.5 text-base font-semibold text-white shadow-[0_18px_42px_-26px_rgba(58,23,34,0.85)] transition-all hover:-translate-y-0.5 hover:bg-[#4a1d2b]"
              >
                Start planning free
                <FiArrowRight className="transition-transform group-hover:translate-x-1" />
              </button>
              <a
                href="#platform"
                className="rounded-full border border-[#d6c8b5] px-6 py-3.5 text-base font-medium text-[#3e3732] transition-all hover:-translate-y-0.5 hover:border-[#b79b62] hover:bg-white/70"
              >
                Explore features
              </a>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#6f655b]"
            >
              {['Free to start', 'No credit card required', 'Invite family anytime'].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <FiCheck className="text-[#9b7a3e]" />
                  {item}
                </span>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="rounded-[28px] bg-white/70 p-5 shadow-[0_34px_90px_-58px_rgba(40,28,18,0.7)] ring-1 ring-[#eadfce] backdrop-blur"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9b7a3e]">
                  Planning status
                </p>
                <p className="mt-1 text-sm text-[#6f655b]">
                  Guest, stay and payment updates in one view.
                </p>
              </div>
              <span className="text-sm font-semibold text-[#3a1722]">240 guests</span>
            </div>
            <ActivityStack />
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
              {[
                ['187', 'confirmed'],
                ['42', 'rooms'],
                ['₹2.9L', 'pending'],
              ].map(([value, label]) => (
                <div key={label}>
                  <p className="font-serif-display text-2xl font-semibold text-[#201a17]">
                    {value}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a7a6b]">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </header>

      {/* ── Platform intro ── */}
      <section id="platform" className="bg-[#fbf7ef]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.div {...rise} className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-gold-700">
                Shared planning records
              </p>
              <h2 className="font-serif-display text-4xl font-semibold leading-tight tracking-[-0.02em] text-ink-high sm:text-5xl">
                Replace separate chats and sheets with information people can use.
              </h2>
            </div>
            <div className="space-y-6 text-base leading-8 text-ink-low">
              <p>
                shaadi.diy replaces scattered spreadsheets, family WhatsApp threads and vendor
                notes with records that stay connected. Couples, parents, siblings and planners can
                check the same guest counts, rooms, budgets, vendors and events.
              </p>
              <div className="grid gap-5 text-sm leading-7 text-ink-mid sm:grid-cols-3">
                {HERO_METRICS.map((metric) => (
                  <div key={metric.value}>
                    <p className="font-serif-display text-2xl font-semibold text-[#3a1722]">
                      {metric.value}
                    </p>
                    <p className="mt-1 text-ink-low">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Infographic 1: WhatsApp RSVP ── */}
      <section id="rsvp" className="bg-surface-panel">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 lg:grid-cols-2">
          <motion.div {...rise}>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#128C7E]">
              WhatsApp RSVPs
            </p>
            <h2 className="font-serif-display text-4xl font-semibold leading-tight tracking-[-0.02em] text-ink-high sm:text-5xl">
              Turn guest replies into guest-list updates.
            </h2>
            <p className="mt-5 text-base leading-8 text-ink-low">
              Send invites through the channel guests already use. Capture attendance, headcount and
              meal preferences directly in the guest list so family members and caterers are working
              with the latest count.
            </p>
            <ul className="mt-7 space-y-3 text-[15px] text-ink-mid">
              {[
                'Import guest lists, group families and track invited, confirmed, declined and pending responses.',
                'Segment by bride side, groom side, event, meal preference, travel status and accommodation needs.',
                'Export final numbers for caterers, hotel desks, planners and family coordinators.',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <FiCheck className="mt-1 shrink-0 text-gold-600" />
                  {t}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div {...rise}>
            <RsvpInfographic />
          </motion.div>
        </div>
      </section>

      {/* ── Infographic 2: Rooms ── */}
      <section id="rooms" className="bg-[#f4ecdf]">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 lg:grid-cols-2">
          <motion.div {...rise} className="order-2 lg:order-1">
            <RoomsInfographic />
          </motion.div>
          <motion.div {...rise} className="order-1 lg:order-2">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-gold-700">
              Accommodation
            </p>
            <h2 className="font-serif-display text-4xl font-semibold leading-tight tracking-[-0.02em] text-ink-high sm:text-5xl">
              Build room lists before check-in.
            </h2>
            <p className="mt-5 text-base leading-8 text-ink-low">
              For outstation guests, the room list has to match hotels, dates, capacity and family
              groupings. Keep those details together before the front desk starts assigning keys.
            </p>
            <ul className="mt-7 space-y-3 text-[15px] text-ink-mid">
              {[
                'Prevent overfilled rooms and duplicate assignments with capacity-aware allocation.',
                'Plan multi-hotel, multi-night stays with check-in and check-out dates.',
                'Share or print a rooming list for hotel staff and family coordinators.',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <FiCheck className="mt-1 shrink-0 text-gold-600" />
                  {t}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ── Infographic 3: Payments & budget ── */}
      <section id="payments" className="bg-surface-panel">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 lg:grid-cols-2">
          <motion.div {...rise}>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-maroon-600">
              Budget and payments
            </p>
            <h2 className="font-serif-display text-4xl font-semibold leading-tight tracking-[-0.02em] text-ink-high sm:text-5xl">
              Track what is planned, paid and still due.
            </h2>
            <p className="mt-5 text-base leading-8 text-ink-low">
              Vendor advances, balance payments and category budgets should not live in memory.
              Record commitments once, track due dates and compare planned amounts with actual
              spending.
            </p>
            <ul className="mt-7 space-y-3 text-[15px] text-ink-mid">
              {[
                'Maintain category budgets for venue, catering, decor, photography, music and custom costs.',
                'Track vendor payment schedules, paid amounts, pending balances and due dates.',
                'Use charts to find overruns by category before the next vendor discussion.',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <FiCheck className="mt-1 shrink-0 text-gold-600" />
                  {t}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div {...rise} className="pb-8">
            <PaymentsInfographic />
          </motion.div>
        </div>
      </section>

      {/* ── Everything else ── */}
      <section id="more" className="bg-[#fbf7ef]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <motion.div
            {...rise}
            className="mb-12 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end"
          >
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-gold-700">
                Planning modules
              </p>
              <h2 className="font-serif-display text-4xl font-semibold leading-tight tracking-[-0.02em] text-ink-high sm:text-5xl">
                The public website is only one part of the product.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-ink-low lg:ml-auto">
              The same account also holds the private work: people, dates, places, vendors, money
              and approvals. Use the public website for guests and the planning tools for the
              coordinators.
            </p>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MORE_FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                {...rise}
                transition={{ duration: 0.55, delay: (i % 3) * 0.08 }}
                className="group p-2"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-50 text-gold-700 transition-colors group-hover:bg-gold-100">
                  <f.icon size={18} />
                </div>
                <h3 className="text-[17px] font-semibold text-ink-high">{f.title}</h3>
                <p className="mt-2 text-sm leading-7 text-ink-low">{f.body}</p>
              </motion.div>
            ))}
          </div>

          <motion.div {...rise} className="mt-16 text-ink-mid">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-gold-700">
                  Common planning cases
                </p>
                <h3 className="font-serif-display text-3xl font-semibold leading-tight text-ink-high sm:text-4xl">
                  Useful when guest counts, rooms and payments keep changing.
                </h3>
              </div>
              <ul className="grid gap-3 text-sm leading-6 text-ink-low sm:grid-cols-2">
                {USE_CASES.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <FiCheck className="mt-1 shrink-0 text-gold-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#201a17]">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <motion.p
            {...rise}
            className="mb-4 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#c9ac70]"
          >
            Start with the records every wedding needs.
          </motion.p>
          <motion.h2
            {...rise}
            transition={{ ...rise.transition, delay: 0.08 }}
            className="font-serif-display text-4xl font-semibold leading-tight tracking-[-0.02em] text-[#fffaf2] sm:text-6xl"
          >
            Keep the guest list, event plan, room list and payment schedule in one account.
          </motion.h2>
          <motion.p
            {...rise}
            transition={{ ...rise.transition, delay: 0.16 }}
            className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#e7dccb]"
          >
            Add the essentials first, then invite parents, siblings or planners when they need
            access. Build the plan as the wedding details are confirmed.
          </motion.p>
          <motion.div {...rise} transition={{ ...rise.transition, delay: 0.24 }}>
            <button
              onClick={() => navigate('/onboard')}
              className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#c9ac70] px-9 py-4 text-base font-semibold text-[#201a17] shadow-[0_18px_42px_-26px_rgba(201,172,112,0.9)] transition-all hover:-translate-y-0.5 hover:bg-[#dbc58d]"
            >
              Start planning free
              <FiArrowRight />
            </button>
            <p className="mt-6 text-sm text-[#e7dccb]/80">
              Already have an account?{' '}
              <a href="/login" className="text-[#dbc58d] underline hover:text-[#f0ddb0]">
                Sign in
              </a>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#e7dccb] bg-[#fbf7ef]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-[#6f655b] sm:flex-row">
          <BrandLogo
            markSize={24}
            textClassName="font-serif-display text-base font-semibold text-[#201a17]"
          />
          <span>Free, open source wedding planning software for families and planners.</span>
        </div>
      </footer>
    </div>
  );
}
