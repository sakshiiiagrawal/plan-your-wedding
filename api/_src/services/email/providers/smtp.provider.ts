import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../../config/env';
import type { EmailMessage, EmailProvider } from '../types';

let transport: Transporter | null = null;

function getTransport(): Transporter {
  if (!transport) {
    if (!env.SMTP_HOST) {
      throw new Error('SMTP provider selected but SMTP_HOST is not configured');
    }
    const port = env.SMTP_PORT ?? 587;
    transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure: port === 465, // 587 upgrades via STARTTLS
      requireTLS: port !== 465, // never send credentials over plaintext
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transport;
}

export const smtpProvider: EmailProvider = {
  name: 'smtp',
  async send({ to, subject, html, text }: EmailMessage): Promise<void> {
    await getTransport().sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      // Multipart with a text alternative scores better with spam filters
      text: text ?? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    });
  },
};
