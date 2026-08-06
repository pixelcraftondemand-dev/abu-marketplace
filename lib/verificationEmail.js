import { resend } from "@/lib/resend";
import { escapeHtml, getEmailFromAddress } from "@/lib/emailUtils";

const VERIFY_SUBJECT = "Verify your ABU Marketplace account";

const SUBJECTS = {
  verification: "Verify your email — ABU Marketplace",
  login: "Your sign-in code — ABU Marketplace",
  reset: "Reset your password — ABU Marketplace",
};

const ACTIONS = {
  verification: "verify your email address",
  login: "sign in to your account",
  reset: "reset your password",
};

function getAction(purpose) {
  return ACTIONS[purpose] || ACTIONS.verification;
}

function buildHtml({ code, purpose, expiresInMinutes }) {
  const action = escapeHtml(getAction(purpose));
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F6F3EE;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:600px;margin:0 auto;padding:24px 16px">
      <div style="background:#1A1A1A;border-radius:16px 16px 0 0;padding:28px 24px;text-align:center">
        <h1 style="margin:0;color:#F6E0B9;font-size:22px">ABU Marketplace</h1>
        <p style="margin:6px 0 0;color:#C9A96E;font-size:13px;letter-spacing:2px;text-transform:uppercase">Verification code</p>
      </div>
      <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px 24px;text-align:center">
        <p style="margin:0 0 20px;color:#333">Use the code below to ${action}:</p>
        <div style="display:inline-block;background:#F0E3D1;border:1px dashed #C9A96E;border-radius:12px;padding:16px 32px">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1A1A1A">${escapeHtml(code)}</span>
        </div>
        <p style="margin:20px 0 0;font-size:13px;color:#888">This code expires in ${expiresInMinutes} minutes. If you didn't request it, you can safely ignore this email.</p>
      </div>
      <div style="text-align:center;padding:16px;color:#888;font-size:12px">
        <p style="margin:0">ABU Marketplace — halal-certified African marketplace</p>
      </div>
    </div>
  </body>
</html>`;
}

function buildText({ code, purpose, expiresInMinutes }) {
  const action = getAction(purpose);
  return `ABU Marketplace — ${action}

Use this code to ${action}:

${code}

This code expires in ${expiresInMinutes} minutes. If you didn't request it, you can safely ignore this email.`;
}

/**
 * Sends an OTP/verification email via Resend from the verification subdomain.
 * Throws on invalid arguments or send failure so callers decide how to handle it.
 */
export async function sendVerificationEmail({
  to,
  code,
  purpose = "verification",
  expiresInMinutes = 10,
}) {
  if (!to) {
    throw new Error("sendVerificationEmail requires a recipient email address.");
  }
  if (code === undefined || code === null || code === "") {
    throw new Error("sendVerificationEmail requires a verification code.");
  }

  // Guard against nonsensical expiry values reaching the email copy.
  const minutes = Math.max(1, expiresInMinutes);
  const subject = SUBJECTS[purpose] || SUBJECTS.verification;

  await resend.emails.send({
    from: getEmailFromAddress("verification"),
    to: [to],
    subject,
    html: buildHtml({ code, purpose, expiresInMinutes: minutes }),
    text: buildText({ code, purpose, expiresInMinutes: minutes }),
  });
}

/**
 * Formats an expiry date for the email copy (e.g. "Jul 7, 2026, 2:00 PM").
 */
function formatExpiry(expiresAt) {
  const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "24 hours";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/**
 * Sends the link-based account verification email via Resend from the
 * verification subdomain (ABU Marketplace <noreply@verification.abumarketplace.shop>).
 * The email uses professional ABU branding, a "Verify Email Address" CTA,
 * the fallback URL, and an expiry notice. Throws on send failure so callers
 * can log diagnostics without exposing Resend internals to users.
 */
export async function sendAccountVerificationEmail({ to, verificationUrl, expiresAt }) {
  if (!to) {
    throw new Error("sendAccountVerificationEmail requires a recipient email address.");
  }
  // Allow http:// only for local development hosts — production URLs must be
  // https. This keeps local dev (NEXT_PUBLIC_APP_URL=http://localhost:3000)
  // working without ever emailing an insecure link in production.
  const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(verificationUrl || "");
  if (!verificationUrl || !(verificationUrl.startsWith("https://") || isLocalhost)) {
    throw new Error("sendAccountVerificationEmail requires a valid https verification URL.");
  }

  const safeUrl = escapeHtml(verificationUrl);
  const expiryLabel = formatExpiry(expiresAt);

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#F6F3EE;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:600px;margin:0 auto;padding:24px 16px">
      <!-- Header -->
      <div style="background:#1A1A1A;border-radius:16px 16px 0 0;padding:32px 24px;text-align:center">
        <p style="margin:0;color:#F6E0B9;font-size:24px;font-weight:bold;letter-spacing:1px">ABU Marketplace</p>
        <p style="margin:8px 0 0;color:#C9A96E;font-size:12px;letter-spacing:3px;text-transform:uppercase">Verify your email address</p>
      </div>
      <!-- Body -->
      <div style="background:#fff;border-radius:0 0 16px 16px;padding:32px 24px">
        <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">
          Hello, and welcome to ABU Marketplace! Please confirm your email address to
          activate your account and start shopping from verified sellers across Africa.
        </p>
        <div style="text-align:center;margin:28px 0">
          <a href="${safeUrl}" style="display:inline-block;background:#1A1A1A;color:#F6E0B9;text-decoration:none;font-size:15px;font-weight:bold;padding:16px 40px;border-radius:999px">
            Verify Email Address
          </a>
        </div>
        <p style="margin:0 0 12px;color:#666;font-size:13px;line-height:1.6">
          This verification link expires on <strong style="color:#333">${escapeHtml(expiryLabel)}</strong>.
          If the button above does not work, copy and paste this link into your browser:
        </p>
        <p style="margin:0 0 20px;word-break:break-all;font-size:12px;color:#C9A96E">${safeUrl}</p>
        <div style="border-top:1px solid #EEE;padding-top:16px;font-size:12px;color:#999;line-height:1.6">
          <p style="margin:0 0 8px">If you did not create an account on ABU Marketplace, you can safely ignore this email.</p>
          <p style="margin:0">Never share verification links. ABU Marketplace will never ask you for your password.</p>
        </div>
      </div>
      <!-- Footer -->
      <div style="text-align:center;padding:16px;color:#888;font-size:12px">
        <p style="margin:0">ABU Marketplace — halal-certified African marketplace</p>
      </div>
    </div>
  </body>
</html>`;

  const text = `ABU Marketplace — verify your email address

Hello, and welcome to ABU Marketplace! Please confirm your email address to activate your account.

Open this link to verify your email:
${verificationUrl}

This link expires on ${expiryLabel}. If you did not create an account on ABU Marketplace, you can safely ignore this email.

ABU Marketplace — halal-certified African marketplace`;

  await resend.emails.send({
    from: getEmailFromAddress("verification"),
    to: [to],
    subject: VERIFY_SUBJECT,
    html,
    text,
  });
}
