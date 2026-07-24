import { FaWhatsapp } from 'react-icons/fa';
import { FiBarChart2, FiMessageSquare, FiSend, FiUsers } from 'react-icons/fi';
import type { FaqItem, HowToStep } from '../schema';
import {
  AnswerBlock,
  CheckList,
  CtaBand,
  Eyebrow,
  Faq,
  FeatureGrid,
  H2,
  Hero,
  NumberedSteps,
  P,
  RelatedLinks,
  Section,
  SourceNote,
} from '../ui';

export const howToSteps: HowToStep[] = [
  {
    name: 'Build the guest list with phone numbers',
    text: 'Import your guest list or add households directly, and make sure each one carries the WhatsApp number the family actually uses. That number is what replies get matched against.',
  },
  {
    name: 'Publish your wedding website',
    text: 'Pick a template, add your events, and publish. The invitation message will carry this link, and the RSVP form on it writes back into the same guest list.',
  },
  {
    name: 'Connect a WhatsApp Business number',
    text: 'Connect a WhatsApp Business number so invitations send from your wedding rather than from a personal chat, and replies land in one inbox instead of scattered across family phones.',
  },
  {
    name: 'Get your invitation template approved',
    text: 'A first message to someone who has not written to you must use a template WhatsApp has approved. Submit the invitation wording once, with placeholders for the guest name, date and website link, and wait for approval before the send date.',
  },
  {
    name: 'Send to a segment, not to everyone',
    text: 'Send per event or per side — the mehendi list is not the reception list. Sending in segments also means a wording mistake costs you one group, not the whole guest list.',
  },
  {
    name: 'Let replies update the guest list',
    text: 'Replies and RSVP form submissions land on the guest record: attending or not, how many people, meal preference. The per-event headcount updates without anyone transcribing messages.',
  },
];

export const faqs: FaqItem[] = [
  {
    q: 'Can I send wedding invitations on WhatsApp?',
    a: 'Yes, and in India it is where most replies actually come from. To send to guests who have not messaged you first, WhatsApp requires a pre-approved message template sent from a WhatsApp Business number. Once a guest replies, you can exchange free-form messages with them for 24 hours.',
  },
  {
    q: 'Why does WhatsApp need my message approved in advance?',
    a: 'It is how WhatsApp controls unsolicited business messaging. A first, cold message must use a template that WhatsApp has reviewed. Submit your invitation wording once, well before your send date — approval is not instant.',
  },
  {
    q: 'What is the 24-hour window?',
    a: 'After a guest sends you a message, you have 24 hours to reply freely, including with interactive messages such as buttons and polls. Outside that window only approved templates go through. Plan RSVP chasing around it: the follow-up is easy for anyone who has already replied once.',
  },
  {
    q: 'Do guests need to install anything?',
    a: 'No. They get a normal WhatsApp message with your wedding website link, and they RSVP either by replying or by tapping through to the form.',
  },
  {
    q: 'Can I send a digital invitation card image?',
    a: 'Yes. An image invitation with a link to your wedding website is a common format — the card is what people forward to relatives, and the link is what carries the venue details, map and RSVP form.',
  },
  {
    q: 'What happens to the replies?',
    a: 'They are recorded against the guest, so RSVP status, headcount and meal preference update in the guest list. Catering counts and rooming lists follow from there.',
  },
];

export default function WhatsappInvitation() {
  return (
    <>
      <Hero
        eyebrow="WhatsApp wedding invitations"
        title="Send wedding invitations on WhatsApp and capture the replies"
        lead="Invite guests on the app they already answer, then let their replies update the guest list, the per-event headcount and the meal split — instead of a family member reading 300 chats and typing them into a sheet."
        ctaSource="whatsapp-invitation"
        secondary={{
          label: 'Read the step-by-step guide',
          href: '/guides/how-to-send-wedding-invitations-on-whatsapp',
        }}
      />

      <Section tone="panel" width="prose">
        <AnswerBlock>
          To send wedding invitations on WhatsApp, you need a WhatsApp Business number, an approved
          message template for the first message, and somewhere for the replies to land. shaadi.diy
          provides the last part free: invitations go out per event, and every reply updates the
          guest record it came from.
        </AnswerBlock>
        <P>
          Printed cards still get delivered. Email invitations mostly do not get opened. The reply,
          almost always, arrives on WhatsApp — which is why the useful question is not how to send
          the invitation but where the answer goes once it comes back.
        </P>
      </Section>

      <Section tone="page">
        <Eyebrow>How it works</Eyebrow>
        <H2>From invitation to a confirmed headcount</H2>
        <NumberedSteps steps={howToSteps} />
        <SourceNote>
          The template-approval and 24-hour-window rules above are WhatsApp&rsquo;s, not ours. They
          are the two things that most often derail a wedding send, so plan around them: submit your
          template early, and expect interactive follow-ups to work only with guests who have
          already written back.
        </SourceNote>
      </Section>

      <Section tone="panel">
        <Eyebrow>What you get</Eyebrow>
        <H2>Messaging that is wired into the guest list</H2>
        <FeatureGrid
          items={[
            {
              icon: FaWhatsapp,
              title: 'Send from your wedding',
              body: 'Invitations go out from a connected WhatsApp Business number rather than a personal chat thread.',
            },
            {
              icon: FiUsers,
              title: 'Segment before you send',
              body: 'Choose recipients by event, by side, by RSVP status or by whether they still owe you an answer.',
            },
            {
              icon: FiMessageSquare,
              title: 'One inbox',
              body: 'Conversations sit next to the guest they belong to, so replies are not spread over three family phones.',
            },
            {
              icon: FiBarChart2,
              title: 'Polls for quick answers',
              body: 'Ask a question with tappable options — useful for meal preference and travel, within the 24-hour window.',
            },
            {
              icon: FiSend,
              title: 'Delivery status you can see',
              body: 'Sent, delivered, read and failed are recorded per message, with the actual reason when a send fails.',
            },
            {
              icon: FiUsers,
              title: 'Replies become records',
              body: 'Attendance, headcount and meal preference update on the guest, so counts stay current.',
            },
          ]}
        />
      </Section>

      <Section tone="raised">
        <Eyebrow>Wording</Eyebrow>
        <H2>What a WhatsApp invitation should contain</H2>
        <CheckList
          className="mt-7 max-w-3xl"
          items={[
            'The guest household by name — a message addressed to nobody reads like a broadcast, because it is one.',
            'Which functions this household is invited to, with dates. Not everyone is invited to everything, and guessing is awkward for them.',
            'Venue with a map link. The single most common follow-up question you can avoid.',
            'A link to your wedding website, where the full schedule, dress code, travel and stay details live.',
            'A clear ask: reply with how many people are coming, or tap through to the RSVP form.',
            'A date by which you need the answer, because the caterer needs one too.',
          ]}
        />
        <P>
          Keep it short. The details belong on the website; the message only has to get the guest
          there and get an answer back.
        </P>
      </Section>

      <Section tone="panel" width="prose">
        <Eyebrow>Questions</Eyebrow>
        <H2>Frequently asked</H2>
        <Faq items={faqs} />
        <RelatedLinks
          links={[
            {
              label: 'How to send invitations on WhatsApp',
              href: '/guides/how-to-send-wedding-invitations-on-whatsapp',
              note: 'The longer walkthrough, including template wording.',
            },
            {
              label: 'Guest list manager',
              href: '/wedding-guest-list-manager',
              note: 'Where every reply ends up.',
            },
            {
              label: 'Free wedding website',
              href: '/wedding-website',
              note: 'The link your invitation points at.',
            },
            {
              label: 'Wedding planning app',
              href: '/wedding-planning-app',
              note: 'How RSVPs connect to catering, rooms and budget.',
            },
            {
              label: 'Indian wedding checklist',
              href: '/guides/indian-wedding-checklist',
              note: 'When invitations should go out.',
            },
            {
              label: 'Wedding hashtag generator',
              href: '/tools/wedding-hashtag-generator',
              note: 'Something to put at the bottom of the message.',
            },
          ]}
        />
      </Section>

      <CtaBand
        title="Send the invitation. Let the replies do the counting."
        body="Build the guest list, publish the website, and collect RSVPs where your guests already answer."
        ctaSource="whatsapp-invitation-footer"
      />
    </>
  );
}
