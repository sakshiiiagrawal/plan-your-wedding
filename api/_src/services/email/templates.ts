/**
 * Transactional email templates. Everything renders through one branded
 * layout (tables + inline styles — the only markup email clients respect)
 * so all emails look consistent and new ones stay one function long.
 */

const BRAND = {
  name: 'Plan Your Wedding',
  primary: '#6b1f2a', // deep burgundy (matches frontend --primary)
  gold: '#b08d3e',
  bg: '#faf6ef',
  panel: '#fffdf9',
  ink: '#3e3732',
  inkLow: '#6b6259',
  border: '#ede6d8',
};

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function button(href: string, label: string): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto"><tr><td style="border-radius:8px;background:${BRAND.primary}">` +
    `<a href="${href}" style="display:inline-block;padding:13px 32px;font-family:Georgia,serif;font-size:16px;color:#fffdf9;text-decoration:none;border-radius:8px">${label}</a>` +
    `</td></tr></table>`
  );
}

interface LayoutOpts {
  /** Hidden inbox-preview line shown next to the subject. */
  preheader: string;
  heading: string;
  /** Pre-rendered inner HTML. Caller escapes any user-provided values. */
  bodyHtml: string;
  footerNote: string;
}

function layout({ preheader, heading, bodyHtml, footerNote }: LayoutOpts): string {
  return `
<div style="margin:0;padding:32px 12px;background:${BRAND.bg}">
  <div style="display:none;max-height:0;overflow:hidden">${preheader}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" align="center" width="100%" style="max-width:560px;margin:0 auto;background:${BRAND.panel};border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden">
    <tr>
      <td style="background:${BRAND.primary};padding:26px 40px;text-align:center">
        <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:1px;color:#fffdf9">&#10087; ${BRAND.name}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:36px 40px 8px;text-align:center">
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:normal;color:${BRAND.primary}">${heading}</h1>
        <div style="width:56px;height:2px;background:${BRAND.gold};margin:16px auto 0"></div>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 40px 36px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.65;color:${BRAND.ink}">
        ${bodyHtml}
      </td>
    </tr>
    <tr>
      <td style="padding:20px 40px;border-top:1px solid ${BRAND.border};text-align:center;font-family:Georgia,serif;font-size:13px;line-height:1.6;color:${BRAND.inkLow}">
        ${footerNote}<br/>&mdash; The ${BRAND.name} team
      </td>
    </tr>
  </table>
</div>`;
}

/** "Can't click the button?" fallback shown under every CTA. */
function linkFallback(link: string): string {
  return `<p style="margin:0;font-size:13px;color:${BRAND.inkLow};word-break:break-all">If the button doesn't work, copy this link into your browser:<br/><a href="${link}" style="color:${BRAND.primary}">${link}</a></p>`;
}

export function verificationEmail(args: { name?: string | undefined; link: string }): EmailContent {
  const greeting = args.name ? `Hi ${escapeHtml(args.name)},` : 'Hi,';
  return {
    subject: `Welcome to ${BRAND.name} — verify your email`,
    html: layout({
      preheader: 'One quick click to confirm your email and you are all set.',
      heading: 'Welcome aboard',
      bodyHtml:
        `<p style="margin:0 0 12px">${greeting}</p>` +
        `<p style="margin:0 0 12px">We're delighted to help you plan your big day. Please confirm your email address so we can keep your account secure.</p>` +
        `<div style="text-align:center">${button(args.link, 'Verify my email')}</div>` +
        `<p style="margin:0 0 16px;font-size:14px;color:${BRAND.inkLow}">This link expires in 24 hours.</p>` +
        linkFallback(args.link),
      footerNote: "You're receiving this because an account was created with this address. If it wasn't you, you can safely ignore this email.",
    }),
    text: `${args.name ? `Hi ${args.name},` : 'Hi,'}\n\nWelcome to ${BRAND.name}! Please verify your email address by opening this link (expires in 24 hours):\n\n${args.link}\n\nIf you didn't create an account, you can ignore this email.`,
  };
}

export function passwordResetEmail(args: { name?: string | undefined; link: string }): EmailContent {
  const greeting = args.name ? `Hi ${escapeHtml(args.name)},` : 'Hi,';
  return {
    subject: 'Reset your password',
    html: layout({
      preheader: 'Use the link inside to choose a new password. Expires in 1 hour.',
      heading: 'Password reset',
      bodyHtml:
        `<p style="margin:0 0 12px">${greeting}</p>` +
        `<p style="margin:0 0 12px">We received a request to reset the password for your account. Click below to choose a new one.</p>` +
        `<div style="text-align:center">${button(args.link, 'Reset my password')}</div>` +
        `<p style="margin:0 0 16px;font-size:14px;color:${BRAND.inkLow}">This link expires in 1 hour. If you didn't request a reset, no action is needed &mdash; your password is unchanged.</p>` +
        linkFallback(args.link),
      footerNote: "You're receiving this because a password reset was requested for this address.",
    }),
    text: `${args.name ? `Hi ${args.name},` : 'Hi,'}\n\nWe received a request to reset your ${BRAND.name} password. Open this link to choose a new one (expires in 1 hour):\n\n${args.link}\n\nIf you didn't request this, you can ignore this email — your password is unchanged.`,
  };
}

export function inviteEmail(args: {
  inviterName: string;
  role: string;
  link: string;
}): EmailContent {
  const inviter = escapeHtml(args.inviterName);
  const role = escapeHtml(args.role);
  return {
    subject: `${args.inviterName} invited you to help plan their wedding`,
    html: layout({
      preheader: `${args.inviterName} would love your help planning their wedding.`,
      heading: "You're invited",
      bodyHtml:
        `<p style="margin:0 0 12px">Hi,</p>` +
        `<p style="margin:0 0 12px"><b>${inviter}</b> has invited you to collaborate on their wedding as ${/^[aeiou]/i.test(role) ? 'an' : 'a'} <b>${role}</b>.</p>` +
        `<p style="margin:0 0 12px">Accept the invitation below &mdash; you can sign in or create an account on the same page.</p>` +
        `<div style="text-align:center">${button(args.link, 'Accept invitation')}</div>` +
        linkFallback(args.link),
      footerNote: `You're receiving this because ${inviter} entered your email on ${BRAND.name}. Not expecting this? You can safely ignore it.`,
    }),
    text: `${args.inviterName} has invited you to collaborate on their wedding as a ${args.role} on ${BRAND.name}.\n\nAccept the invitation here (you can sign in or create an account on the same page):\n\n${args.link}\n\nNot expecting this? You can safely ignore this email.`,
  };
}

export function digestEmail(args: {
  name?: string | undefined;
  count: number;
  /** Pre-rendered reminder sections (built by reminders.service). */
  sectionsHtml: string;
  sectionsText: string;
  dashboardLink: string;
}): EmailContent {
  const plural = args.count === 1 ? 'reminder' : 'reminders';
  return {
    subject: `${args.count} ${plural} for today — ${BRAND.name}`,
    html: layout({
      preheader: `You have ${args.count} ${plural} that need your attention today.`,
      heading: "Today's reminders",
      bodyHtml:
        `<p style="margin:0 0 4px">Hi ${escapeHtml(args.name || 'there')}, here's what needs your attention today:</p>` +
        args.sectionsHtml +
        `<div style="text-align:center">${button(args.dashboardLink, 'Open my dashboard')}</div>`,
      footerNote:
        'You can turn this daily digest off anytime from Settings &rsaquo; Reminders in your dashboard.',
    }),
    text: `Hi ${args.name || 'there'}, here's what needs your attention today:\n\n${args.sectionsText}\nOpen your dashboard: ${args.dashboardLink}\n\nYou can turn this daily digest off from Settings > Reminders.`,
  };
}
