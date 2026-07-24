/** Presentational primitives for the prerendered SEO pages.
 *
 *  Hard constraint (see SEO_PLAN.md, Part H1): everything here must render
 *  under `react-dom/server` with no browser APIs. That means plain markup,
 *  Tailwind classes from the Marketing.tsx vocabulary, CSS animations from
 *  index.css, and react-icons. No framer-motion, no router, no hooks that
 *  read the DOM.
 */

import type { ReactNode } from 'react';
import { FiArrowRight, FiCheck, FiChevronRight } from 'react-icons/fi';
import type { Crumb, FaqItem } from './schema';
import { signupUrl } from './site';

/* ── Section shell ──────────────────────────────────────────────────────── */

type Tone = 'page' | 'panel' | 'raised' | 'dark';

const TONE_BG: Record<Tone, string> = {
  page: 'bg-[#fbf7ef]',
  panel: 'bg-surface-panel',
  raised: 'bg-[#f4ecdf]',
  dark: 'bg-[#201a17]',
};

export function Section({
  id,
  tone = 'panel',
  width = 'wide',
  children,
}: {
  id?: string;
  tone?: Tone;
  width?: 'wide' | 'prose';
  children: ReactNode;
}) {
  return (
    <section id={id} className={TONE_BG[tone]}>
      <div
        className={`mx-auto px-6 py-16 sm:py-20 ${width === 'prose' ? 'max-w-3xl' : 'max-w-6xl'}`}
      >
        {children}
      </div>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-gold-700">
      {children}
    </p>
  );
}

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="font-serif-display text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink-high sm:text-4xl"
    >
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-9 text-[19px] font-semibold text-ink-high">{children}</h3>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-[15px] leading-8 text-ink-low">{children}</p>;
}

/* ── Hero ───────────────────────────────────────────────────────────────── */

export function Hero({
  eyebrow,
  title,
  lead,
  cta = 'Start planning free',
  ctaSource,
  secondary,
  aside,
}: {
  eyebrow: string;
  title: string;
  lead: ReactNode;
  cta?: string;
  ctaSource: string;
  secondary?: { label: string; href: string };
  aside?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden bg-[#fbf7ef]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(55% 45% at 82% 16%, rgba(201,172,112,0.24) 0%, transparent 64%), radial-gradient(45% 42% at 8% 82%, rgba(74,29,43,0.08) 0%, transparent 68%)',
        }}
      />
      <div
        className={`relative mx-auto max-w-6xl gap-12 px-6 py-16 sm:py-20 ${
          aside ? 'grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center' : ''
        }`}
      >
        <div>
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#9b7a3e]">
            {eyebrow}
          </p>
          <h1 className="font-serif-display text-4xl font-semibold leading-[1.02] tracking-[-0.03em] text-[#201a17] sm:text-6xl">
            {title}
          </h1>
          <div className="mt-6 max-w-2xl text-lg leading-8 text-[#5f554d]">{lead}</div>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={signupUrl(ctaSource)}
              className="group flex items-center gap-2 rounded-full bg-[#3a1722] px-7 py-3.5 text-base font-semibold text-white shadow-[0_18px_42px_-26px_rgba(58,23,34,0.85)] transition-all hover:-translate-y-0.5 hover:bg-[#4a1d2b]"
            >
              {cta}
              <FiArrowRight className="transition-transform group-hover:translate-x-1" />
            </a>
            {secondary && (
              <a
                href={secondary.href}
                className="rounded-full border border-[#d6c8b5] px-6 py-3.5 text-base font-medium text-[#3e3732] transition-all hover:-translate-y-0.5 hover:border-[#b79b62] hover:bg-white/70"
              >
                {secondary.label}
              </a>
            )}
          </div>
          <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#6f655b]">
            {['Free to start', 'No credit card', 'Invite family anytime'].map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <FiCheck className="text-[#9b7a3e]" />
                {item}
              </span>
            ))}
          </p>
        </div>
        {aside && <div>{aside}</div>}
      </div>
    </header>
  );
}

/** Guides open plainer than landing pages: headline, byline, and the answer.
 *  No hero art competing with the first paragraph. */
export function GuideHeader({
  eyebrow,
  title,
  lead,
  author,
  updated,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  author: string;
  updated: string;
}) {
  return (
    <header className="bg-[#fbf7ef]">
      <div className="mx-auto max-w-3xl px-6 py-14 sm:py-16">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#9b7a3e]">
          {eyebrow}
        </p>
        <h1 className="font-serif-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-[#201a17] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-6 text-lg leading-8 text-[#5f554d]">{lead}</p>
        <Byline author={author} updated={updated} />
      </div>
    </header>
  );
}

/** Jump links. On a 2,000-word guide these are what make it usable on a
 *  phone, and Google sometimes surfaces them as sitelinks. */
export function OnThisPage({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav aria-label="On this page" className="rounded-2xl border border-line bg-[#fbf7ef] px-6 py-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-700">
        On this page
      </p>
      <ol className="mt-4 space-y-2 text-[15px]">
        {items.map((item, i) => (
          <li key={item.id} className="flex gap-3">
            <span className="tabular-nums text-ink-dim">{i + 1}.</span>
            <a href={`#${item.id}`} className="text-ink-mid underline-offset-4 hover:underline">
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ── Snippet-target answer block ────────────────────────────────────────── */

/** The 40–55 word direct answer that sits immediately under the H1. Google
 *  lifts these for featured snippets, and readers get their answer without
 *  scrolling. */
export function AnswerBlock({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border-l-[3px] border-gold-500 bg-[#fbf7ef] px-6 py-5 text-[15px] leading-8 text-ink-mid">
      {children}
    </div>
  );
}

/* ── Lists ──────────────────────────────────────────────────────────────── */

export function CheckList({ items, className }: { items: ReactNode[]; className?: string }) {
  return (
    <ul className={`space-y-3 text-[15px] leading-7 text-ink-mid ${className ?? ''}`}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <FiCheck className="mt-1.5 shrink-0 text-gold-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function NumberedSteps({ steps }: { steps: { name: string; text: ReactNode }[] }) {
  return (
    <ol className="mt-8 space-y-7">
      {steps.map((step, i) => (
        <li key={step.name} className="flex gap-5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-50 font-serif-display text-base font-semibold text-gold-700">
            {i + 1}
          </span>
          <div>
            <h3 className="text-[17px] font-semibold text-ink-high">{step.name}</h3>
            <div className="mt-2 text-[15px] leading-8 text-ink-low">{step.text}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ── Feature grid ───────────────────────────────────────────────────────── */

export function FeatureGrid({
  items,
}: {
  items: { icon: React.ComponentType<{ size?: number }>; title: string; body: string }[];
}) {
  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((f) => (
        <div key={f.title} className="p-2">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-50 text-gold-700">
            <f.icon size={18} />
          </div>
          <h3 className="text-[17px] font-semibold text-ink-high">{f.title}</h3>
          <p className="mt-2 text-sm leading-7 text-ink-low">{f.body}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Table ──────────────────────────────────────────────────────────────── */

export function DataTable({
  head,
  rows,
  caption,
}: {
  head: string[];
  rows: ReactNode[][];
  caption?: ReactNode;
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[520px] border-collapse text-left text-[15px]">
        {caption && (
          <caption className="px-5 pb-3 pt-4 text-left text-sm text-ink-low">{caption}</caption>
        )}
        <thead>
          <tr className="bg-[#f4ecdf]">
            {head.map((h) => (
              <th
                key={h}
                className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-low"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-line-soft">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-5 py-3 align-top leading-7 ${
                    j === 0 ? 'font-medium text-ink-high' : 'text-ink-low'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── FAQ ────────────────────────────────────────────────────────────────── */

/** Renders the same questions that go into the page's FAQPage schema, so the
 *  markup and the structured data can never disagree. */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="mt-8 divide-y divide-line-soft border-t border-line-soft">
      {items.map((item) => (
        <div key={item.q} className="py-6">
          <h3 className="text-[17px] font-semibold text-ink-high">{item.q}</h3>
          <p className="mt-3 text-[15px] leading-8 text-ink-low">{item.a}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Cross-links & CTA ──────────────────────────────────────────────────── */

export function RelatedLinks({
  title = 'Keep reading',
  links,
}: {
  title?: string;
  links: { label: string; href: string; note: string }[];
}) {
  return (
    <div className="mt-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-700">{title}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="group rounded-2xl border border-line bg-surface-panel p-5 transition-colors hover:border-gold-300"
          >
            <span className="flex items-center gap-1.5 text-[15px] font-semibold text-ink-high">
              {l.label}
              <FiChevronRight className="text-gold-600 transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="mt-2 block text-sm leading-6 text-ink-low">{l.note}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function CtaBand({
  title,
  body,
  cta = 'Start planning free',
  ctaSource,
}: {
  title: string;
  body: string;
  cta?: string;
  ctaSource: string;
}) {
  return (
    <section className="bg-[#201a17]">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="font-serif-display text-3xl font-semibold leading-tight tracking-[-0.02em] text-[#fffaf2] sm:text-5xl">
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-[#e7dccb]">{body}</p>
        <a
          href={signupUrl(ctaSource)}
          className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#c9ac70] px-9 py-4 text-base font-semibold text-[#201a17] shadow-[0_18px_42px_-26px_rgba(201,172,112,0.9)] transition-all hover:-translate-y-0.5 hover:bg-[#dbc58d]"
        >
          {cta}
          <FiArrowRight />
        </a>
        <p className="mt-6 text-sm text-[#e7dccb]/80">
          Already have an account?{' '}
          <a href="/login" className="text-[#dbc58d] underline hover:text-[#f0ddb0]">
            Sign in
          </a>
        </p>
      </div>
    </section>
  );
}

/* ── Bylines & sourcing ─────────────────────────────────────────────────── */

export function Byline({ author, updated }: { author: string; updated: string }) {
  return (
    <p className="mt-6 text-sm text-ink-low">
      By {author} · Last updated {updated}
    </p>
  );
}

/** Used wherever a page shows money. We publish planning bands, not survey
 *  data, and say so rather than dressing estimates up as statistics. */
export function SourceNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 rounded-xl bg-[#f4ecdf] px-5 py-4 text-[13px] leading-7 text-ink-low">
      {children}
    </p>
  );
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="bg-[#fbf7ef]">
      <ol className="mx-auto flex max-w-6xl flex-wrap items-center gap-1.5 px-6 pt-6 text-[13px] text-ink-low">
        {crumbs.map((c, i) => (
          <li key={c.path} className="flex items-center gap-1.5">
            {i > 0 && <FiChevronRight size={12} className="text-ink-dim" />}
            {i === crumbs.length - 1 ? (
              <span aria-current="page" className="text-ink-mid">
                {c.name}
              </span>
            ) : (
              <a href={c.path} className="hover:text-ink-high hover:underline">
                {c.name}
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
