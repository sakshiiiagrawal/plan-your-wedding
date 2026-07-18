import * as client from './client';
import { TEMPLATE_CATALOG } from './templates';
import { advanceFlow, parseReply, type InboundMessage } from './rsvp-flow';
import { handlePollReply, POLL_REPLY_RE } from '../poll-replies';
import { ProviderSendError, humanizeSendError } from '../errors';
import * as commsRepo from '../../../repositories/communications.repository';
import type {
  ChannelProvider,
  DashboardTemplate,
  SendResult,
  TemplateSendSpec,
} from '../provider';

async function send(fn: Promise<string>): Promise<SendResult> {
  return { providerMessageId: await fn };
}

export const whatsappProvider: ChannelProvider = {
  channel: 'whatsapp',
  capabilities: {
    supportsPolls: true,
    supportsReadReceipts: true,
    supportsTemplates: true,
    sessionWindowHours: 24,
  },
  configHint:
    'WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_WABA_ID.',

  isConfigured: client.isConfigured,
  normalizeAddress: client.normalizePhone,

  getTemplateSpec(name: string): TemplateSendSpec | undefined {
    return TEMPLATE_CATALOG[name];
  },

  async listTemplates(): Promise<DashboardTemplate[]> {
    const meta = await client.listMetaTemplates();
    const metaByName = new Map(meta.map((t) => [t.name, t]));
    // Catalog templates first (the ones the app can actually drive), then any
    // extra templates that exist on the WABA (sendable, no variables filled).
    const known = Object.entries(TEMPLATE_CATALOG).map(([name, spec]) => {
      const m = metaByName.get(name);
      return {
        name,
        known: true,
        status: m?.status ?? 'NOT_CREATED',
        category: m?.category ?? (spec.definition.category as string),
        body: m?.components.find((c) => c.type === 'BODY')?.text ?? spec.description,
        buttons:
          m?.components.find((c) => c.type === 'BUTTONS')?.buttons?.map((b) => b.text) ?? [],
        description: spec.description,
        startsRsvpFlow: spec.startsRsvpFlow,
        needsEvent: spec.needsEvent,
      };
    });
    const extra = meta
      .filter((t) => !(t.name in TEMPLATE_CATALOG))
      .map((t) => ({
        name: t.name,
        known: false,
        status: t.status,
        category: t.category,
        body: t.components.find((c) => c.type === 'BODY')?.text ?? '',
        buttons: t.components.find((c) => c.type === 'BUTTONS')?.buttons?.map((b) => b.text) ?? [],
        description: 'Created outside this app — sendable only if it has no variables.',
        startsRsvpFlow: false,
        needsEvent: false,
      }));
    return [...known, ...extra];
  },

  async syncTemplates() {
    const existing = new Set((await client.listMetaTemplates()).map((t) => t.name));
    const created: string[] = [];
    for (const [name, spec] of Object.entries(TEMPLATE_CATALOG)) {
      if (existing.has(name)) continue;
      await client.createMetaTemplate(spec.definition);
      created.push(name);
    }
    return { created, skipped: [...existing] };
  },

  sendTemplate: (address, name, params) => send(client.sendTemplate(address, name, params)),
  sendText: (address, body) => send(client.sendText(address, body)),
  sendPollList: (address, question, rows) =>
    send(
      client.sendList(
        address,
        question,
        'Answer',
        rows.map((r) => ({ id: r.id, title: client.listTitle(r.title) })),
      ),
    ),

  /**
   * Meta webhook payload. Processes delivery status updates, poll answers and
   * inbound guest replies. Never throws — the webhook must always 200 or Meta
   * retries and eventually disables the subscription.
   */
  async handleInbound(body: unknown): Promise<void> {
    const entries =
      (body as { entry?: { changes?: { value?: Record<string, unknown> }[] }[] })?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};

        for (const status of (value.statuses as
          | { id: string; status: string; errors?: { code?: number; message?: string; title?: string }[] }[]
          | undefined) ?? []) {
          const err = status.errors?.[0];
          const errorText = err
            ? humanizeSendError(
                new ProviderSendError(err.message ?? err.title ?? 'delivery failed', err.code),
              )
            : undefined;
          await commsRepo
            .updateMessageStatus(status.id, status.status, errorText)
            .catch((e) => console.error('[whatsapp] status update failed:', e));
        }

        for (const msg of (value.messages as InboundMessage[] | undefined) ?? []) {
          try {
            const address = client.normalizePhone(msg.from);
            const { token, display } = parseReply(msg);

            // Poll answers are stateless — the row id says everything
            const pollMatch = POLL_REPLY_RE.exec(token);
            if (pollMatch) {
              await handlePollReply(
                whatsappProvider,
                address,
                pollMatch[1]!,
                pollMatch[2]!,
                Number(pollMatch[3]),
              );
              continue;
            }

            const convo = await commsRepo.findConversation('whatsapp', address);
            if (!convo) {
              console.warn(`[whatsapp] inbound from unknown phone ${address}, ignoring`);
              continue;
            }
            await commsRepo.insertMessage({
              channel: 'whatsapp',
              wedding_id: convo.wedding_id,
              guest_id: convo.guest_id,
              address,
              direction: 'inbound',
              provider_message_id: msg.id,
              body: display || `[${msg.type}]`,
              status: 'received',
            });
            await commsRepo.updateConversation('whatsapp', address, {
              last_inbound_at: new Date().toISOString(),
            });
            // Log-only conversations (flow 'none', created by polls or one-off
            // sends) record history without triggering the RSVP flow.
            if (convo.flow === 'rsvp') await advanceFlow(convo, msg);
          } catch (e) {
            console.error('[whatsapp] inbound processing failed:', e);
          }
        }
      }
    }
  },
};
