import { FiCalendar, FiEdit3, FiGlobe, FiImage, FiSmartphone, FiUsers } from 'react-icons/fi';
import { TEMPLATE_META_LIST } from '../../site/templateMeta';
import type { FaqItem } from '../schema';
import {
  AnswerBlock,
  CheckList,
  CtaBand,
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
    q: 'Is the wedding website really free?',
    a: 'Yes. All ten templates, the RSVP form, the event schedule, the photo gallery and the QR code are free, and there is no card required to publish. The rest of the planning workspace — guest list, budget, vendors, accommodation — is free too.',
  },
  {
    q: 'What web address do I get?',
    a: 'Your wedding gets its own address on shaadi.diy, chosen when you set it up — something like yournames.shaadi.diy. It is short enough to print on a card and to say out loud.',
  },
  {
    q: 'Do RSVPs from the website reach my guest list?',
    a: 'Yes. The RSVP form writes into the same guest list you plan with, so attendance, headcount and meal preference update on the guest record rather than arriving as emails you have to transcribe.',
  },
  {
    q: 'Can I put a QR code on my printed invitation card?',
    a: 'Yes. Every published site generates a QR code you can download and hand to your card printer. Guests scan it and land on the schedule, directions and RSVP form.',
  },
  {
    q: 'Can I change the template after publishing?',
    a: 'Yes. Templates and colour palettes are independent, so you can switch the design or recolour it without re-entering your events, story or photos.',
  },
  {
    q: 'Will it work on my guests’ phones?',
    a: 'That is the primary case. Nearly every guest opens the link from WhatsApp on a phone, so the templates are built mobile-first and the invite designs are single-screen by default.',
  },
];

export default function WeddingWebsite() {
  const websites = TEMPLATE_META_LIST.filter((t) => t.kind === 'website');
  const invites = TEMPLATE_META_LIST.filter((t) => t.kind === 'invite');

  return (
    <>
      <Hero
        eyebrow="Free wedding website"
        title="A free wedding website your guests can RSVP on"
        lead="Ten templates, your own address, an event schedule, a photo gallery and a QR code for the printed card — with every RSVP landing directly in your guest list."
        ctaSource="wedding-website"
        secondary={{
          label: 'How to make one',
          href: '/guides/how-to-send-wedding-invitations-on-whatsapp',
        }}
      />

      <Section tone="panel" width="prose">
        <AnswerBlock>
          shaadi.diy gives you a free wedding website with ten templates, your own
          <code className="mx-1 rounded bg-[#f4ecdf] px-1.5 py-0.5 text-[13px]">
            yournames.shaadi.diy
          </code>
          address, an RSVP form wired into your guest list, event details with maps, a shared photo
          gallery, and a QR code for your printed invitation. No card, no trial, no watermark.
        </AnswerBlock>
        <P>
          The point of a wedding website is not to look impressive. It is to stop your family
          answering the same four questions three hundred times: when, where, what do I wear, and
          are you counting me in.
        </P>
      </Section>

      <Section tone="page">
        <Eyebrow>Templates</Eyebrow>
        <H2>Ten designs, and any palette works with any of them</H2>
        <P>
          Six are full wedding <strong>websites</strong> — several scrolling sections for your
          story, events, gallery and RSVP. Four are single-flow <strong>digital invitations</strong>{' '}
          built to be opened once from WhatsApp and answered on the spot.
        </P>
        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-700">
              Wedding websites
            </h3>
            <ul className="mt-5 space-y-4">
              {websites.map((t) => (
                <li key={t.id} className="rounded-2xl border border-line bg-surface-panel p-5">
                  <p className="font-serif-display text-xl font-semibold text-ink-high">{t.name}</p>
                  <p className="mt-1.5 text-sm leading-7 text-ink-low">{t.tagline}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-700">
              Digital invitations
            </h3>
            <ul className="mt-5 space-y-4">
              {invites.map((t) => (
                <li key={t.id} className="rounded-2xl border border-line bg-surface-panel p-5">
                  <p className="font-serif-display text-xl font-semibold text-ink-high">{t.name}</p>
                  <p className="mt-1.5 text-sm leading-7 text-ink-low">{t.tagline}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="panel">
        <Eyebrow>What is on the site</Eyebrow>
        <H2>The things guests actually open it for</H2>
        <FeatureGrid
          items={[
            {
              icon: FiUsers,
              title: 'RSVP form',
              body: 'Attendance, headcount and meal preference, recorded against the guest in your list.',
            },
            {
              icon: FiCalendar,
              title: 'Event schedule',
              body: 'Each function with its date, time, venue, map link and dress code.',
            },
            {
              icon: FiImage,
              title: 'Photo gallery',
              body: 'Your pre-wedding photos, and a shared album guests can add to afterwards.',
            },
            {
              icon: FiSmartphone,
              title: 'QR code',
              body: 'Downloadable for the printed card, so paper and digital point at the same place.',
            },
            {
              icon: FiEdit3,
              title: 'Palettes and effects',
              body: 'Recolour any template without redoing content, and tune the animation to taste.',
            },
            {
              icon: FiGlobe,
              title: 'Your own address',
              body: 'A short subdomain you pick, easy to print and easy to read out over the phone.',
            },
          ]}
        />
      </Section>

      <Section tone="raised">
        <Eyebrow>Making one</Eyebrow>
        <H2>Four steps, roughly twenty minutes</H2>
        <CheckList
          className="mt-7 max-w-3xl"
          items={[
            'Create your wedding and pick the address guests will type or scan.',
            'Add your events — mehendi, haldi, sangeet, the wedding, the reception — with venues and times.',
            'Choose a template and a palette, write a short story section, and upload photos.',
            'Publish, then share the link over WhatsApp and put the QR code on the printed card.',
          ]}
        />
        <P>
          Everything after that is editable. The site is a view of your planning data, so correcting
          a venue or a start time in one place updates what guests see.
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
              note: 'How to share the link and collect replies.',
            },
            {
              label: 'Guest list manager',
              href: '/wedding-guest-list-manager',
              note: 'Where the RSVP form writes to.',
            },
            {
              label: 'Wedding planning app',
              href: '/wedding-planning-app',
              note: 'The website is one part of a bigger workspace.',
            },
            {
              label: 'Indian wedding checklist',
              href: '/guides/indian-wedding-checklist',
              note: 'When to publish, and when to send.',
            },
            {
              label: 'Wedding hashtag generator',
              href: '/tools/wedding-hashtag-generator',
              note: 'A hashtag for the gallery page and the signage.',
            },
            {
              label: 'How to plan an Indian wedding',
              href: '/guides/how-to-plan-an-indian-wedding',
              note: 'The full sequence, start to finish.',
            },
          ]}
        />
      </Section>

      <CtaBand
        title="Publish your wedding website tonight."
        body="Pick a template, add your events, and share a link that answers the questions before anyone asks them."
        ctaSource="wedding-website-footer"
      />
    </>
  );
}
