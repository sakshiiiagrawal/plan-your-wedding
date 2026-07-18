import type { GuestRow } from '../../../../../shared/src';
import type { CampaignContext } from '../provider';

/**
 * Catalog of templates this app knows how to send. Meta owns approval; this
 * maps a template name to its body variables and whether sending it starts
 * the interactive RSVP conversation flow.
 */
export interface TemplateSpec {
  /** Body preview shown in the dashboard before Meta returns its copy. */
  description: string;
  startsRsvpFlow: boolean;
  needsEvent: boolean;
  buildParams: (guest: GuestRow, ctx: CampaignContext) => string[];
  /** Meta creation payload, used by the sync endpoint. */
  definition: Record<string, unknown>;
}

export const TEMPLATE_CATALOG: Record<string, TemplateSpec> = {
  wedding_invite_rsvp: {
    description:
      'Wedding invitation with Joyfully accept / Regretfully decline buttons. ' +
      'Accepting starts the WhatsApp RSVP flow (party size + meal preference).',
    startsRsvpFlow: true,
    needsEvent: false,
    buildParams: (g, ctx) => [g.first_name, ctx.weddingTitle, ctx.weddingDate],
    definition: {
      name: 'wedding_invite_rsvp',
      language: 'en',
      category: 'MARKETING',
      components: [
        {
          type: 'BODY',
          text: 'Namaste {{1}}! You are warmly invited to {{2}} on {{3}}. We would be honoured to have you celebrate with us. Please confirm your attendance below.',
          example: { body_text: [['Anaya', "Sakshi & Ayush's Wedding", '26 Nov 2026']] },
        },
        {
          type: 'BUTTONS',
          buttons: [
            { type: 'QUICK_REPLY', text: 'Joyfully accept' },
            { type: 'QUICK_REPLY', text: 'Regretfully decline' },
          ],
        },
      ],
    },
  },
  wedding_rsvp_reminder: {
    description:
      'Nudge for guests who have not responded yet — pairs with the "pending" ' +
      'audience filter. Same buttons and RSVP flow as the invite.',
    startsRsvpFlow: true,
    needsEvent: false,
    buildParams: (g, ctx) => [g.first_name, ctx.weddingTitle, ctx.weddingDate],
    definition: {
      name: 'wedding_rsvp_reminder',
      language: 'en',
      category: 'MARKETING',
      components: [
        {
          type: 'BODY',
          text: 'Namaste {{1}}! A gentle reminder to confirm your attendance for {{2}} on {{3}} — it only takes a moment, right here on WhatsApp.',
          example: { body_text: [['Anaya', "Sakshi & Ayush's Wedding", '26 Nov 2026']] },
        },
        {
          type: 'BUTTONS',
          buttons: [
            { type: 'QUICK_REPLY', text: 'Joyfully accept' },
            { type: 'QUICK_REPLY', text: 'Regretfully decline' },
          ],
        },
      ],
    },
  },
  wedding_event_reminder: {
    description: 'Reminder for a specific event (name, date, venue). No buttons.',
    startsRsvpFlow: false,
    needsEvent: true,
    buildParams: (g, ctx) => [
      g.first_name,
      ctx.eventName ?? 'our celebration',
      ctx.eventDate ?? 'soon',
      ctx.eventVenue ?? 'the venue',
    ],
    definition: {
      name: 'wedding_event_reminder',
      language: 'en',
      category: 'UTILITY',
      components: [
        {
          type: 'BODY',
          text: 'Namaste {{1}}! A gentle reminder: {{2}} is on {{3}} at {{4}}. We look forward to celebrating with you. Reply to this message if you have any questions.',
          example: { body_text: [['Anaya', 'the Sangeet ceremony', '25 Nov 2026', 'Grand Lotus Hotel']] },
        },
      ],
    },
  },
};
