import { GUIDE_AUTHOR, type FaqItem, type HowToStep } from '../schema';
import {
  AnswerBlock,
  CtaBand,
  Faq,
  GuideHeader,
  H2,
  OnThisPage,
  P,
  RelatedLinks,
  Section,
} from '../ui';

export const UPDATED = 'July 2026';
export const PUBLISHED_ISO = '2026-07-24';
export const MODIFIED_ISO = '2026-07-24';

interface ChecklistPhase {
  id: string;
  when: string;
  summary: string;
  items: string[];
}

/** The checklist itself. Ordered by dependency, not by importance — each phase
 *  contains the things that block something in the next one. */
export const PHASES: ChecklistPhase[] = [
  {
    id: 'twelve-months',
    when: '12–9 months before',
    summary: 'Decisions that constrain everything else, and the bookings that run out first.',
    items: [
      'Agree the maximum total budget, and which family or person covers which categories',
      'Draft both families’ household lists and settle a guest count range',
      'Fix the date or muhurat window with both families',
      'Decide which functions you are hosting, and which are large versus family-only',
      'Shortlist and visit venues; check capacity, in-house catering rules and closing time',
      'Book the venue or venues and pay the deposits',
      'Decide whether you are engaging a planner or a day-of coordinator',
      'Open a shared planning workspace both families can see',
    ],
  },
  {
    id: 'nine-months',
    when: '9–6 months before',
    summary: 'The vendors whose calendars fill next, and the first guest communication.',
    items: [
      'Book the caterer; taste the menu and get inclusions in writing',
      'Book photography and video; confirm which shooter is actually assigned to your dates',
      'Book the decor vendor; ask for an itemised quote rather than a single number',
      'Hold a hotel room block for outstation guests',
      'Send save-the-dates, especially to guests who need to book travel or leave',
      'Book the pandit or officiant and confirm the ritual timings',
      'Start outfit conversations — bridal and groom wear commissioned to measure takes months',
    ],
  },
  {
    id: 'six-months',
    when: '6–4 months before',
    summary: 'Everything with a lead time, plus the website guests will be pointed at.',
    items: [
      'Book music, DJ, dhol and any live performers; confirm whether sound and lighting are included',
      'Book mehendi artists and makeup artists for each function that needs them',
      'Commission outfits and jewellery; schedule the first fittings',
      'Publish your wedding website with the schedule, venues, maps and RSVP form',
      'Book the pre-wedding shoot if you are doing one',
      'Plan choreography for the sangeet, and block rehearsal dates while people are free',
      'Confirm transport requirements — baraat, guest shuttles, airport pickups',
    ],
  },
  {
    id: 'three-months',
    when: '3–2 months before',
    summary: 'Invitations out, replies coming back, and the guest logistics taking shape.',
    items: [
      'Finalise the guest list per function and confirm addresses and phone numbers',
      'Print invitation cards, including the QR code to your wedding website',
      'Send invitations and open RSVP tracking',
      'Order gifting, favours and shagun trays',
      'Confirm the hotel block against actual outstation RSVPs and release what you do not need',
      'Book beauty and grooming appointments for the week of the wedding',
      'Arrange currency, envelopes and cash for on-day vendor tips and shagun',
    ],
  },
  {
    id: 'one-month',
    when: '1 month before',
    summary: 'Turning plans into instructions other people can follow.',
    items: [
      'Chase every household that has not replied',
      'Build the rooming list with real check-in and check-out dates and room capacities',
      'Write a running order for each function: what, when, who is responsible',
      'Confirm setup and access times with the venue for every vendor',
      'Complete outfit fittings, and makeup and hair trials',
      'Confirm balance payment amounts and due dates with every vendor',
      'Circulate an on-day contact list — one point of contact per day, not the couple',
    ],
  },
  {
    id: 'two-weeks',
    when: '2 weeks before',
    summary: 'The numbers get fixed. After this, changes cost money.',
    items: [
      'Send the final headcount per function to the caterer and the venue, in writing',
      'Give the caterer the veg, non-veg, Jain and allergy split',
      'Confirm the transport schedule against actual guest arrival times',
      'Share the rooming list with the hotel front desk in print',
      'Confirm the photography shot list and family group photo list',
      'Pack a wedding-day kit: documents, rings, safety pins, chargers, cash, medication',
      'Reconfirm the pandit, the mandap setup time and the baraat assembly point',
    ],
  },
  {
    id: 'wedding-week',
    when: 'The week of',
    summary: 'Execution. Nobody should be making decisions this week.',
    items: [
      'Clear balance payments so nobody is chasing money on the day',
      'Track guest arrivals and hand over room keys against the rooming list',
      'Brief the family point of contact for each function with the running order',
      'Confirm every vendor arrival time by message the day before',
      'Hand tips and shagun envelopes to one nominated person, labelled',
      'Charge everything, and hand your phone to someone else on the day itself',
    ],
  },
  {
    id: 'after',
    when: 'After the wedding',
    summary: 'The short list that is always forgotten until it is late.',
    items: [
      'Return rented items and settle any venue overtime or damage charges',
      'Collect the shared photo gallery from guests while the wedding is fresh',
      'Send thank-you messages, and record who gave what if your family keeps a shagun register',
      'Chase the photographer for the delivery date agreed in the contract',
      'Update names and documents if either of you is changing them',
    ],
  },
];

export const howToSteps: HowToStep[] = PHASES.map((phase) => ({
  name: phase.when,
  text: `${phase.summary} ${phase.items.slice(0, 3).join('. ')}.`,
}));

export const faqs: FaqItem[] = [
  {
    q: 'When should you start an Indian wedding checklist?',
    a: 'As soon as the date window is agreed, ideally nine to twelve months out. The first phase is mostly decisions rather than bookings, and those decisions are what every later item depends on.',
  },
  {
    q: 'What is the first thing to book?',
    a: 'The venue, once the guest count range and the date are settled. Venues on peak muhurat dates go furthest in advance, and everything else — catering scale, decor, transport, room blocks — is downstream of where and how many.',
  },
  {
    q: 'Can this checklist work for a wedding in four months?',
    a: 'Yes, by compressing the first three phases into the first few weeks and accepting a narrower vendor choice. What you lose with a short runway is the ability to walk away from a quote, which is where the cost increase comes from.',
  },
  {
    q: 'How do we share the checklist across the family?',
    a: 'Give each task an owner and a date somewhere both families can see it. Ticking a box in a shared list is faster than the status update message, and it means nobody does the same thing twice.',
  },
];

export default function GuideChecklist() {
  return (
    <>
      <GuideHeader
        eyebrow="Checklist"
        title="Indian wedding checklist"
        lead="Every task, in the order it has to happen, from twelve months out to the week after. Tick items off as you go, or copy the whole list into a shared workspace."
        author={GUIDE_AUTHOR}
        updated={UPDATED}
      />

      <Section tone="panel" width="prose">
        <AnswerBlock>
          An Indian wedding checklist runs in eight phases: budget, guest count and venue at nine to
          twelve months; caterer, photographer and decor at six to nine; music, outfits and your
          wedding website at four to six; invitations at two to three months; rooming lists and
          running orders at one month; final headcounts at two weeks; payments and arrivals in the
          wedding week; and returns and photos afterwards.
        </AnswerBlock>

        <div className="mt-10">
          <OnThisPage items={PHASES.map((p) => ({ id: p.id, label: p.when }))} />
        </div>

        <P>
          The ordering matters more than the contents. Almost every item here blocks something in a
          later phase — booking a venue before the guest count is settled, or printing invitations
          before the website exists, is what turns a manageable plan into an expensive one.
        </P>

        {PHASES.map((phase) => (
          <div key={phase.id} className="mt-14">
            <H2 id={phase.id}>{phase.when}</H2>
            <p className="mt-3 text-[15px] leading-8 text-ink-low">{phase.summary}</p>
            <ul className="mt-6 space-y-3">
              {phase.items.map((item) => (
                <li key={item}>
                  <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-7 text-ink-mid">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-[#7e6227]"
                      aria-label={item}
                    />
                    <span>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="mt-14 rounded-2xl border border-line bg-[#fbf7ef] px-6 py-6">
          <p className="text-[15px] leading-8 text-ink-mid">
            The boxes above are yours to tick while you read, but they do not survive a page reload
            and only you can see them. If several people are working on this wedding, put the list
            somewhere shared — shaadi.diy has tasks with owners and dates alongside the guest list,
            budget and events, free.
          </p>
          <a
            href="/onboard?src=checklist-inline"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#3a1722] px-6 py-3 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#4a1d2b]"
          >
            Use this as a shared task list
          </a>
        </div>

        <H2 id="faq">Frequently asked</H2>
        <Faq items={faqs} />

        <RelatedLinks
          links={[
            {
              label: 'How to plan an Indian wedding',
              href: '/guides/how-to-plan-an-indian-wedding',
              note: 'The reasoning behind this order.',
            },
            {
              label: 'How much does an Indian wedding cost?',
              href: '/guides/how-much-does-an-indian-wedding-cost',
              note: 'What each of these phases costs.',
            },
            {
              label: 'Wedding budget calculator',
              href: '/tools/wedding-budget-calculator',
              note: 'Phase one, in about a minute.',
            },
            {
              label: 'Guest list manager',
              href: '/wedding-guest-list-manager',
              note: 'The list phase two depends on.',
            },
            {
              label: 'Free wedding website',
              href: '/wedding-website',
              note: 'Publish before the cards go to print.',
            },
            {
              label: 'Send invitations on WhatsApp',
              href: '/guides/how-to-send-wedding-invitations-on-whatsapp',
              note: 'The two-to-three-month phase in detail.',
            },
          ]}
        />
      </Section>

      <CtaBand
        title="A checklist works better when the whole family can see it."
        body="Turn this into shared tasks with owners and dates, next to the guest list, budget and events."
        ctaSource="guide-checklist"
      />
    </>
  );
}
