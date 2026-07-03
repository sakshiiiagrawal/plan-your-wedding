import nodemailer from 'nodemailer';
import { env } from '../config/env';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  if (!env.SMTP_HOST) {
    // ponytail: dev fallback — no SMTP provider configured, print instead
    console.log(`\n[mailer] (dev) email to ${to}: ${subject}\n${html.replace(/<[^>]+>/g, '')}\n`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  await transport.sendMail({ from: env.EMAIL_FROM, to, subject, html });
}
