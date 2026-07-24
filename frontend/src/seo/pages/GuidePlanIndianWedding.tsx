import { GUIDE_AUTHOR, type FaqItem, type HowToStep } from '../schema';
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

export const howToSteps: HowToStep[] = [
  {
    name: 'Agree the budget ceiling and who is paying for what',
    text: 'Before any vendor conversation, settle the maximum total and which family or person covers which categories. Every later decision references this number.',
  },
  {
    name: 'Fix the guest count band',
    text: 'Draft the household list with both families and settle on a range for your largest function. Venue, catering and transport all price off this number.',
  },
  {
    name: 'Choose the date and the functions',
    text: 'Settle the muhurat or date window with both families, then decide which functions you are hosting — mehendi, haldi, sangeet, the wedding and the reception each carry their own costs.',
  },
  {
    name: 'Book the venue or venues',
    text: 'Venues book out furthest ahead, especially on peak dates. Confirm capacity against your guest band, and check what the venue mandates — in-house catering, decor vendors, alcohol policy and closing time.',
  },
  {
    name: 'Book catering, photography and decor',
    text: 'These three are the next to go, and good ones are booked six to nine months ahead on peak dates. Get quotes in writing with what is included and what is extra.',
  },
  {
    name: 'Send invitations and open RSVPs',
    text: 'Send save-the-dates as soon as the date is fixed, invitations six to eight weeks out, and collect RSVPs somewhere they turn into a headcount rather than a chat thread.',
  },
  {
    name: 'Arrange guest accommodation and travel',
    text: 'Block hotel rooms once you know roughly how many outstation guests you have, and build the rooming list against real check-in and check-out dates.',
  },
  {
    name: 'Confirm final numbers and pay balances',
    text: 'In the last two weeks, give every vendor a final headcount, confirm timings in writing, and clear balance payments so nobody is chasing money on the day.',
  },
];

export const faqs: FaqItem[] = [
  {
    q: 'How far in advance should you plan an Indian wedding?',
    a: 'Nine to twelve months is comfortable for a peak-season wedding, mostly because venues and the better caterers and photographers book that far ahead on popular dates. Four to six months is workable off-peak, and weddings have been pulled together in six weeks — it costs more, because you lose the ability to walk away from a quote.',
  },
  {
    q: 'What should you book first?',
    a: 'The venue, once the date and guest count are settled. Everything else — catering scale, decor, transport, room blocks — is downstream of where and how many.',
  },
  {
    q: 'Do we need a wedding planner?',
    a: 'It depends on the number of functions and how much time the family actually has. A planner is worth most when there are several venues, many outstation guests and no one free on weekdays to chase vendors. Many families use a coordinator only for the wedding days rather than the whole planning period.',
  },
  {
    q: 'How do you split the work between families?',
    a: 'By category, in writing, early. The usual split gives each side its own guest list and invitations, with venue, catering, decor and photography owned by whoever is hosting that function. Ambiguity about who is booking the transport is what causes the last-minute scramble.',
  },
  {
    q: 'What is the most common planning mistake?',
    a: 'Booking a venue before settling the guest count. A hall that fits 250 comfortably and 400 badly turns into a seating problem you cannot fix in the last week, and moving the venue late costs you the deposit.',
  },
];

const SECTIONS = [
  { id: 'three-decisions', label: 'The three decisions that come first' },
  { id: 'guest-list', label: 'Build the guest list before you book anything' },
  { id: 'functions', label: 'Decide which functions you are hosting' },
  { id: 'vendors', label: 'Book vendors in the right order' },
  { id: 'invitations', label: 'Invitations and RSVPs' },
  { id: 'guests', label: 'Guest travel and accommodation' },
  { id: 'timeline', label: 'A workable timeline' },
  { id: 'final-month', label: 'The final month' },
  { id: 'faq', label: 'Frequently asked' },
];

export default function GuidePlanIndianWedding() {
  return (
    <>
      <GuideHeader
        eyebrow="Planning guide"
        title="How to plan an Indian wedding"
        lead="The order the decisions actually have to happen in, what depends on what, and where families most often lose money by doing things out of sequence."
        author={GUIDE_AUTHOR}
        updated={UPDATED}
      />

      <Section tone="panel" width="prose">
        <AnswerBlock>
          Plan an Indian wedding in this order: agree the budget ceiling, fix the guest count, settle
          the date and the list of functions, book the venue, then book catering, photography and
          decor. Invitations, accommodation and final headcounts follow. Almost every expensive
          mistake comes from doing one of the first three steps after one of the last five.
        </AnswerBlock>

        <div className="mt-10">
          <OnThisPage items={SECTIONS} />
        </div>

        <H2 id="three-decisions">The three decisions that come first</H2>
        <P>
          A wedding has hundreds of choices in it, but only three of them constrain everything else:
          how much you will spend, how many people you will feed, and when. Until those are settled,
          every vendor conversation is hypothetical — and quotes you cannot compare against a number
          are quotes that anchor you.
        </P>
        <H3>The budget ceiling, and who pays for what</H3>
        <P>
          Two families with different assumptions about who is covering the sangeet is a conversation
          that gets harder the longer it is postponed. Settle the total, then split it by category —
          venue, catering, decor, photography, attire, travel — and write down which side or which
          person owns each. Keep roughly a tenth of the total untouched as contingency, because
          something always arrives late and costs more than the quote.
        </P>
        <H3>The guest count</H3>
        <P>
          This is the largest single lever on cost in the entire wedding. Catering is priced per
          plate, venue capacity is priced in tiers, transport is per vehicle and decor often scales
          with the size of the room. A hundred guests either way changes the total more than any
          negotiation you will win. Settle a range early, and treat it as a decision rather than
          something that drifts.
        </P>
        <H3>The date</H3>
        <P>
          If your families follow muhurat dates, that narrows the window before anything else does,
          and the popular dates in the November-to-February season are exactly when venues and the
          better vendors sell out first. If you have flexibility, a weekday or an off-peak month is
          the largest discount available to you and costs nothing but convenience.
        </P>

        <H2 id="guest-list">Build the guest list before you book anything</H2>
        <P>
          Not a final list — a household list. Both families draft theirs separately, then you merge
          and count. The reason this comes before venue booking rather than after is simple: a hall
          that seats 250 comfortably and 400 badly is a problem you cannot solve in the last week,
          and a venue deposit is not refundable because your uncle remembered forty more people.
        </P>
        <CheckList
          className="mt-7"
          items={[
            'Work in households, not individuals. Invitations go to families, and the headcount rolls up from there.',
            'Mark which functions each household is invited to. The mehendi list, the sangeet list and the reception list are rarely the same, and each is a separate catering number.',
            'Flag outstation guests immediately — they drive the hotel block and a good share of the transport budget.',
            'Agree a tie-breaker rule with both families now, in the abstract, rather than arguing case by case later.',
          ]}
        />
        <P>
          Keep the list somewhere both families can edit and both see the same numbers. A{' '}
          <a className="text-gold-700 underline" href="/wedding-guest-list-manager">
            shared guest list
          </a>{' '}
          that tracks side, household, per-event invitations and RSVP status is the difference
          between a headcount you trust and one you recount every time someone asks.
        </P>

        <H2 id="functions">Decide which functions you are hosting</H2>
        <P>
          Every function is effectively a small event with its own venue, food, decor, outfits and
          guest list. Going from three functions to five is close to a proportional increase across
          several budget categories at once — which is worth knowing before it happens by accretion.
        </P>
        <DataTable
          head={['Function', 'Typically', 'What it usually needs']}
          rows={[
            [
              'Roka / engagement',
              'Months earlier, small',
              'A venue for close family, a photographer, a meal',
            ],
            [
              'Mehendi',
              'Day or two before',
              'Mehendi artists, seating, light food, daytime decor, music',
            ],
            [
              'Haldi',
              'Morning before',
              'Outdoor or courtyard space, clothes nobody minds ruining, a photographer',
            ],
            [
              'Sangeet',
              'Evening before',
              'The largest entertainment budget — stage, sound, DJ, choreography, dinner',
            ],
            [
              'Wedding / pheras',
              'The main day',
              'Mandap, pandit, baraat logistics, the full guest list, catering at scale',
            ],
            [
              'Reception',
              'Same night or after',
              'Usually the largest headcount, formal catering, stage and photography',
            ],
          ]}
        />
        <P>
          Decide the list, then decide which ones are large and which are family-only. A small haldi
          and a large reception is a common and effective way to host everyone without hosting
          everyone five times.
        </P>

        <H2 id="vendors">Book vendors in the right order</H2>
        <P>
          The order is set by scarcity, not importance. Book what runs out first.
        </P>
        <H3>1. Venue</H3>
        <P>
          Confirm capacity against your guest band, then read what the venue mandates. In-house
          catering, a fixed decor vendor list, alcohol policy, a hard closing time and charges for
          overtime are all things that change your budget after you have signed. Ask about parking
          and about where the baraat can actually assemble.
        </P>
        <H3>2. Catering</H3>
        <P>
          Quoted per plate, so it moves with your guest count directly. Get the inclusions in
          writing: number of live counters, dessert, service staff ratio, whether the sangeet menu is
          priced separately, and what happens if the final headcount comes in under the minimum
          guarantee. Taste the food before you sign, at the scale you are ordering.
        </P>
        <H3>3. Photography and video</H3>
        <P>
          The one category you cannot redo. Confirm which photographer from the studio is actually
          shooting your wedding — not whose portfolio you were shown — how many shooters and days
          are included, and the delivery timeline for the album and the film in writing.
        </P>
        <H3>4. Decor, music and the rest</H3>
        <P>
          Decor quotes are the hardest to compare because scope varies wildly, so ask for
          itemisation rather than a single number. For music, confirm whether sound and lighting are
          included or hired separately, and check the venue&rsquo;s noise cut-off time before you
          plan a late sangeet.
        </P>
        <SourceNote>
          Every vendor commitment should be recorded the moment you agree it, not when you pay it.
          The number that protects you is what you have committed to across all vendors — a category
          can look comfortably under budget while three balance payments are still outstanding. The{' '}
          <a className="text-gold-700 underline" href="/wedding-budget-planner">
            budget planner
          </a>{' '}
          keeps budgeted, allocated, paid and outstanding as four separate figures for exactly this
          reason.
        </SourceNote>

        <H2 id="invitations">Invitations and RSVPs</H2>
        <P>
          Save-the-dates go out as soon as the date is fixed, particularly for outstation guests who
          need to book leave and travel. Formal invitations follow six to eight weeks before, and
          for family elders that still means a printed card delivered in person.
        </P>
        <P>
          The replies, though, almost all arrive on WhatsApp. That is worth designing around rather
          than resisting: put the details on a{' '}
          <a className="text-gold-700 underline" href="/wedding-website">
            wedding website
          </a>{' '}
          with a map, the schedule and an RSVP form, print its QR code on the card, and send the link
          over WhatsApp. Then the answer lands as a record instead of as a message someone has to
          remember to transcribe. The{' '}
          <a
            className="text-gold-700 underline"
            href="/guides/how-to-send-wedding-invitations-on-whatsapp"
          >
            WhatsApp invitation guide
          </a>{' '}
          covers the sending mechanics, including the template approval that catches most people out.
        </P>

        <H2 id="guests">Guest travel and accommodation</H2>
        <P>
          For a wedding with a significant outstation contingent, this is a logistics exercise, not a
          courtesy. Block hotel rooms once you have a rough count — blocks are usually releasable up
          to a cut-off date, so booking early costs less than booking late.
        </P>
        <CheckList
          className="mt-7"
          items={[
            'Build the rooming list against real check-in and check-out dates. Guests who arrive for the mehendi and leave after the reception need four nights; guests who come only for the wedding need one.',
            'Respect room capacity. Two rooms allocated to the same family with one bed spare each is the kind of error that surfaces at the front desk at 11pm.',
            'Group families together, and put elderly guests on lower floors near a lift.',
            'Agree airport and station pickups by arrival slot rather than per guest, and share the vehicle list with whoever is coordinating on the day.',
            'Hand the hotel a printed rooming list. The front desk is not going to open your app.',
          ]}
        />

        <H2 id="timeline">A workable timeline</H2>
        <DataTable
          head={['When', 'What should be happening']}
          rows={[
            [
              '9–12 months out',
              'Budget ceiling, guest count band, date window, venue booked, planner engaged if you are using one',
            ],
            [
              '6–9 months',
              'Catering, photography and decor booked; save-the-dates sent; hotel block held',
            ],
            [
              '4–6 months',
              'Outfits commissioned, music and entertainment booked, mehendi and makeup artists confirmed, wedding website published',
            ],
            [
              '2–3 months',
              'Invitations printed and sent, RSVP tracking opened, transport arranged, gifting and favours ordered',
            ],
            [
              '1 month',
              'Rooming list built, running order agreed with every vendor, trials done, balance payment dates confirmed',
            ],
            [
              '2 weeks',
              'Final headcounts to caterer and venue, timings confirmed in writing, on-day contact list circulated',
            ],
            [
              'The week',
              'Balance payments cleared, guest arrivals tracked, one person nominated as the vendor point of contact',
            ],
          ]}
        />
        <P>
          The{' '}
          <a className="text-gold-700 underline" href="/guides/indian-wedding-checklist">
            Indian wedding checklist
          </a>{' '}
          breaks the same timeline into individual tasks you can tick off.
        </P>

        <H2 id="final-month">The final month</H2>
        <P>
          The last four weeks are less about decisions and more about making sure everyone has the
          same information. Three things are worth doing deliberately.
        </P>
        <H3>Give every vendor a final number, in writing</H3>
        <P>
          Caterers, venues and transport all price off headcount, and most contracts have a cut-off
          after which the number is fixed. Send it as a message you can point to later, not over a
          phone call.
        </P>
        <H3>Write the running order</H3>
        <P>
          A single sheet per function: what happens, at what time, who is responsible, and which
          vendor needs to be set up by when. Share it with the photographer and the coordinator —
          they are the two people whose day depends on knowing what is next.
        </P>
        <H3>Nominate one point of contact per day</H3>
        <P>
          Not the couple. Someone who has the vendor list, the payment status and the authority to
          make a small decision without a family meeting. This single choice removes most of the
          chaos people describe as unavoidable.
        </P>

        <H2 id="faq">Frequently asked</H2>
        <Faq items={faqs} />

        <RelatedLinks
          links={[
            {
              label: 'Indian wedding checklist',
              href: '/guides/indian-wedding-checklist',
              note: 'The same timeline as tickable tasks.',
            },
            {
              label: 'How much does an Indian wedding cost?',
              href: '/guides/how-much-does-an-indian-wedding-cost',
              note: 'What drives the total, category by category.',
            },
            {
              label: 'Send invitations on WhatsApp',
              href: '/guides/how-to-send-wedding-invitations-on-whatsapp',
              note: 'Getting invitations out and replies back.',
            },
            {
              label: 'Wedding planning app',
              href: '/wedding-planning-app',
              note: 'Keep all of this in one shared workspace.',
            },
            {
              label: 'Wedding budget calculator',
              href: '/tools/wedding-budget-calculator',
              note: 'Split a total across categories now.',
            },
            {
              label: 'Guest list manager',
              href: '/wedding-guest-list-manager',
              note: 'Per-event lists, households and RSVPs.',
            },
          ]}
        />
      </Section>

      <CtaBand
        title="Start with the guest list and the budget. Everything else is downstream."
        body="shaadi.diy is free: guest lists, WhatsApp RSVPs, budgets, vendors, rooms, events and a wedding website in one shared account."
        ctaSource="guide-plan-indian-wedding"
      />
    </>
  );
}
