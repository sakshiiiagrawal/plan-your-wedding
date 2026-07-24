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
  NumberedSteps,
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
    name: 'Collect phone numbers with the guest list',
    text: 'Every household needs the WhatsApp number it actually uses. Replies are matched to guests by number, so a missing or wrong number means a reply nobody can attribute.',
  },
  {
    name: 'Publish the wedding website first',
    text: 'The message should be short and carry a link. Put the schedule, venues, maps, dress code and the RSVP form on a wedding website, and send the link rather than five paragraphs.',
  },
  {
    name: 'Decide how you are sending',
    text: 'For a small list, sending by hand from a personal number is fine. Past roughly a hundred households, use a WhatsApp Business number so sends are trackable and replies land in one place.',
  },
  {
    name: 'Get the invitation template approved',
    text: 'A first message to someone who has not written to you must use a template WhatsApp has reviewed. Submit the wording with placeholders for the household name, dates and link, and allow days rather than hours for approval.',
  },
  {
    name: 'Send in segments',
    text: 'Send per function and per side rather than to everyone at once. A wording mistake then costs you one group, and each group gets a message that is actually about their invitation.',
  },
  {
    name: 'Route replies into the guest list',
    text: 'Whether the guest replies in chat or taps through to the RSVP form, the answer should update the guest record — attending or not, how many people, meal preference.',
  },
  {
    name: 'Follow up on the silence',
    text: 'Two weeks before your caterer deadline, filter for households that have not replied and send one short reminder. That list should be a filter, not something a family member reconstructs by scrolling.',
  },
];

export const faqs: FaqItem[] = [
  {
    q: 'Can I send wedding invitations on WhatsApp?',
    a: 'Yes, and it is where most Indian wedding RSVPs actually come from. Sending to guests who have never messaged you requires a pre-approved message template sent from a WhatsApp Business number; after a guest replies you can message them freely for 24 hours.',
  },
  {
    q: 'Why was my WhatsApp invitation not delivered?',
    a: 'The three common causes are: the number is not on WhatsApp, the message was a free-form message sent outside the 24-hour window and needed an approved template instead, or the sending account is still in development mode and only delivers to numbers on an allow list.',
  },
  {
    q: 'What is the 24-hour window?',
    a: 'Once a guest sends you a message, you have 24 hours to reply with anything, including interactive buttons and polls. Outside that window only approved templates are delivered. Plan RSVP chasing around it — follow-ups are easy with anyone who has already replied once.',
  },
  {
    q: 'Should I send a card image or a link?',
    a: 'Both, usually. The card image is what people forward to relatives; the link is what carries the schedule, the map and the RSVP form. A message with only an image gets you admiration and no headcount.',
  },
  {
    q: 'Is it rude to invite people by WhatsApp?',
    a: 'For most guests, no — it is the channel they already use and reply on. For elders and close family, a printed card delivered in person still matters, and the two are not in conflict: print the card, put a QR code on it, and send the same link over WhatsApp.',
  },
  {
    q: 'How do I track who has replied?',
    a: 'Against the guest list, not in the chat. Replies should update RSVP status, headcount and meal preference on the guest record, so the outstanding list is a filter you apply rather than a message thread you scroll.',
  },
];

const SECTIONS = [
  { id: 'rules', label: 'Two rules that decide everything' },
  { id: 'steps', label: 'The seven steps' },
  { id: 'wording', label: 'Wording you can copy' },
  { id: 'tracking', label: 'Turning replies into a headcount' },
  { id: 'mistakes', label: 'What goes wrong' },
  { id: 'faq', label: 'Frequently asked' },
];

/** Sample message wordings. Deliberately short — the details belong on the
 *  website; the message only has to get the guest there and get an answer. */
const SAMPLES: { title: string; body: string }[] = [
  {
    title: 'Save the date',
    body: `Namaste {{household}},

Aarav and Diya are getting married on 26 November 2026 in Jaipur, and we would love to have your family with us.

Full details and travel information: {{link}}

Formal invitation to follow. Please keep the dates free.`,
  },
  {
    title: 'Main invitation',
    body: `Dear {{household}},

With the blessings of our families, we invite you to the wedding of Aarav and Diya.

Mehendi — 24 Nov, 4pm
Sangeet — 25 Nov, 7pm
Wedding — 26 Nov, 8pm

Venue, maps, dress code and RSVP: {{link}}

Please let us know how many of you can join us by 5 November so we can plan seating and meals.`,
  },
  {
    title: 'Single-function invitation',
    body: `Dear {{household}},

We would love to have you at the reception for Aarav and Diya on 27 November, 7pm, at The Grand, Jaipur.

Details and RSVP: {{link}}

Please confirm your numbers by 5 November.`,
  },
  {
    title: 'RSVP reminder',
    body: `Hello {{household}},

A gentle reminder — we are confirming numbers with the caterer this week. Could you let us know how many of you will be joining us?

You can reply here or use the form: {{link}}

Thank you.`,
  },
];

export default function GuideWhatsappInvitations() {
  return (
    <>
      <GuideHeader
        eyebrow="Invitations"
        title="How to send wedding invitations on WhatsApp"
        lead="The two WhatsApp rules that catch every wedding out, wording you can copy, and how to make replies turn into a headcount instead of a chat thread someone has to read."
        author={GUIDE_AUTHOR}
        updated={UPDATED}
      />

      <Section tone="panel" width="prose">
        <AnswerBlock>
          To send wedding invitations on WhatsApp: collect each household&rsquo;s number, publish a
          wedding website with the schedule and an RSVP form, get an invitation template approved for
          the first message, send in segments per function, and route the replies into your guest
          list. The message should be short and carry a link — the details belong on the website.
        </AnswerBlock>

        <div className="mt-10">
          <OnThisPage items={SECTIONS} />
        </div>

        <H2 id="rules">Two rules that decide everything</H2>
        <P>
          WhatsApp is not email, and the differences are not cosmetic. Two platform rules shape how a
          wedding send has to be planned, and most people meet them for the first time on the day
          they were hoping to send.
        </P>
        <H3>A first message must use an approved template</H3>
        <P>
          You cannot write a free-form message to someone who has never messaged you. The first
          message has to use a template that WhatsApp has reviewed and approved, with placeholders
          for the parts that change — the household name, the dates, the link. Approval is not
          instant, and a rejected template has to be resubmitted. Write and submit your invitation
          wording well before your intended send date, not the night before.
        </P>
        <H3>Free-form replies only work for 24 hours</H3>
        <P>
          Once a guest messages you, a 24-hour window opens in which you can send anything, including
          interactive messages with tappable buttons and polls. After it closes, only approved
          templates go through. In practice this means quick follow-ups are easy with anyone who has
          already replied once, and cold nudges need a template of their own.
        </P>
        <SourceNote>
          Both rules are WhatsApp&rsquo;s, and they apply whichever tool you send through. If you are
          sending by hand from a personal number to a few dozen households, neither will trouble you
          — they matter once you are sending programmatically at wedding scale. Sending bulk
          invitations from a personal number is also the fastest way to get that number restricted,
          which is a bad week to lose your phone.
        </SourceNote>

        <H2 id="steps">The seven steps</H2>
        <NumberedSteps steps={howToSteps} />

        <H2 id="wording">Wording you can copy</H2>
        <P>
          Keep it short. Every extra paragraph is one more thing between the guest and the answer you
          need. Replace <code className="rounded bg-[#f4ecdf] px-1.5 py-0.5 text-[13px]">
            {'{{household}}'}
          </code>{' '}
          and <code className="rounded bg-[#f4ecdf] px-1.5 py-0.5 text-[13px]">{'{{link}}'}</code>{' '}
          with your own — these are the placeholders an approved template would carry.
        </P>
        <div className="mt-8 space-y-6">
          {SAMPLES.map((sample) => (
            <div key={sample.title} className="rounded-2xl border border-line bg-[#fbf7ef] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-700">
                {sample.title}
              </p>
              <pre className="mt-4 whitespace-pre-wrap font-sans text-[15px] leading-8 text-ink-mid">
                {sample.body}
              </pre>
            </div>
          ))}
        </div>
        <P>
          Four things earn their place in every one of these: who is being invited, which functions
          and when, a link to everything else, and a date by which you need an answer. The caterer
          needs a number, so the guest needs a deadline.
        </P>

        <H2 id="tracking">Turning replies into a headcount</H2>
        <P>
          This is the part that decides whether the whole exercise saved you time. Three hundred
          households replying in free text is three hundred small acts of transcription unless the
          replies land somewhere structured.
        </P>
        <CheckList
          className="mt-6"
          items={[
            'Give guests one obvious way to answer: a link to an RSVP form that records attendance, headcount and meal preference against their record.',
            'Accept chat replies too, but record them on the guest rather than leaving them in the thread.',
            'Keep per-function counts separate — a household coming to the reception but not the sangeet is two different numbers.',
            'Track meal preference at the same time. The caterer will ask for the veg, non-veg and Jain split, and asking twice annoys people.',
            'Make “has not replied” a filter, not a memory. That list is what your reminder goes to.',
          ]}
        />
        <P>
          A{' '}
          <a className="text-gold-700 underline" href="/wedding-guest-list-manager">
            guest list that receives the replies
          </a>{' '}
          rather than sitting beside them is the difference between an RSVP process that takes an
          evening and one that takes a month of someone&rsquo;s attention.
        </P>

        <H2 id="mistakes">What goes wrong</H2>
        <DataTable
          head={['Symptom', 'Usual cause', 'Fix']}
          rows={[
            [
              'Messages show as sent but nobody replies',
              'Sent to everyone at once with no personalisation — it reads as a broadcast',
              'Segment by function and side, and address the household by name',
            ],
            [
              'Delivery fails for most numbers',
              'Free-form message sent outside the 24-hour window, or an account still limited to an allow list',
              'Use an approved template for cold sends; check the sending account is out of development mode',
            ],
            [
              'Replies arrive but the count is unclear',
              '“We will come” without a number',
              'Ask explicitly for how many people, and give a form as the easy path',
            ],
            [
              'Guests ask questions already answered',
              'Details in the message rather than on a page they can return to',
              'Move the schedule, maps and dress code to the wedding website and link it',
            ],
            [
              'Nobody knows who is still outstanding',
              'Replies live in chat threads across several family phones',
              'Record every reply on the guest record and filter for pending',
            ],
          ]}
        />

        <H2 id="faq">Frequently asked</H2>
        <Faq items={faqs} />

        <RelatedLinks
          links={[
            {
              label: 'WhatsApp wedding invitations',
              href: '/whatsapp-wedding-invitation',
              note: 'The feature that does this end to end.',
            },
            {
              label: 'Free wedding website',
              href: '/wedding-website',
              note: 'The link your message points at.',
            },
            {
              label: 'Guest list manager',
              href: '/wedding-guest-list-manager',
              note: 'Where replies become a headcount.',
            },
            {
              label: 'Indian wedding checklist',
              href: '/guides/indian-wedding-checklist',
              note: 'When invitations should go out.',
            },
            {
              label: 'How to plan an Indian wedding',
              href: '/guides/how-to-plan-an-indian-wedding',
              note: 'Everything around the invitation.',
            },
            {
              label: 'Wedding hashtag generator',
              href: '/tools/wedding-hashtag-generator',
              note: 'For the last line of the message.',
            },
          ]}
        />
      </Section>

      <CtaBand
        title="Send the invitation. Let the replies do the counting."
        body="Build the guest list, publish the website, and collect RSVPs where your guests already answer — free."
        ctaSource="guide-whatsapp-invitations"
      />
    </>
  );
}
