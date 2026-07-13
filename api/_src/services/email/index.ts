import { env } from '../../config/env';
import type { EmailMessage, EmailProvider } from './types';
import { smtpProvider } from './providers/smtp.provider';
import { consoleProvider } from './providers/console.provider';

export type { EmailMessage, EmailProvider } from './types';

// To add a provider (e.g. Resend, SES): implement EmailProvider in
// providers/, register it here, and add its name to EMAIL_PROVIDER in env.ts.
const providers: Record<string, EmailProvider> = {
  smtp: smtpProvider,
  console: consoleProvider,
};

function resolveProvider(): EmailProvider {
  // Explicit choice wins; otherwise infer from config so local dev without
  // SMTP creds still works (emails print to the console).
  const name = env.EMAIL_PROVIDER ?? (env.SMTP_HOST ? 'smtp' : 'console');
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown email provider: ${name}`);
  return provider;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  await resolveProvider().send(message);
}
