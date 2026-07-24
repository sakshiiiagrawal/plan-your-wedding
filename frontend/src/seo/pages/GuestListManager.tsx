import { FiDownload, FiFilter, FiHome, FiLayers, FiPrinter, FiUsers } from 'react-icons/fi';
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
    q: 'How do I make a guest list for an Indian wedding?',
    a: 'Start from households rather than individuals — most invitations go to a family, not a person. Split the list by bride side and groom side, mark which events each household is invited to, then record RSVPs and meal preferences against the same record. Headcounts per event fall out of that structure automatically.',
  },
  {
    q: 'Can I import my existing guest list from Excel?',
    a: 'Yes. Upload the spreadsheet your family has been maintaining and map its columns to guest fields. You can export back to a spreadsheet at any point, which is usually what the caterer and the hotel want.',
  },
  {
    q: 'Can different events have different guest lists?',
    a: 'Yes, and that is the default. A guest is invited to specific events, so the mehendi list, the sangeet list and the reception list are separate counts rather than one number you adjust in your head.',
  },
  {
    q: 'How do RSVPs get in?',
    a: 'Guests reply on your public wedding website or over WhatsApp, and the reply lands on the guest record — attendance, headcount and meal preference. Nobody has to transcribe messages into a sheet.',
  },
  {
    q: 'Can my mother edit the guest list without seeing the budget?',
    a: 'Yes. Invitations are section-scoped, so someone can be given the guest list and events without access to vendor payments or the family budget.',
  },
];

export default function GuestListManager() {
  return (
    <>
      <Hero
        eyebrow="Guest list manager"
        title="A wedding guest list manager that tracks every event"
        lead="Group guests by household and by side, invite each household to the events that apply, capture RSVPs over WhatsApp, and export clean counts for the caterer and the hotel."
        ctaSource="guest-list-manager"
        secondary={{
          label: 'Read the guest list guide',
          href: '/guides/how-to-plan-an-indian-wedding',
        }}
      />

      <Section tone="panel" width="prose">
        <AnswerBlock>
          A wedding guest list manager keeps every invitee in one record: which household they
          belong to, which side invited them, which events they are coming to, whether they have
          replied, and what they eat. shaadi.diy does this free, with RSVPs collected over WhatsApp
          and per-event headcounts that update as replies arrive.
        </AnswerBlock>
        <P>
          The reason guest lists sprawl at Indian weddings is that there is never one list. There is
          a mehendi list, a sangeet list, a list for the pheras and a much longer reception list —
          and each one has its own catering count. Managing that in a spreadsheet means five columns
          of TRUE/FALSE and a lot of manual re-counting.
        </P>
      </Section>

      <Section tone="page">
        <Eyebrow>How it is structured</Eyebrow>
        <H2>Households first, then events, then replies</H2>
        <FeatureGrid
          items={[
            {
              icon: FiHome,
              title: 'Households',
              body: 'Invite a family as a unit. One invitation, one RSVP, a headcount that can be more than one person.',
            },
            {
              icon: FiUsers,
              title: 'Bride side and groom side',
              body: 'Every guest carries a side, so both families can see and own their part of the list.',
            },
            {
              icon: FiLayers,
              title: 'Per-event invitations',
              body: 'Mehendi, haldi, sangeet, pheras and reception each get their own list and their own confirmed count.',
            },
            {
              icon: FiFilter,
              title: 'Segments that matter',
              body: 'Filter by side, event, RSVP status, meal preference, travel status or whether the guest needs a room.',
            },
            {
              icon: FiDownload,
              title: 'Excel in and out',
              body: 'Import the list you already have; export a clean file for the caterer, the hotel or the printer.',
            },
            {
              icon: FiPrinter,
              title: 'Print views',
              body: 'Printable guest and rooming lists for the people at the venue who are not going to open an app.',
            },
          ]}
        />
      </Section>

      <Section tone="panel">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <Eyebrow>Guest list fields</Eyebrow>
            <H2>The columns an Indian wedding actually needs</H2>
            <P>
              If you would rather build your own sheet, this is a reasonable starting structure —
              it is the same shape the app uses.
            </P>
          </div>
          <div>
            <DataTable
              head={['Field', 'Why it earns its column']}
              rows={[
                ['Household name', 'Invitations go to families; counts roll up from here'],
                ['Side', 'Bride or groom — lets each family own their list'],
                ['Headcount', 'Adults and children in the household, for catering and seating'],
                ['Events invited', 'Separate list per function, separate count per function'],
                ['RSVP status', 'Invited, confirmed, declined or pending'],
                ['Meal preference', 'Veg, non-veg, Jain and allergies for the caterer'],
                ['Travel and stay', 'Outstation flag, arrival date, whether a room is needed'],
                ['Phone number', 'The WhatsApp number the RSVP will come back from'],
                ['Relationship or group', 'Family, college friends, colleagues — useful for seating'],
              ]}
            />
          </div>
        </div>
      </Section>

      <Section tone="raised">
        <Eyebrow>From list to logistics</Eyebrow>
        <H2>The guest list is where the other numbers come from</H2>
        <CheckList
          className="mt-7 max-w-3xl"
          items={[
            'Confirmed counts per event drive the catering estimate you give each vendor.',
            'Guests marked as needing a room feed straight into hotel and room allocation.',
            'Meal preferences aggregate into the veg / non-veg / Jain split caterers ask for.',
            'Declines and no-replies are visible as a list to follow up on, not a gap in a spreadsheet.',
          ]}
        />
        <P>
          That is the practical argument for keeping the list in one place: the catering count, the
          rooming list and the follow-up list are three views of the same records, and they cannot
          drift apart.
        </P>
      </Section>

      <Section tone="panel" width="prose">
        <Eyebrow>Questions</Eyebrow>
        <H2>Frequently asked</H2>
        <Faq items={faqs} />
        <RelatedLinks
          links={[
            {
              label: 'WhatsApp wedding invitations',
              href: '/whatsapp-wedding-invitation',
              note: 'Send the invite where guests already reply.',
            },
            {
              label: 'Wedding planning app',
              href: '/wedding-planning-app',
              note: 'Everything the guest list connects to.',
            },
            {
              label: 'Free wedding website',
              href: '/wedding-website',
              note: 'An RSVP form that writes into this guest list.',
            },
            {
              label: 'How to send invitations on WhatsApp',
              href: '/guides/how-to-send-wedding-invitations-on-whatsapp',
              note: 'A step-by-step method that keeps replies trackable.',
            },
            {
              label: 'Indian wedding checklist',
              href: '/guides/indian-wedding-checklist',
              note: 'When to lock the guest list, and what depends on it.',
            },
            {
              label: 'Wedding budget calculator',
              href: '/tools/wedding-budget-calculator',
              note: 'Guest count is the single biggest driver of cost.',
            },
          ]}
        />
      </Section>

      <CtaBand
        title="Bring your guest list in and stop re-counting."
        body="Import the spreadsheet you already have, mark who is invited to what, and let the replies update the counts."
        ctaSource="guest-list-manager-footer"
      />
    </>
  );
}
