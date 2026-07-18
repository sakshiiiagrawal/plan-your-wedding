import { env } from '../../config/env';
import { BadRequestError } from '../../shared/errors/HttpError';

const GRAPH = 'https://graph.facebook.com/v21.0';

export function isConfigured(): boolean {
  return Boolean(
    env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_WABA_ID,
  );
}

async function graph<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new BadRequestError(json.error?.message ?? `WhatsApp API error (${res.status})`);
  }
  return json;
}

/**
 * Digits-only E.164. Guest phones are entered free-form; a bare 10-digit
 * number is assumed Indian (this is a shaadi product).
 * ponytail: default country code is a constant; make it a wedding setting if
 * international couples show up.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

interface SendResponse {
  messages?: { id: string }[];
}

async function sendMessage(to: string, payload: Record<string, unknown>): Promise<string> {
  const json = await graph<SendResponse>(`/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    body: JSON.stringify({ messaging_product: 'whatsapp', to, ...payload }),
  });
  return json.messages?.[0]?.id ?? '';
}

export function sendTemplate(to: string, name: string, params: string[]): Promise<string> {
  return sendMessage(to, {
    type: 'template',
    template: {
      name,
      language: { code: 'en' },
      components:
        params.length > 0
          ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }]
          : [],
    },
  });
}

export function sendText(to: string, body: string): Promise<string> {
  return sendMessage(to, { type: 'text', text: { body } });
}

export function sendButtons(
  to: string,
  body: string,
  buttons: { id: string; title: string }[],
): Promise<string> {
  return sendMessage(to, {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: { buttons: buttons.map((b) => ({ type: 'reply', reply: b })) },
    },
  });
}

export function sendList(
  to: string,
  body: string,
  buttonLabel: string,
  rows: { id: string; title: string; description?: string }[],
): Promise<string> {
  return sendMessage(to, {
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: body },
      action: { button: buttonLabel, sections: [{ title: 'Options', rows }] },
    },
  });
}

export function sendLocation(
  to: string,
  loc: { latitude: number; longitude: number; name: string; address?: string },
): Promise<string> {
  return sendMessage(to, { type: 'location', location: loc });
}

/** Single button that opens a URL — used to link the public wedding site. */
export function sendCtaUrl(
  to: string,
  body: string,
  buttonText: string,
  url: string,
): Promise<string> {
  return sendMessage(to, {
    type: 'interactive',
    interactive: {
      type: 'cta_url',
      body: { text: body },
      action: { name: 'cta_url', parameters: { display_text: buttonText, url } },
    },
  });
}

export function sendReaction(to: string, messageId: string, emoji: string): Promise<string> {
  return sendMessage(to, { type: 'reaction', reaction: { message_id: messageId, emoji } });
}

/** List row titles are hard-capped at 24 chars by the API. */
export function listTitle(text: string): string {
  return text.length > 24 ? `${text.slice(0, 23)}…` : text;
}

export interface MetaTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: { type: string; text?: string; buttons?: { type: string; text: string }[] }[];
}

export async function listMetaTemplates(): Promise<MetaTemplate[]> {
  const json = await graph<{ data: MetaTemplate[] }>(
    `/${env.WHATSAPP_WABA_ID}/message_templates?fields=id,name,status,category,language,components&limit=50`,
  );
  return json.data ?? [];
}

export function createMetaTemplate(definition: Record<string, unknown>): Promise<unknown> {
  return graph(`/${env.WHATSAPP_WABA_ID}/message_templates`, {
    method: 'POST',
    body: JSON.stringify(definition),
  });
}
