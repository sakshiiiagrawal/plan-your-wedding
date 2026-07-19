interface BrandMarkProps {
  size?: number;
  ink?: string;
  gold?: string;
  className?: string;
}

/** The shaadi.diy mark: an infinity drawn as two monoline loops — one ink,
 * one gold — meeting at the centre. Two lives entwined, forever. The two
 * halves are separate paths sharing the centre point so each keeps a crisp
 * single colour. */
export function BrandMark({
  size = 26,
  ink = '#201a17',
  gold = '#9b7a3e',
  className,
}: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M16 16 C12.8 11.2 5 11.4 5 16 C5 20.6 12.8 20.8 16 16"
        stroke={ink}
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M16 16 C19.2 11.2 27 11.4 27 16 C27 20.6 19.2 20.8 16 16"
        stroke={gold}
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface BrandLogoProps {
  /** Tailwind classes for the wordmark text; defaults to the light-scheme lockup. */
  textClassName?: string;
  accentClassName?: string;
  markSize?: number;
  ink?: string;
  gold?: string;
}

const MARK_DEFAULTS = { ink: '#201a17', gold: '#9b7a3e' };

/** Full lockup: mark + "shaadi.diy" wordmark. */
export default function BrandLogo({
  textClassName = 'font-serif-display text-2xl font-semibold text-[#201a17]',
  accentClassName = 'text-[#9b7a3e]',
  markSize = 32,
  ink = MARK_DEFAULTS.ink,
  gold = MARK_DEFAULTS.gold,
}: BrandLogoProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <BrandMark size={markSize} ink={ink} gold={gold} />
      <span className={textClassName}>
        shaadi<span className={accentClassName}>.diy</span>
      </span>
    </span>
  );
}
