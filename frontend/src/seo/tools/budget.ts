/** Wedding budget calculator — model + client island.
 *
 *  The exported pure functions are used twice: once by the page component so
 *  the prerendered HTML already contains a worked example, and once by
 *  `mountBudget()` in the browser to recompute as the reader types. One
 *  source of truth, so the static example can never disagree with the widget.
 */

export interface BudgetCategory {
  id: string;
  label: string;
  /** Starting share of the total. Every one of these is editable in the UI. */
  pct: number;
  note: string;
}

/** A common starting split, not a rule. Regional norms, the number of
 *  functions and whether jewellery is counted in the wedding budget at all
 *  move these a lot — which is why every row is editable. */
export const BUDGET_CATEGORIES: BudgetCategory[] = [
  { id: 'venue', label: 'Venue & rooms', pct: 20, note: 'Hall or hotel hire, guest rooms' },
  { id: 'catering', label: 'Catering', pct: 25, note: 'Food and beverage across all functions' },
  { id: 'decor', label: 'Decor & flowers', pct: 12, note: 'Stage, mandap, florals, lighting' },
  { id: 'photo', label: 'Photo & video', pct: 10, note: 'Photography, film, album' },
  { id: 'attire', label: 'Attire & jewellery', pct: 15, note: 'Outfits for the main functions' },
  { id: 'beauty', label: 'Makeup & mehendi', pct: 4, note: 'Artists across the functions' },
  { id: 'music', label: 'Music & entertainment', pct: 5, note: 'DJ, band, dhol, choreography' },
  { id: 'invites', label: 'Invitations & gifting', pct: 4, note: 'Cards, favours, shagun trays' },
  { id: 'travel', label: 'Travel & logistics', pct: 5, note: 'Transport, guest pickups, baraat' },
];

export type CityTier = 'metro' | 'tier1' | 'tier2';

export interface TierInfo {
  id: CityTier;
  label: string;
  /** Planning band for catering per plate, in rupees. See the page's note:
   *  these are sanity-check ranges to compare quotes against, not survey
   *  data — replace them with your own quotes as soon as you have them. */
  plateLow: number;
  plateHigh: number;
}

export const CITY_TIERS: TierInfo[] = [
  { id: 'metro', label: 'Metro (Delhi NCR, Mumbai, Bengaluru)', plateLow: 1200, plateHigh: 2500 },
  { id: 'tier1', label: 'Tier 1 (Pune, Jaipur, Ahmedabad, Kochi)', plateLow: 900, plateHigh: 1800 },
  { id: 'tier2', label: 'Tier 2 / 3 city or hometown', plateLow: 600, plateHigh: 1200 },
];

/** The worked example baked into the static HTML. */
export const EXAMPLE = { total: 1500000, guests: 300, tier: 'metro' as CityTier };

export function formatINR(amount: number): string {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(
    Math.round(amount),
  )}`;
}

export function amountFor(total: number, pct: number): number {
  return (total * pct) / 100;
}

export function perPlate(total: number, cateringPct: number, guests: number): number {
  if (guests <= 0) return 0;
  return amountFor(total, cateringPct) / guests;
}

export type PlateVerdict = 'below' | 'within' | 'above';

export function plateVerdict(plate: number, tier: TierInfo): PlateVerdict {
  if (plate < tier.plateLow) return 'below';
  if (plate > tier.plateHigh) return 'above';
  return 'within';
}

export const VERDICT_TEXT: Record<PlateVerdict, string> = {
  below:
    'Below the usual band for this kind of city — either the guest count needs to come down, or catering needs a bigger share.',
  within: 'Inside the usual band for this kind of city. Compare it against real quotes next.',
  above:
    'Above the usual band for this kind of city — you have room to spend elsewhere, or to invite more people.',
};

/* ── Client island ──────────────────────────────────────────────────────── */

function num(el: Element | null): number {
  const value = Number((el as HTMLInputElement | null)?.value ?? '0');
  return Number.isFinite(value) ? value : 0;
}

/** Wires the prerendered table up to live recalculation. Everything it needs
 *  is already in the DOM — the defaults live in the rendered `value`
 *  attributes, so there is no second copy of the numbers here. */
export function mountBudget(root: HTMLElement): void {
  const totalEl = root.querySelector('#bc-total');
  const guestsEl = root.querySelector('#bc-guests');
  const tierEl = root.querySelector('#bc-tier') as HTMLSelectElement | null;
  const pctInputs = Array.from(root.querySelectorAll<HTMLInputElement>('input[data-cat]'));
  const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

  function recalc(): void {
    const total = num(totalEl);
    const guests = num(guestsEl);
    let sum = 0;

    for (const input of pctInputs) {
      const pct = Number(input.value) || 0;
      sum += pct;
      const cell = root.querySelector(`[data-amount="${input.dataset.cat}"]`);
      if (cell) cell.textContent = `₹${inr.format(Math.round((total * pct) / 100))}`;
    }

    const sumEl = root.querySelector('#bc-sum');
    if (sumEl) {
      sumEl.textContent = `${Math.round(sum * 10) / 10}%`;
      sumEl.classList.toggle('text-[var(--err)]', Math.abs(sum - 100) > 0.5);
    }
    const allocatedEl = root.querySelector('#bc-allocated');
    if (allocatedEl) allocatedEl.textContent = `₹${inr.format(Math.round((total * sum) / 100))}`;

    const cateringPct = Number(
      pctInputs.find((i) => i.dataset.cat === 'catering')?.value ?? '0',
    );
    const plate = guests > 0 ? (total * cateringPct) / 100 / guests : 0;
    const plateEl = root.querySelector('#bc-plate');
    if (plateEl) plateEl.textContent = `₹${inr.format(Math.round(plate))}`;

    const option = tierEl?.selectedOptions[0];
    const low = Number(option?.dataset.low ?? '0');
    const high = Number(option?.dataset.high ?? '0');
    const bandEl = root.querySelector('#bc-band');
    if (bandEl) bandEl.textContent = `₹${inr.format(low)}–₹${inr.format(high)}`;

    const verdictEl = root.querySelector('#bc-verdict');
    if (verdictEl) {
      const key = plate < low ? 'below' : plate > high ? 'above' : 'within';
      verdictEl.textContent = verdictEl.getAttribute(`data-${key}`) ?? '';
    }
  }

  root.addEventListener('input', recalc);
  root.addEventListener('change', recalc);
  recalc();
}
