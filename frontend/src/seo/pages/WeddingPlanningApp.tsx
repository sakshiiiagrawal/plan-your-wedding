import {
  FiCalendar,
  FiCheckSquare,
  FiCreditCard,
  FiGlobe,
  FiHome,
  FiImage,
  FiPieChart,
  FiUsers,
} from 'react-icons/fi';
import type { FaqItem } from '../schema';
import {
  AnswerBlock,
  CheckList,
  CtaBand,
  DataTable,
  Eyebrow,
  Faq,
  FeatureGrid,
  H2,
  Hero,
  P,
  RelatedLinks,
  Section,
} from '../ui';

export const faqs: FaqItem[] = [
  {
    q: 'Is shaadi.diy really free?',
    a: 'Yes. Guest lists, WhatsApp RSVPs, budgets, vendor payments, accommodation, events, tasks and the public wedding website are all free to use, with no card required to sign up. The project is open source, so you can also read the code or self-host it.',
  },
  {
    q: 'Is it built for Indian weddings specifically?',
    a: 'It is. Guests are tracked per event rather than per wedding, so mehendi, haldi, sangeet, the pheras and the reception each carry their own list and headcount. Money is in rupees, guests are grouped by bride side and groom side and by household, and RSVPs come back over WhatsApp.',
  },
  {
    q: 'Can my parents and my planner use the same account?',
    a: 'Yes. You invite them by email and choose which sections they can see. A parent handling the guest list does not need access to vendor payments, and a planner can be given events and vendors without the family budget.',
  },
  {
    q: 'Can I import a guest list I already have in Excel?',
    a: 'Yes. Guest lists import from a spreadsheet and export back out, so you can start from the list your family has already been maintaining and hand a clean file to the caterer or hotel later.',
  },
  {
    q: 'Do I need a planning app if I already use a spreadsheet?',
    a: 'A spreadsheet is fine until several people edit it at once. The moment headcount, room allocation and vendor payments have to agree with each other, linked records save more time than formulas do — a guest marked confirmed in one place updates the catering count and the rooming list too.',
  },
];

export default function WeddingPlanningApp() {
  return (
    <>
      <Hero
        eyebrow="Wedding planning app"
        title="A wedding planning app built for Indian weddings"
        lead="Guest lists per event, WhatsApp RSVPs, rupee budgets, vendor payments, hotel rooms and a public wedding website — in one shared workspace your family and planner can use with you."
        ctaSource="wedding-planning-app"
        secondary={{ label: 'Try the budget calculator', href: '/tools/wedding-budget-calculator' }}
      />

      <Section tone="panel" width="prose">
        <AnswerBlock>
          shaadi.diy is a free wedding planning app for Indian weddings. It keeps the guest list,
          event schedule, budget, vendor payments, guest accommodation and your wedding website in
          one account, collects RSVPs over WhatsApp, and lets you invite parents, siblings or a
          planner with access to only the sections they need.
        </AnswerBlock>
        <P>
          Most Indian weddings are not one event. They are four or five, each with a different guest
          list, a different venue and a different set of vendors — and the numbers move right up to
          the last week. A planning app earns its place only if changing one of those numbers
          updates everywhere else it appears.
        </P>
      </Section>

      <Section tone="page">
        <Eyebrow>What the app covers</Eyebrow>
        <H2>Every planning record in one account</H2>
        <FeatureGrid
          items={[
            {
              icon: FiUsers,
              title: 'Guests and RSVPs',
              body: 'Bride side and groom side, households, per-event invitations, meal preferences, and RSVP replies captured over WhatsApp.',
            },
            {
              icon: FiPieChart,
              title: 'Budget',
              body: 'Category budgets in rupees with what is allocated, what is paid and what is still outstanding kept apart.',
            },
            {
              icon: FiCreditCard,
              title: 'Vendors and payments',
              body: 'Advances, balance payments and due dates per vendor, so nothing turns into a surprise the week of the wedding.',
            },
            {
              icon: FiHome,
              title: 'Accommodation',
              body: 'Hotels, room capacity, check-in and check-out dates, and capacity-aware allocation for outstation guests.',
            },
            {
              icon: FiCalendar,
              title: 'Events and timeline',
              body: 'Mehendi, haldi, sangeet, pheras and reception as separate events with their own dates, venues and guest lists.',
            },
            {
              icon: FiCheckSquare,
              title: 'Tasks',
              body: 'A shared to-do list with owners and dates, so the work split between family members stays visible.',
            },
            {
              icon: FiGlobe,
              title: 'Wedding website',
              body: 'Ten templates with palettes, an RSVP form, event details, a gallery and a QR code for printed cards.',
            },
            {
              icon: FiImage,
              title: 'Guest gallery',
              body: 'A shared album guests can add to, so the photos from every function land in one place.',
            },
          ]}
        />
      </Section>

      <Section tone="panel">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <Eyebrow>Why records beat chat threads</Eyebrow>
            <H2>The numbers only help if they agree with each other</H2>
          </div>
          <div>
            <P>
              A guest who confirms for the sangeet but not the reception changes two headcounts, one
              catering order and possibly a room booking. In a family WhatsApp group that change
              lives in someone&rsquo;s memory. Here it lives in the guest record, and the counts
              follow.
            </P>
            <CheckList
              className="mt-7"
              items={[
                'Guest counts per event feed the catering estimate and the rooming list, not a separate tab.',
                'Vendor payments roll up into the category budget, so paid, pending and remaining stay consistent.',
                'Room allocation is capacity-aware — a room cannot be double-booked or overfilled by accident.',
                'Exports and print views are built in, for the caterer, the hotel front desk and the family coordinator.',
              ]}
            />
          </div>
        </div>
      </Section>

      <Section tone="raised">
        <Eyebrow>Who uses it</Eyebrow>
        <H2>Built for the people actually doing the work</H2>
        <DataTable
          head={['Who', 'What they usually own', 'What helps most']}
          rows={[
            [
              'The couple',
              'Overall plan, website, vendor shortlists',
              'One place to see status without chasing anyone',
            ],
            [
              'Parents',
              'Guest list, invitations, family logistics',
              'Guest list with sides and households, printable lists',
            ],
            [
              'Siblings and cousins',
              'Sangeet, gifts, guest coordination',
              'Shared tasks and per-event guest lists',
            ],
            [
              'A planner or coordinator',
              'Vendors, timeline, on-day running order',
              'Section-scoped access, vendor payment schedule, exports',
            ],
            [
              'Outstation-heavy weddings',
              'Hotel blocks and travel',
              'Room allocation with check-in and check-out dates',
            ],
          ]}
        />
        <P>
          You invite each of them with access to only the sections they need. Access is a choice,
          not an all-or-nothing switch — which matters when the budget is one of the records.
        </P>
      </Section>

      <Section tone="panel" width="prose">
        <Eyebrow>Questions</Eyebrow>
        <H2>Frequently asked</H2>
        <Faq items={faqs} />
        <RelatedLinks
          links={[
            {
              label: 'Guest list manager',
              href: '/wedding-guest-list-manager',
              note: 'Sides, households, per-event lists and Excel import.',
            },
            {
              label: 'Wedding budget planner',
              href: '/wedding-budget-planner',
              note: 'Category budgets with paid, pending and outstanding kept apart.',
            },
            {
              label: 'Free wedding website',
              href: '/wedding-website',
              note: 'Ten templates, RSVP form, gallery and a QR code.',
            },
            {
              label: 'How to plan an Indian wedding',
              href: '/guides/how-to-plan-an-indian-wedding',
              note: 'The full sequence, from the date to the day after.',
            },
            {
              label: 'Indian wedding checklist',
              href: '/guides/indian-wedding-checklist',
              note: 'What to do at twelve months, six months and the final week.',
            },
            {
              label: 'Wedding budget calculator',
              href: '/tools/wedding-budget-calculator',
              note: 'Split a rupee budget across categories in a few seconds.',
            },
          ]}
        />
      </Section>

      <CtaBand
        title="Start with the guest list. The rest follows."
        body="Create a wedding, add your events and guests, then invite your parents or planner when they need access."
        ctaSource="wedding-planning-app-footer"
      />
    </>
  );
}
