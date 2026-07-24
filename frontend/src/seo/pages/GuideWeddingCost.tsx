import { GUIDE_AUTHOR, type FaqItem } from '../schema';
import {
  AnswerBlock,
  CheckList,
  CtaBand,
  DataTable,
  Faq,
  GuideHeader,
  H2,
  H3,
  OnThisPage,
  P,
  RelatedLinks,
  Section,
  SourceNote,
} from '../ui';

export const UPDATED = 'July 2026';
export const PUBLISHED_ISO = '2026-07-24';
export const MODIFIED_ISO = '2026-07-24';

export const faqs: FaqItem[] = [
  {
    q: 'How much does an Indian wedding cost?',
    a: 'It is best expressed per guest rather than as a single total, because guest count is the dominant driver. As a planning band, budget roughly ₹3,000–6,000 per guest for a three-function wedding in a smaller city, ₹5,000–10,000 in a tier-one city, and ₹8,000–18,000 for a four or five function metro wedding. Multiply by your guest count and add attire and jewellery separately.',
  },
  {
    q: 'What is the single biggest cost in an Indian wedding?',
    a: 'Catering and venue together, and both scale with the guest count. In most budgets they account for something close to half the total before decor, photography and attire are counted.',
  },
  {
    q: 'How much does wedding catering cost per plate in India?',
    a: 'It varies by city, menu and the number of live counters. As a band for sanity-checking quotes: roughly ₹1,200–2,500 per plate in a metro, ₹900–1,800 in a tier-one city and ₹600–1,200 in a smaller city. A caterer quotes per plate, so this is the number to compare directly.',
  },
  {
    q: 'Is jewellery part of the wedding budget?',
    a: 'Families differ, and this is the main reason published wedding budgets are hard to compare. Many treat jewellery as a separate family expense rather than a wedding cost. Decide once, and be consistent about it.',
  },
  {
    q: 'How can we reduce the cost without it showing?',
    a: 'Cut the guest count, cut the number of functions, or move off a peak date. Those three do almost all the work. Negotiating decor down by fifteen per cent saves far less than inviting fifty fewer people, and it is much more visible.',
  },
  {
    q: 'How much should we keep as contingency?',
    a: 'Around ten per cent of the total, untouched. Late guest-list additions, decor changes and last-minute transport are the usual causes and they tend to arrive together.',
  },
];

const SECTIONS = [
  { id: 'per-guest', label: 'Why per guest, not per wedding' },
  { id: 'bands', label: 'Planning bands by city and scale' },
  { id: 'components', label: 'Where the money goes' },
  { id: 'guest-count', label: 'What changing the guest count does' },
  { id: 'hidden', label: 'The costs people forget' },
  { id: 'saving', label: 'What actually saves money' },
  { id: 'faq', label: 'Frequently asked' },
];

export default function GuideWeddingCost() {
  return (
    <>
      <GuideHeader
        eyebrow="Cost guide"
        title="How much does an Indian wedding cost?"
        lead="A per-guest way of estimating that survives contact with real quotes, what each component contributes, and which three levers actually change the total."
        author={GUIDE_AUTHOR}
        updated={UPDATED}
      />

      <Section tone="panel" width="prose">
        <AnswerBlock>
          Estimate an Indian wedding per guest, not as a lump sum. As a planning band: roughly{' '}
          <strong>₹3,000–6,000 per guest</strong> for a three-function wedding in a smaller city,{' '}
          <strong>₹5,000–10,000</strong> in a tier-one city, and <strong>₹8,000–18,000</strong> for a
          four or five function metro wedding. At 300 guests that is about ₹9–18 lakh, ₹15–30 lakh
          and ₹24–54 lakh respectively — with attire and jewellery counted separately.
        </AnswerBlock>

        <SourceNote>
          <strong>About these numbers.</strong> They are planning bands built up from per-plate
          catering and venue costs, not survey figures — their job is to tell you whether a quote is
          in a sane range, and to be replaced by real quotes as soon as you have two or three. Indian
          wedding spending varies enormously by region, community, city and whether jewellery is
          counted at all, so anyone quoting you a single precise national average is guessing. For
          published survey data, WedMeGood&rsquo;s annual Big Fat Indian Wedding Report is the most
          widely cited source; check the current edition directly rather than a number repeated
          second-hand.
        </SourceNote>

        <div className="mt-10">
          <OnThisPage items={SECTIONS} />
        </div>

        <H2 id="per-guest">Why per guest, not per wedding</H2>
        <P>
          Ask what an Indian wedding costs and you will be given a number between four lakh and four
          crore, all of them true for somebody. The number is useless because the two weddings being
          described are not the same event: one feeds 120 people at two functions in a hometown, the
          other feeds 600 across five functions in a metro hotel.
        </P>
        <P>
          Almost every large line item scales with headcount. Catering is quoted per plate. Venue
          capacity is priced in tiers. Transport is per vehicle per group. Even decor tends to scale
          with the size of the room you have to fill. So the estimate that survives is: cost per
          guest, multiplied by guests, plus the handful of things that do not move with headcount.
        </P>
        <P>
          Which means the honest first question is not &ldquo;what does a wedding cost&rdquo; but
          &ldquo;how many people are we feeding, how many times.&rdquo;
        </P>

        <H2 id="bands">Planning bands by city and scale</H2>
        <DataTable
          head={['Setting', 'Per guest, all functions', 'At 200 guests', 'At 400 guests']}
          rows={[
            ['Tier 2 / 3 city, 3 functions', '₹3,000–6,000', '₹6–12 lakh', '₹12–24 lakh'],
            ['Tier 1 city, 4 functions', '₹5,000–10,000', '₹10–20 lakh', '₹20–40 lakh'],
            ['Metro, 4–5 functions', '₹8,000–18,000', '₹16–36 lakh', '₹32–72 lakh'],
          ]}
          caption="Planning bands for sanity-checking quotes. Attire and jewellery are not included."
        />
        <P>
          The width of each band is the point. Within the same city and the same guest count, the
          menu, the venue and how much decor you want will move you from one end to the other. Use
          the band to work out whether your total is plausible, then let real quotes narrow it.
        </P>
        <P>
          The{' '}
          <a className="text-gold-700 underline" href="/tools/wedding-budget-calculator">
            budget calculator
          </a>{' '}
          does the arithmetic the other way round: put in the total you can spend, and it splits it
          across categories and tells you what that implies per plate.
        </P>

        <H2 id="components">Where the money goes</H2>
        <P>
          A common starting split across the whole budget, which every family then bends to its own
          priorities:
        </P>
        <DataTable
          head={['Category', 'Typical share', 'What moves it']}
          rows={[
            [
              'Venue and rooms',
              'About a fifth',
              'Guest count, date, whether you need guest rooms in the same property',
            ],
            [
              'Catering',
              'About a quarter',
              'Per plate rate, number of functions, live counters, alcohol',
            ],
            [
              'Decor and flowers',
              'Around a tenth to an eighth',
              'Size of the space, fresh flowers versus fabric, number of stages',
            ],
            [
              'Photography and video',
              'Around a tenth',
              'Number of shooters, number of days, whether a film is included',
            ],
            [
              'Attire and jewellery',
              'Highly variable',
              'Often kept outside the wedding budget entirely — decide and be consistent',
            ],
            [
              'Makeup and mehendi',
              'A few per cent',
              'Number of functions, whether the artist travels',
            ],
            [
              'Music and entertainment',
              'A few per cent',
              'Sangeet scale, live band versus DJ, choreography',
            ],
            [
              'Invitations and gifting',
              'A few per cent',
              'Printed card quality, favours, shagun trays',
            ],
            ['Travel and logistics', 'A few per cent', 'Outstation guest share, baraat, shuttles'],
          ]}
        />
        <P>
          Venue and catering together are usually close to half of everything. That is the practical
          reason guest count dominates: it is the input to both.
        </P>

        <H2 id="guest-count">What changing the guest count actually does</H2>
        <P>
          Take a tier-one wedding estimated at ₹7,000 per guest. The arithmetic is unkind and useful:
        </P>
        <DataTable
          head={['Guests', 'Estimated total', 'Change']}
          rows={[
            ['150', '₹10.5 lakh', '—'],
            ['250', '₹17.5 lakh', '+₹7 lakh'],
            ['400', '₹28 lakh', '+₹17.5 lakh'],
            ['600', '₹42 lakh', '+₹31.5 lakh'],
          ]}
          caption="Same wedding, same city, same vendors — only the headcount changes."
        />
        <P>
          No negotiation available to you moves the total like this. Which is why the guest list is a
          budget document, and why it is worth settling a{' '}
          <a className="text-gold-700 underline" href="/wedding-guest-list-manager">
            real household list
          </a>{' '}
          before booking a venue rather than after.
        </P>
        <H3>Not every guest costs the same</H3>
        <P>
          A guest invited only to the reception costs one plate. A guest invited to all five
          functions costs five, plus possibly four nights of a hotel room and a share of the airport
          transport. Per-event guest lists are not administrative fussiness — they are how you find
          out that your 400-person wedding is really a 160-person wedding with a large reception.
        </P>

        <H2 id="hidden">The costs people forget</H2>
        <CheckList
          className="mt-6"
          items={[
            'Venue overtime charges when the sangeet runs past the contracted closing time.',
            'Vendor meals — most contracts expect you to feed the crew, and a large crew is a real number of plates.',
            'Tips and shagun envelopes across dozens of vendors and staff, in cash, on the day.',
            'Transport for the vendors’ equipment, and parking at the venue.',
            'Alterations and second fittings after outfits are delivered.',
            'Room nights either side of the wedding for family who arrive early to set up.',
            'Printing, courier and delivery of invitation cards, which is rarely in the quoted card price.',
            'The pre-wedding shoot, which is often planned after the budget is set.',
          ]}
        />
        <P>
          Individually small, collectively often several per cent of the total. This is what the
          contingency line is for.
        </P>

        <H2 id="saving">What actually saves money</H2>
        <H3>Invite fewer people</H3>
        <P>
          The largest lever, by a distance, and the only one that reduces cost across catering,
          venue, transport and accommodation simultaneously. Fifty fewer guests is worth more than
          every discount you will negotiate all year.
        </P>
        <H3>Host fewer functions, or host them smaller</H3>
        <P>
          Five functions means five venues, five meals, five sets of decor and often five outfits. A
          family-only haldi and mehendi with a large sangeet and reception hosts everyone without
          hosting everyone five times.
        </P>
        <H3>Move off the peak date</H3>
        <P>
          Peak muhurat dates between November and February, and Saturday evenings in metros, are the
          most expensive slots vendors sell. A weekday or an off-peak month is often the single
          largest discount available, and it costs nothing but flexibility.
        </P>
        <H3>Commit early, and record what you committed</H3>
        <P>
          Booking nine months out lets you walk away from a quote; booking six weeks out does not,
          and vendors price accordingly. Then track what you have actually committed rather than
          only what you have paid — a category can look comfortably under budget while three balance
          payments are still outstanding. The{' '}
          <a className="text-gold-700 underline" href="/wedding-budget-planner">
            budget planner
          </a>{' '}
          keeps budgeted, allocated, paid and outstanding as four separate figures for this reason.
        </P>

        <H2 id="faq">Frequently asked</H2>
        <Faq items={faqs} />

        <RelatedLinks
          links={[
            {
              label: 'Wedding budget calculator',
              href: '/tools/wedding-budget-calculator',
              note: 'Split your total across categories now.',
            },
            {
              label: 'Wedding budget planner',
              href: '/wedding-budget-planner',
              note: 'Track allocated, paid and outstanding per vendor.',
            },
            {
              label: 'How to plan an Indian wedding',
              href: '/guides/how-to-plan-an-indian-wedding',
              note: 'The order the decisions have to happen in.',
            },
            {
              label: 'Indian wedding checklist',
              href: '/guides/indian-wedding-checklist',
              note: 'When each payment falls due.',
            },
            {
              label: 'Guest list manager',
              href: '/wedding-guest-list-manager',
              note: 'The number that drives the total.',
            },
            {
              label: 'Free wedding website',
              href: '/wedding-website',
              note: 'One line item you can take off the list.',
            },
          ]}
        />
      </Section>

      <CtaBand
        title="An estimate is a start. Track the real thing."
        body="Set category budgets in rupees, record what each vendor is committed to, and see what is still outstanding — free."
        ctaSource="guide-wedding-cost"
      />
    </>
  );
}
