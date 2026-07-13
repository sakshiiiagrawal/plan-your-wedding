export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative; providers derive one from html when omitted. */
  text?: string;
}

export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<void>;
}
