// Load .env before reading any variable (ES imports run before server.ts calls dotenv.config())
import 'dotenv/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export type MailStatus = 'sent' | 'logged' | 'failed';

export interface MailResult {
  status: MailStatus;
  id?: string;
  error?: string;
}

export interface SentMail {
  to: string;
  subject: string;
  kind: StoreMailKind;
  status: MailStatus;
  at: string;
  error?: string;
}

export type StoreMailKind = 'store_submitted' | 'store_approved' | 'store_rejected';

// The verified Resend sending domain, so the default sender is deliverable.
const FROM =
  process.env.SMTP_FROM ||
  process.env.RESEND_FROM ||
  'ABU Marketplace <no-reply@verification.abumarketplace.shop>';
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const BRAND = 'ABU Marketplace';

// Recent messages are kept in memory so the flow can be inspected while SMTP is
// unconfigured. This is a debugging aid, not a queue.
const outbox: SentMail[] = [];
const OUTBOX_LIMIT = 50;

export function recentMail(): SentMail[] {
  return [...outbox].reverse();
}

function remember(mail: SentMail): void {
  outbox.push(mail);
  if (outbox.length > OUTBOX_LIMIT) outbox.shift();
}

let cachedTransport: Transporter | null | undefined;

// Resend speaks plain HTTPS, which avoids SMTP ports that some hosts block.
async function deliverViaResend(
  apiKey: string,
  to: string,
  subject: string,
  kind: StoreMailKind,
  html: string,
  text: string,
): Promise<MailResult> {
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
    });

    const payload: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = payload?.message || payload?.error || `HTTP ${res.status}`;
      console.error(`[mail] FAILED ${kind} -> ${to} via Resend: ${message}`);
      remember({ to, subject, kind, status: 'failed', at: new Date().toISOString(), error: message });
      return { status: 'failed', error: message };
    }

    console.log(`[mail] sent ${kind} -> ${to} via Resend (${payload?.id || 'no id'})`);
    remember({ to, subject, kind, status: 'sent', at: new Date().toISOString() });
    return { status: 'sent', id: payload?.id };
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error(`[mail] FAILED ${kind} -> ${to} via Resend: ${message}`);
    remember({ to, subject, kind, status: 'failed', at: new Date().toISOString(), error: message });
    return { status: 'failed', error: message };
  }
}

/**
 * Builds the SMTP transport once. Returns null when SMTP is not configured, in
 * which case messages are logged and recorded instead of being delivered.
 */
function transport(): Transporter | null {
  if (cachedTransport !== undefined) return cachedTransport;

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !user || !pass) {
    console.warn(
      '[mail] SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS). ' +
        'Emails will be logged instead of delivered.',
    );
    cachedTransport = null;
    return null;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === 'true' || (process.env.SMTP_SECURE !== 'false' && port === 465);

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  return cachedTransport;
}

async function deliver(to: string, subject: string, kind: StoreMailKind, html: string, text: string): Promise<MailResult> {
  // Prefer Resend when a key is present; fall back to generic SMTP, then to logging.
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    return deliverViaResend(resendKey, to, subject, kind, html, text);
  }

  const mailer = transport();

  if (!mailer) {
    console.log(`[mail] (not sent, SMTP unconfigured) ${kind} -> ${to} :: ${subject}`);
    remember({ to, subject, kind, status: 'logged', at: new Date().toISOString() });
    return { status: 'logged' };
  }

  try {
    const info = await mailer.sendMail({ from: FROM, to, subject, html, text });
    const id = typeof info.messageId === 'string' ? info.messageId : undefined;
    console.log(`[mail] sent ${kind} -> ${to} (${id || 'no messageId'})`);
    remember({ to, subject, kind, status: 'sent', at: new Date().toISOString() });
    return { status: 'sent', id };
  } catch (err: any) {
    const message = err?.message || String(err);
    // Never let a mail failure break a workflow; surface it in the log instead.
    console.error(`[mail] FAILED ${kind} -> ${to}: ${message}`);
    remember({ to, subject, kind, status: 'failed', at: new Date().toISOString(), error: message });
    return { status: 'failed', error: message };
  }
}

function layout(heading: string, body: string, footer: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#002541;padding:20px 24px;color:#ffffff">
      <div style="font-size:18px;font-weight:700">${BRAND}</div>
      <div style="font-size:12px;opacity:.75;margin-top:4px">Merchant Programme</div>
    </div>
    <div style="padding:24px">
      <h1 style="margin:0 0 12px;font-size:19px;color:#002541">${heading}</h1>
      ${body}
      <p style="margin:24px 0 0;font-size:12px;color:#64748b">${footer}</p>
    </div>
  </div>
</body></html>`;
}

export interface StoreMailInput {
  to: string;
  ownerName?: string | null;
  storeName: string;
  storeId?: string;
  note?: string | null;
}

/** Confirmation that the application was received and is queued for review. */
export async function sendStoreSubmitted(input: StoreMailInput): Promise<MailResult> {
  const who = input.ownerName || 'there';
  const subject = `We received your store application: ${input.storeName}`;
  const html = layout(
    'Application received',
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6">Hello ${who},</p>
     <p style="margin:0 0 12px;font-size:14px;line-height:1.6">
       Thanks for applying to open <strong>${input.storeName}</strong> on ${BRAND}.
       Your application is now queued for review by our merchant team.
     </p>
     <p style="margin:0 0 12px;font-size:14px;line-height:1.6">
       Reviews usually finish within 1-2 business days. You'll get a separate email
       as soon as a decision is made, so there is nothing else you need to do right now.
     </p>`,
    'You are receiving this because you submitted a store application on ABU Marketplace.',
  );
  const text =
    `Hello ${who},\n\nWe received your application to open "${input.storeName}" on ${BRAND}.\n` +
    `It is queued for review and usually takes 1-2 business days. We will email you again as soon as a decision is made.\n`;

  return deliver(input.to, subject, 'store_submitted', html, text);
}

/** Acceptance: the store is live and the merchant may start listing products. */
export async function sendStoreApproved(input: StoreMailInput): Promise<MailResult> {
  const who = input.ownerName || 'there';
  const subject = `Your store is live: ${input.storeName}`;
  const html = layout(
    'Your store is approved',
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6">Hello ${who},</p>
     <p style="margin:0 0 12px;font-size:14px;line-height:1.6">
       Good news — <strong>${input.storeName}</strong> has been approved and is now live on ${BRAND}.
       Buyers can find your storefront in the directory immediately.
     </p>
     <p style="margin:0 0 12px;font-size:14px;line-height:1.6">
       Open your merchant hub to add products and start receiving orders.
     </p>
     <p style="margin:0;font-size:14px;line-height:1.6">
       <a href="${process.env.APP_URL || 'https://abumarketplace.shop'}"
          style="display:inline-block;background:#0B3B60;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">
         Open merchant hub
       </a>
     </p>`,
    'You are receiving this because your store application was approved.',
  );
  const text =
    `Hello ${who},\n\n"${input.storeName}" has been approved and is now live on ${BRAND}.\n` +
    `Open your merchant hub to add products and start receiving orders.\n`;

  return deliver(input.to, subject, 'store_approved', html, text);
}

/** Rejection with the reviewer's reason so the merchant can fix and resubmit. */
export async function sendStoreRejected(input: StoreMailInput): Promise<MailResult> {
  const who = input.ownerName || 'there';
  const subject = `Update on your store application: ${input.storeName}`;
  const reason = input.note?.trim() || 'The application did not meet our merchant requirements.';
  const html = layout(
    'Application not approved',
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6">Hello ${who},</p>
     <p style="margin:0 0 12px;font-size:14px;line-height:1.6">
       Thank you for applying to open <strong>${input.storeName}</strong> on ${BRAND}.
       After reviewing it, we are not able to approve the store at this time.
     </p>
     <div style="margin:0 0 12px;padding:12px 14px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:6px;font-size:14px;line-height:1.6">
       <strong>Reason:</strong> ${reason}
     </div>
     <p style="margin:0;font-size:14px;line-height:1.6">
       You are welcome to address the points above and submit a new application at any time.
     </p>`,
    'You are receiving this because your store application was reviewed.',
  );
  const text =
    `Hello ${who},\n\nWe reviewed your application for "${input.storeName}" and are not able to approve it at this time.\n\n` +
    `Reason: ${reason}\n\nYou are welcome to address this and submit a new application at any time.\n`;

  return deliver(input.to, subject, 'store_rejected', html, text);
}
