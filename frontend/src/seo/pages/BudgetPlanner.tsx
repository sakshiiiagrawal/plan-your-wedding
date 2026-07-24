import { FiBarChart2, FiCreditCard, FiFolder, FiPieChart, FiPrinter, FiUsers } from 'react-icons/fi';
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
  SourceNote,
} from '../ui';

export const faqs: FaqItem[] = [
  {
    q: 'What is the difference between budget, allocated, paid and outstanding?',
    a: 'Budget is what you decided to spend on a category. Allocated is the total of the vendor quotes you have actually committed to inside it. Paid is what has left your account. Outstanding is allocated minus paid — the money you still owe. Keeping the four apart is what stops a category from looking healthy while three balance payments are still due.',
  },
  {
    q: 'Can I set a budget per category and per vendor?',
    a: 'Yes. You set a total for the wedding, budgets per category such as venue, catering, decor or photography, and amounts against each vendor or venue inside those categories. The parent totals are computed from the children, so they cannot disagree.',
  },
  {
    q: 'Does it track vendor advances and balance payments?',
    a: 'Yes. Each vendor carries its payment schedule — advance, milestone payments and final balance — with due dates and how much is still outstanding.',
  },
  {
    q: 'Is the budget in rupees?',
    a: 'Yes, amounts are in rupees and display in Indian digit grouping, so ₹2,50,000 reads the way you would write it.',
  },
  {
    q: 'Can I hide the budget from other family members?',
    a: 'Yes. People you invite are given access section by section. Someone helping with the guest list or the events never has to see what the wedding costs.',
  },
];

export default function BudgetPlanner() {
  return (
    <>
      <Hero
        eyebrow="Wedding budget planner"
        title="A wedding budget planner that tracks what is actually still due"
        lead="Set a rupee budget per category, record what each vendor is committed to, log payments as they go out, and see the outstanding balance before the vendor calls to ask."
        ctaSource="budget-planner"
        secondary={{ label: 'Open the budget calculator', href: '/tools/wedding-budget-calculator' }}
      />

      <Section tone="panel" width="prose">
        <AnswerBlock>
          A wedding budget planner tracks four numbers per category: the budget you set, the amount
          allocated to vendors, the amount already paid, and what is still outstanding. shaadi.diy
          keeps those four apart for the whole wedding, for each category, and for each vendor —
          free, in rupees.
        </AnswerBlock>
        <P>
          Most wedding budget spreadsheets track two numbers: estimated and actual. That works right
          up to the point where you have paid a 30% advance to six vendors. &ldquo;Actual&rdquo; then
          understates what you owe by lakhs, and the category still looks under control.
        </P>
      </Section>

      <Section tone="page">
        <Eyebrow>The four figures</Eyebrow>
        <H2>Why four numbers instead of two</H2>
        <DataTable
          head={['Figure', 'What it means', 'The question it answers']}
          rows={[
            ['Budget', 'What you decided to spend here', 'Am I planning within my means?'],
            [
              'Allocated',
              'Total of the quotes you have committed to',
              'Have I already promised more than I budgeted?',
            ],
            ['Paid', 'What has actually left your account', 'How much have I spent so far?'],
            [
              'Outstanding',
              'Allocated minus paid',
              'What do I still owe, and when is it due?',
            ],
          ]}
        />
        <P>
          Allocated crossing budget is the early warning. Outstanding is the number that matters in
          the last month, when four vendors want their balance in the same week.
        </P>
      </Section>

      <Section tone="panel">
        <Eyebrow>What it does</Eyebrow>
        <H2>Categories, vendors and payments in one ledger</H2>
        <FeatureGrid
          items={[
            {
              icon: FiPieChart,
              title: 'Category budgets',
              body: 'Venue, catering, decor, photography, attire, jewellery, music, travel — plus any category you add.',
            },
            {
              icon: FiFolder,
              title: 'Vendor and venue budgets',
              body: 'Set an amount per vendor inside a category; the category total is computed from them, not typed twice.',
            },
            {
              icon: FiCreditCard,
              title: 'Payment schedules',
              body: 'Advance, milestone and balance payments with due dates, and a running outstanding figure per vendor.',
            },
            {
              icon: FiUsers,
              title: 'Shared, but scoped',
              body: 'Give a parent or planner access to money only if you want to. Everything else can be shared without it.',
            },
            {
              icon: FiBarChart2,
              title: 'Overrun visibility',
              body: 'Charts that show which categories are over budget while there is still time to negotiate.',
            },
            {
              icon: FiPrinter,
              title: 'Exports and print',
              body: 'A payment schedule you can print or export for whoever is actually writing the cheques.',
            },
          ]}
        />
      </Section>

      <Section tone="raised">
        <Eyebrow>Getting started</Eyebrow>
        <H2>A workable way to set the first budget</H2>
        <CheckList
          className="mt-7 max-w-3xl"
          items={[
            'Fix the guest count first. Catering and venue scale almost linearly with it, and together they are usually the largest share of an Indian wedding budget.',
            'Split the total across categories before you talk to any vendor, so quotes get compared against a number instead of anchoring you.',
            'Keep a contingency line of roughly 10% untouched. Something always arrives late and costs more.',
            'Record every quote as allocated the moment you commit, not when you pay — that is the figure that protects you.',
            'Log each payment with its date, so the outstanding balance is always current.',
          ]}
        />
        <SourceNote>
          On category percentages: the split varies enormously by region, city and how many
          functions you host, so we do not publish a single &ldquo;correct&rdquo; breakdown. The{' '}
          <a
            className="text-gold-700 underline"
            href="/tools/wedding-budget-calculator"
          >
            budget calculator
          </a>{' '}
          starts from a common planning split and lets you edit every percentage, and the{' '}
          <a
            className="text-gold-700 underline"
            href="/guides/how-much-does-an-indian-wedding-cost"
          >
            cost guide
          </a>{' '}
          explains which levers actually move the total.
        </SourceNote>
      </Section>

      <Section tone="panel" width="prose">
        <Eyebrow>Questions</Eyebrow>
        <H2>Frequently asked</H2>
        <Faq items={faqs} />
        <RelatedLinks
          links={[
            {
              label: 'Wedding budget calculator',
              href: '/tools/wedding-budget-calculator',
              note: 'Split a total across categories in a few seconds.',
            },
            {
              label: 'How much does an Indian wedding cost?',
              href: '/guides/how-much-does-an-indian-wedding-cost',
              note: 'What drives the total, and where the money goes.',
            },
            {
              label: 'Guest list manager',
              href: '/wedding-guest-list-manager',
              note: 'The headcount every catering estimate depends on.',
            },
            {
              label: 'Wedding planning app',
              href: '/wedding-planning-app',
              note: 'The rest of the workspace the budget sits inside.',
            },
            {
              label: 'Indian wedding checklist',
              href: '/guides/indian-wedding-checklist',
              note: 'When each payment usually falls due.',
            },
            {
              label: 'Free wedding website',
              href: '/wedding-website',
              note: 'Included, so it is not another line in the budget.',
            },
          ]}
        />
      </Section>

      <CtaBand
        title="Know what you owe, not just what you have spent."
        body="Set category budgets, record vendor commitments, and log payments as they go out. It takes about ten minutes to set up."
        ctaSource="budget-planner-footer"
      />
    </>
  );
}
