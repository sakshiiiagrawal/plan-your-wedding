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

// India uses Lakh/Crore scaling; every other currency here uses the common
// Western K/M — Lakh/Crore isn't meaningful outside INR.
export function formatCurrencyCompact(amount: number, currency: string = activeCurrency): string {
  const symbol = currencySymbol(currency);
  if (currency === 'INR') {
    if (amount >= 100000) return `${symbol}${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(0)}K`;
    return `${symbol}${amount}`;
  }
  if (amount >= 1000000) return `${symbol}${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(0)}K`;
  return `${symbol}${amount}`;
}
