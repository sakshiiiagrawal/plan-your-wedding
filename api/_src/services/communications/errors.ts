import { BadRequestError } from '../../shared/errors/HttpError';

/**
 * A send rejected by the channel's provider API. Extends BadRequestError so an
 * unhandled one still surfaces as a 400 with its message; `providerCode`
 * carries the provider's numeric error code for mapping.
 */
export class ProviderSendError extends BadRequestError {
  constructor(
    message: string,
    public readonly providerCode?: number,
  ) {
    super(message);
  }
}

// Meta error codes the app hits routinely during setup. Failure is the common
// case with WhatsApp (approval states, allowlists, 24h windows), so the mapped
// text is what gets stored on the message row and shown per-guest in the UI.
const HUMAN_BY_CODE: Record<number, string> = {
  131030:
    "This number isn't on the WhatsApp test allowlist — the Meta app is in development mode. " +
    'Add it under WhatsApp → API Setup in the Meta dashboard.',
  131047:
    "The 24-hour reply window has closed — this guest hasn't messaged you recently. " +
    'Send an approved template instead.',
  131026:
    'This number cannot receive WhatsApp messages (not on WhatsApp, or it has blocked business messages).',
  132001: "This template isn't approved by Meta yet — check the Templates panel and sync.",
};

/** Human text for a known provider error code (e.g. building a 400 upfront). */
export function humanForCode(code: number): string | undefined {
  return HUMAN_BY_CODE[code];
}

export function humanizeSendError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? 'send failed');
  const code =
    err instanceof ProviderSendError && err.providerCode != null
      ? err.providerCode
      : Number(/#(\d{6})\b/.exec(message)?.[1] ?? NaN);
  return HUMAN_BY_CODE[code] ?? message;
}
