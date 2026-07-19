import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

interface AuthShellProps {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  cardClassName?: string;
}

/** Shared chrome for login/signup/password-reset pages — matches the
 * marketing homepage's palette so auth doesn't feel like a different app. */
export default function AuthShell({ title, subtitle, children, cardClassName }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[#fbf7ef]">
      <nav className="border-b border-[#e7dccb] bg-[#fbf7ef]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 py-3.5">
          <Link to="/">
            <BrandLogo />
          </Link>
        </div>
      </nav>

      <div className="flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="font-serif-display text-3xl font-semibold text-[#201a17]">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-[#6f655b]">{subtitle}</p>}
          </div>

          <div
            className={
              cardClassName ??
              'bg-white rounded-2xl shadow-[0_28px_70px_-28px_rgba(64,48,32,0.4)] ring-1 ring-[#eadfce] p-8'
            }
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
