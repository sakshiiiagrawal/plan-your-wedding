import type { GuestRow } from '../../../../shared/src';
import { BadRequestError } from '../../shared/errors/HttpError';

/** Variables available when building outbound template params. */
export interface CampaignContext {
  weddingTitle: string;
  weddingDate: string; // human-readable, from earliest event
  eventName?: string;
  eventDate?: string;
  eventVenue?: string;
}

export interface ChannelCapabilities {
  supportsPolls: boolean;
  supportsReadReceipts: boolean;
  supportsTemplates: boolean;
  /**
   * Free-form messages only deliver within this many hours of the guest's
   * last inbound message (Meta's customer-service window). null = no limit.
   */
  sessionWindowHours: number | null;
}

export interface SendResult {
  providerMessageId: string;
}

/** Template shape the dashboard renders (picker + Templates panel). */
export interface DashboardTemplate {
  name: string;
  known: boolean;
  status: string;
  category: string;
  body: string;
  buttons: string[];
  description: string;
  startsRsvpFlow: boolean;
  needsEvent: boolean;
}

export interface TemplateSendSpec {
  needsEvent: boolean;
  startsRsvpFlow: boolean;
  buildParams: (guest: GuestRow, ctx: CampaignContext) => string[];
}

/**
 * One implementation per channel (WhatsApp today; SMS/email later). The
 * generic communications service owns audience resolution, the message log,
 * conversations, polls and reachability; providers own transport, template
 * catalogs and webhook parsing.
 */
export interface ChannelProvider {
  readonly channel: string;
  readonly capabilities: ChannelCapabilities;
  /** Message thrown to the dashboard when the channel's env vars are missing. */
  readonly configHint: string;
  isConfigured(): boolean;
  /** Canonical address for dedupe/lookup (E.164 digits for phone channels). */
  normalizeAddress(raw: string): string;
  getTemplateSpec(name: string): TemplateSendSpec | undefined;
  listTemplates(): Promise<DashboardTemplate[]>;
  syncTemplates(): Promise<{ created: string[]; skipped: string[] }>;
  sendTemplate(address: string, name: string, params: string[]): Promise<SendResult>;
  sendText(address: string, body: string): Promise<SendResult>;
  sendPollList(
    address: string,
    question: string,
    rows: { id: string; title: string }[],
  ): Promise<SendResult>;
  /** Provider webhook payload → status updates + inbound message handling. */
  handleInbound(body: unknown): Promise<void>;
}

// Registered lazily by index.ts to keep this module import-cycle-free
// (providers import types from here).
const registry = new Map<string, ChannelProvider>();

export function registerProvider(provider: ChannelProvider): void {
  registry.set(provider.channel, provider);
}

export function getProvider(channel = 'whatsapp'): ChannelProvider {
  const provider = registry.get(channel);
  if (!provider) throw new BadRequestError(`Unknown channel: ${channel}`);
  return provider;
}

export function assertConfigured(provider: ChannelProvider): void {
  if (!provider.isConfigured()) throw new BadRequestError(provider.configHint);
}
