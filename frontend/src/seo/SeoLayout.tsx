/** Chrome shared by every prerendered SEO page: nav, breadcrumbs, footer hub.
 *
 *  There is no JavaScript here on purpose. The nav collapses to brand + CTA on
 *  small screens rather than shipping a hamburger toggle — the full link set
 *  lives in the footer, which is also what crawlers follow.
 */

import type { ReactNode } from 'react';
import BrandLogo from '../components/ui/BrandLogo';
import type { Crumb } from './schema';
import { Breadcrumbs } from './ui';
import { SEO_FOOTER, SEO_NAV, signupUrl } from './site';

export default function SeoLayout({
  crumbs,
  ctaSource,
  children,
}: {
  crumbs: Crumb[];
  ctaSource: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full bg-surface-panel text-ink-mid">
      <nav className="sticky top-0 z-30 border-b border-[#eadfce] bg-[#fbf7ef]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <a href="/" aria-label="shaadi.diy home">
            <BrandLogo
              markSize={26}
              textClassName="font-serif-display text-xl font-semibold text-[#201a17]"
            />
          </a>
          <div className="hidden items-center gap-7 text-sm text-[#6f655b] lg:flex">
            {SEO_NAV.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-[#201a17]">
                {item.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="hidden px-2 text-sm text-[#6f655b] transition-colors hover:text-[#201a17] sm:inline"
            >
              Sign in
            </a>
            <a
              href={signupUrl(ctaSource)}
              className="rounded-full bg-[#3a1722] px-5 py-2 text-sm font-semibold text-white shadow-[0_14px_34px_-24px_rgba(58,23,34,0.8)] transition-all hover:-translate-y-0.5 hover:bg-[#4a1d2b]"
            >
              Start free
            </a>
          </div>
        </div>
      </nav>

      <Breadcrumbs crumbs={crumbs} />

      <main>{children}</main>

      <footer className="border-t border-[#e7dccb] bg-[#fbf7ef]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <a href="/" aria-label="shaadi.diy home">
                <BrandLogo
                  markSize={24}
                  textClassName="font-serif-display text-base font-semibold text-[#201a17]"
                />
              </a>
              <p className="mt-4 max-w-xs text-sm leading-7 text-[#6f655b]">
                Free, open source wedding planning software for couples, families and planners in
                India.
              </p>
            </div>
            {SEO_FOOTER.map((col) => (
              <div key={col.title}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-700">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-2.5 text-sm text-[#6f655b]">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <a href={l.href} className="transition-colors hover:text-[#201a17]">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t border-[#e7dccb] pt-6 text-sm text-[#6f655b] sm:flex-row sm:items-center sm:justify-between">
            <span>&copy; {new Date().getFullYear()} shaadi.diy</span>
            <span className="flex gap-5">
              <a href="/" className="hover:text-[#201a17]">
                Home
              </a>
              <a href="/login" className="hover:text-[#201a17]">
                Sign in
              </a>
              <a
                href="https://github.com/sakshiiiagrawal/plan-your-wedding"
                rel="noopener"
                className="hover:text-[#201a17]"
              >
                Source on GitHub
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
