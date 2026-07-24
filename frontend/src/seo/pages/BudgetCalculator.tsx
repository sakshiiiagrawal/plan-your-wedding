import type { FaqItem } from '../schema';
import {
  BUDGET_CATEGORIES,
  CITY_TIERS,
  EXAMPLE,
  VERDICT_TEXT,
  amountFor,
  formatINR,
  perPlate,
  plateVerdict,
} from '../tools/budget';
import {
  AnswerBlock,
  CheckList,
  CtaBand,
  Faq,
  H2,
  H3,
  P,
  RelatedLinks,
  Section,
  SourceNote,
} from '../ui';
import { signupUrl } from '../site';

export const faqs: FaqItem[] = [
  {
    q: 'How should I split a wedding budget across categories?',
    a: 'Venue and catering together usually take the largest share because both scale with the guest count. Decor, photography and attire follow. The calculator starts from a common split and lets you change every percentage, because the right answer depends on how many functions you are hosting and what your family considers non-negotiable.',
  },
  {
    q: 'What is a realistic per-plate catering cost?',
    a: 'It depends heavily on the city and the menu, which is why this page shows a band rather than a number. Use the band to sanity-check the share you have given catering, then replace it with the actual quotes you collect — a caterer will quote per plate, so the comparison is direct.',
  },
  {
    q: 'Should jewellery be inside the wedding budget?',
    a: 'Families differ. Many treat jewellery as a separate family expense rather than a wedding cost, which makes published wedding budgets look smaller than they are. Decide once, be consistent, and set the attire and jewellery percentage to zero if you are keeping it outside.',
  },
  {
    q: 'How much contingency should I keep?',
    a: 'Around 10% of the total, untouched. Late additions to the guest list, a second round of decor changes and last-minute transport are the usual causes, and they arrive together.',
  },
  {
    q: 'Can I track the real budget somewhere after this?',
    a: 'Yes. The free budget planner in shaadi.diy holds the same categories and then tracks what you have allocated to each vendor, what you have paid, and what is still outstanding.',
  },
];

export default function BudgetCalculator() {
  const tier = CITY_TIERS[0]!;
  const catering = BUDGET_CATEGORIES.find((c) => c.id === 'catering')!;
  const plate = perPlate(EXAMPLE.total, catering.pct, EXAMPLE.guests);
  const verdict = plateVerdict(plate, tier);
  const sum = BUDGET_CATEGORIES.reduce((total, c) => total + c.pct, 0);

  return (
    <>
      <Section tone="page">
        <h1 className="font-serif-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-[#201a17] sm:text-5xl">
          Wedding budget calculator
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5f554d]">
          Put in a total, a guest count and the kind of city you are marrying in. You get a category
          split in rupees you can adjust, and a per-plate figure to check it against.
        </p>

        {/* The widget. Prefilled and fully readable before any JavaScript runs —
            the island below only recomputes it as the reader types. */}
        <div
          data-island="budget"
          className="mt-10 rounded-3xl border border-line bg-surface-panel p-6 shadow-[0_28px_70px_-52px_rgba(64,48,32,0.5)] sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-3">
            <label className="block">
              <span className="label">Total budget (₹)</span>
              <input
                id="bc-total"
                className="input mt-1.5 w-full"
                type="number"
                min={0}
                step={50000}
                defaultValue={EXAMPLE.total}
              />
            </label>
            <label className="block">
              <span className="label">Guests (largest function)</span>
              <input
                id="bc-guests"
                className="input mt-1.5 w-full"
                type="number"
                min={1}
                step={10}
                defaultValue={EXAMPLE.guests}
              />
            </label>
            <label className="block">
              <span className="label">City</span>
              <select id="bc-tier" className="input mt-1.5 w-full" defaultValue={EXAMPLE.tier}>
                {CITY_TIERS.map((t) => (
                  <option key={t.id} value={t.id} data-low={t.plateLow} data-high={t.plateHigh}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[520px] border-collapse text-left text-[15px]">
              <thead>
                <tr className="bg-[#f4ecdf]">
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-low">
                    Category
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-low">
                    Share
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-low">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {BUDGET_CATEGORIES.map((c) => (
                  <tr key={c.id} className="border-t border-line-soft">
                    <td className="px-5 py-3">
                      <span className="font-medium text-ink-high">{c.label}</span>
                      <span className="mt-0.5 block text-[13px] text-ink-low">{c.note}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <input
                          className="input w-[76px] text-right"
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          data-cat={c.id}
                          aria-label={`${c.label} share of budget, percent`}
                          defaultValue={c.pct}
                        />
                        <span className="text-ink-low">%</span>
                      </span>
                    </td>
                    <td
                      data-amount={c.id}
                      className="px-5 py-3 text-right font-medium tabular-nums text-ink-high"
                    >
                      {formatINR(amountFor(EXAMPLE.total, c.pct))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-[#fbf7ef]">
                  <td className="px-5 py-3 font-semibold text-ink-high">Allocated</td>
                  <td id="bc-sum" className="px-5 py-3 font-semibold text-ink-high">
                    {sum}%
                  </td>
                  <td
                    id="bc-allocated"
                    className="px-5 py-3 text-right font-semibold tabular-nums text-ink-high"
                  >
                    {formatINR(amountFor(EXAMPLE.total, sum))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-6 rounded-2xl bg-[#fbf7ef] px-6 py-5">
            <p className="text-[15px] leading-8 text-ink-mid">
              At this split, catering works out to{' '}
              <strong id="bc-plate" className="text-ink-high">
                {formatINR(plate)}
              </strong>{' '}
              per plate. The usual planning band for this kind of city is{' '}
              <strong id="bc-band" className="text-ink-high">
                {formatINR(tier.plateLow)}–{formatINR(tier.plateHigh)}
              </strong>
              .
            </p>
            <p
              id="bc-verdict"
              className="mt-2 text-[15px] leading-8 text-ink-low"
              data-below={VERDICT_TEXT.below}
              data-within={VERDICT_TEXT.within}
              data-above={VERDICT_TEXT.above}
            >
              {VERDICT_TEXT[verdict]}
            </p>
          </div>

          <a
            href={signupUrl('budget-calculator')}
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#3a1722] px-6 py-3 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#4a1d2b]"
          >
            Track this budget for real — free
          </a>
        </div>

        <SourceNote>
          The per-plate bands are planning ranges for sanity-checking a split, not survey data.
          Catering quotes swing with the menu, the number of live counters, the day of the week and
          the season, so replace these with real quotes as soon as you have two or three. The
          category percentages are a common starting split, not a rule — every row is editable
          because families weight these very differently.
        </SourceNote>
      </Section>

      <Section tone="panel" width="prose">
        <AnswerBlock>
          To use a wedding budget calculator, start from a total you are actually willing to spend,
          fix the guest count for your largest function, and split the total across categories.
          Venue and catering together typically take the largest share, because both scale directly
          with the number of guests.
        </AnswerBlock>

        <H2 id="how-to-use">How to use this calculator</H2>
        <CheckList
          className="mt-6"
          items={[
            'Enter the total you can spend, including everything your family counts as a wedding cost.',
            'Use the guest count for your largest function — usually the reception. That is what catering and venue are priced against.',
            'Pick the city type. It only changes the per-plate band used to sanity-check your catering share.',
            'Adjust the percentages until the split matches your priorities. Watch the allocated row — if it reads more than 100%, you have over-committed.',
            'Compare the per-plate number against real quotes. If your split cannot pay for the menu you want, either the guest count or the total has to move.',
          ]}
        />

        <H2 id="what-drives-cost">What actually moves the total</H2>
        <P>
          Three levers do most of the work, and only one of them is about taste.
        </P>
        <H3>Guest count</H3>
        <P>
          The largest lever by a distance. Catering is per plate, and venue size, seating, transport
          and often decor follow the headcount. Cutting a hundred guests changes the budget more
          than any negotiation will.
        </P>
        <H3>Number of functions</H3>
        <P>
          A mehendi, haldi, sangeet, wedding and reception each need a venue, food, decor and often
          a separate set of outfits. Hosting five functions instead of three is close to a
          proportional increase in several categories at once.
        </P>
        <H3>Date and city</H3>
        <P>
          Peak muhurat dates in the November-to-February season and Saturday evenings in metros are
          the most expensive slots vendors sell. A weekday or an off-peak month is often the single
          largest discount available, and it costs you nothing but flexibility.
        </P>

        <H2 id="faq">Frequently asked</H2>
        <Faq items={faqs} />

        <RelatedLinks
          links={[
            {
              label: 'How much does an Indian wedding cost?',
              href: '/guides/how-much-does-an-indian-wedding-cost',
              note: 'Where the money goes, category by category.',
            },
            {
              label: 'Wedding budget planner',
              href: '/wedding-budget-planner',
              note: 'Track allocated, paid and outstanding per vendor.',
            },
            {
              label: 'Guest list manager',
              href: '/wedding-guest-list-manager',
              note: 'Fix the headcount that this calculator depends on.',
            },
            {
              label: 'Indian wedding checklist',
              href: '/guides/indian-wedding-checklist',
              note: 'When each payment usually comes due.',
            },
            {
              label: 'How to plan an Indian wedding',
              href: '/guides/how-to-plan-an-indian-wedding',
              note: 'The full sequence around the budget.',
            },
            {
              label: 'Wedding hashtag generator',
              href: '/tools/wedding-hashtag-generator',
              note: 'A free minute between two spreadsheets.',
            },
          ]}
        />
      </Section>

      <CtaBand
        title="A split is a plan. Payments are the reality."
        body="Move this budget into shaadi.diy and track what each vendor is committed to, what you have paid, and what is still due."
        ctaSource="budget-calculator-footer"
      />
    </>
  );
}
