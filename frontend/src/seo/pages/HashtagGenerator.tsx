import type { FaqItem } from '../schema';
import { EXAMPLE, buildHashtags } from '../tools/hashtags';
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
} from '../ui';
import { signupUrl } from '../site';

export const faqs: FaqItem[] = [
  {
    q: 'What makes a good wedding hashtag?',
    a: 'Short, easy to spell after hearing it once, and unique enough that searching it does not return strangers. Check it on Instagram before you print it — if thousands of unrelated posts already use it, pick another.',
  },
  {
    q: 'Where do people actually use the hashtag?',
    a: 'On signage at the sangeet and reception, on the wedding website, at the bottom of the WhatsApp invitation, and on photo-booth props. The point is that guests tag their own photos with it, so you can find them all afterwards.',
  },
  {
    q: 'Should the hashtag be in Hindi or English?',
    a: 'Hinglish reads best for most Indian weddings — a Hindi word in Roman script, like KiShaadi or KiBaraat, next to your names. Keep it to one word with no spaces, because that is what a hashtag has to be.',
  },
  {
    q: 'How long before the wedding should we pick one?',
    a: 'Before the invitations go to print, since that is usually the first place it appears. Picking it early also means the pre-wedding shoot and the save-the-date can carry it.',
  },
  {
    q: 'Do we need a hashtag at all?',
    a: 'No. A shared gallery guests can upload to does the same job more reliably, because nothing depends on people remembering to type it. A hashtag is a nice supplement to that, not a substitute.',
  },
];

export default function HashtagGenerator() {
  const groups = buildHashtags(EXAMPLE);

  return (
    <>
      <Section tone="page">
        <h1 className="font-serif-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-[#201a17] sm:text-5xl">
          Wedding hashtag generator
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5f554d]">
          Put in both names. Get blends, classics and Hinglish options you can tap to copy. No
          sign-up, no email.
        </p>

        <div
          data-island="hashtags"
          className="mt-10 rounded-3xl border border-line bg-surface-panel p-6 shadow-[0_28px_70px_-52px_rgba(64,48,32,0.5)] sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="label">First name</span>
              <input
                id="hg-a"
                className="input mt-1.5 w-full"
                type="text"
                autoComplete="off"
                defaultValue={EXAMPLE.a}
              />
            </label>
            <label className="block">
              <span className="label">Second name</span>
              <input
                id="hg-b"
                className="input mt-1.5 w-full"
                type="text"
                autoComplete="off"
                defaultValue={EXAMPLE.b}
              />
            </label>
            <label className="block">
              <span className="label">Surname (optional)</span>
              <input
                id="hg-surname"
                className="input mt-1.5 w-full"
                type="text"
                autoComplete="off"
                defaultValue={EXAMPLE.surname}
              />
            </label>
            <label className="block">
              <span className="label">Year (optional)</span>
              <input
                id="hg-year"
                className="input mt-1.5 w-full"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                defaultValue={EXAMPLE.year}
              />
            </label>
          </div>

          {/* Prerendered for the example names, so the page carries real
              suggestions with JavaScript off; the island replaces this list
              as soon as the reader edits a field. */}
          <div id="hg-output" className="mt-9">
            {groups.map((group) => (
              <div key={group.title} className="mt-8 first:mt-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-700">
                  {group.title}
                </p>
                <ul className="mt-4 flex flex-wrap gap-2.5">
                  {group.tags.map((tag) => (
                    <li key={tag}>
                      <button
                        type="button"
                        data-tag={tag}
                        className="rounded-full border border-line bg-surface-panel px-4 py-2 text-[15px] text-ink-high transition-colors hover:border-gold-300 hover:bg-gold-50"
                      >
                        {tag}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <a
            href={signupUrl('hashtag-generator')}
            className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#3a1722] px-6 py-3 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#4a1d2b]"
          >
            Put it on a free wedding website
          </a>
        </div>
      </Section>

      <Section tone="panel" width="prose">
        <AnswerBlock>
          A wedding hashtag is a single tag guests attach to their photos so all of them can be
          found in one place afterwards. The ones that work are short, spelled the way they sound,
          and not already in use by hundreds of strangers — check it on Instagram before you print
          it anywhere.
        </AnswerBlock>

        <H2 id="how-to-pick">How to pick one you will not regret</H2>
        <CheckList
          className="mt-6"
          items={[
            'Say it out loud. If someone has to ask how it is spelled, it will be mistyped at the sangeet.',
            'Search it on Instagram first. A tag already carrying a few thousand unrelated posts is not yours.',
            'Keep it under about twenty characters. It has to fit on signage and read on a phone.',
            'Capitalise each word — #AaravWedsDiya is legible, #aaravwedsdiya is not.',
            'Avoid numbers unless it is the year, and avoid anything that reads as a different word when run together.',
            'Pick it before the invitations go to print, since that is where it first appears.',
          ]}
        />

        <H2 id="patterns">The patterns that keep working</H2>
        <H3>Name blends</H3>
        <P>
          The front of one name welded to the back of the other. These are the most personal and the
          least likely to be taken, but they only work when the result is pronounceable — read it
          aloud before committing.
        </P>
        <H3>Weds and Ki Shaadi</H3>
        <P>
          <em>Weds</em> is the format Indian wedding cards have used for decades, and it transfers
          to a hashtag without explanation. <em>KiShaadi</em> and <em>KiBaraat</em> do the same in
          Hinglish and read warmer.
        </P>
        <H3>Family and year</H3>
        <P>
          A surname variant is useful when both families are posting, and appending the year is the
          simplest way to rescue a tag that is almost, but not quite, unique.
        </P>

        <H2 id="using-it">Where to actually put it</H2>
        <CheckList
          className="mt-6"
          items={[
            'On your wedding website, near the gallery, so guests see it while they are already looking at photos.',
            'At the bottom of the WhatsApp invitation message.',
            'On signage at the sangeet and reception entrance, and on photo-booth props.',
            'In the caption of your own posts, which is how guests learn it without being told.',
          ]}
        />
        <P>
          Worth knowing: hashtags only collect photos from people who remember to use them. A shared
          gallery that guests can upload to directly catches the rest, and shaadi.diy includes one
          with every wedding website.
        </P>

        <H2 id="faq">Frequently asked</H2>
        <Faq items={faqs} />

        <RelatedLinks
          links={[
            {
              label: 'Free wedding website',
              href: '/wedding-website',
              note: 'Ten templates, a gallery and a QR code.',
            },
            {
              label: 'WhatsApp wedding invitations',
              href: '/whatsapp-wedding-invitation',
              note: 'Where the hashtag goes at the bottom of the message.',
            },
            {
              label: 'Wedding budget calculator',
              href: '/tools/wedding-budget-calculator',
              note: 'Back to the less fun part of planning.',
            },
            {
              label: 'Indian wedding checklist',
              href: '/guides/indian-wedding-checklist',
              note: 'Everything else that has to happen first.',
            },
            {
              label: 'Guest list manager',
              href: '/wedding-guest-list-manager',
              note: 'The people who will be using the tag.',
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
        title="You have a hashtag. Now give it somewhere to live."
        body="A free wedding website with a shared gallery, RSVP form and QR code — set up in about twenty minutes."
        ctaSource="hashtag-generator-footer"
      />
    </>
  );
}
