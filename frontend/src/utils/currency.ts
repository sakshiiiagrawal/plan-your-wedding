export const CURRENCY_OPTIONS = [
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'AED', label: 'UAE Dirham (AED)' },
] as const;

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]['code'];

const LOCALE_FOR_CURRENCY: Record<string, string> = { INR: 'en-IN' };

function localeFor(currency: string): string {
  return LOCALE_FOR_CURRENCY[currency] ?? 'en-US';
}

// Set once by AuthContext whenever the logged-in user loads, so the many
// call sites across Vendors/Expense/Vendor-payments (which pre-date
// per-user currency) pick it up without threading it through every prop.
let activeCurrency = 'INR';

export function setActiveCurrency(code: string | undefined | null): void {
  activeCurrency = code || 'INR';
}

export function formatCurrency(amount: number, currency: string = activeCurrency): string {
  return new Intl.NumberFormat(localeFor(currency), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function currencySymbol(currency: string = activeCurrency): string {
  return formatCurrency(0, currency).replace(/[\d.,\s]/g, '');
}

// Trim a redundant trailing ".0" so whole values read as "2L" not "2.0L".
function trimDecimal(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

// India uses Lakh/Crore scaling; every other currency here uses the common
// Western K/M — Lakh/Crore isn't meaningful outside INR.
export function formatCurrencyCompact(amount: number, currency: string = activeCurrency): string {
  const symbol = currencySymbol(currency);
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  if (currency === 'INR') {
    if (abs >= 100000) return `${sign}${symbol}${trimDecimal(abs / 100000)}L`;
    if (abs >= 1000) return `${sign}${symbol}${trimDecimal(abs / 1000)}K`;
    return `${sign}${symbol}${abs}`;
  }
  if (abs >= 1000000) return `${sign}${symbol}${trimDecimal(abs / 1000000)}M`;
  if (abs >= 1000) return `${sign}${symbol}${trimDecimal(abs / 1000)}K`;
  return `${sign}${symbol}${abs}`;
}
