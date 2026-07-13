import type { EmailMessage, EmailProvider } from '../types';

/** Dev fallback: prints the email instead of sending it. */
export const consoleProvider: EmailProvider = {
  name: 'console',
  async send({ to, subject, html, text }: EmailMessage): Promise<void> {
    const body = text ?? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`\n[email:console] To: ${to}\nSubject: ${subject}\n${body}\n`);
  },
};
