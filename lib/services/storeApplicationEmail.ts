/**
 * Store-application emails.
 *
 * Two audiences:
 *  - the ABU team, so a new application never sits unseen in the admin queue;
 *  - the seller, so an approval or rejection actually reaches them (with the
 *    reason, so a rejected application can be fixed and resubmitted).
 *
 * Every function is best-effort: it returns a boolean and never throws, so a
 * mail outage can never fail a store submission or an admin decision.
 */
import { resend } from "@/lib/resend";
import { escapeHtml, getEmailFromAddress } from "@/lib/emailUtils";
// Client-safe constants module — importing them from storeApproval.ts here
// would create an import cycle (storeApproval imports this file's senders).
import { STORE_STATUS } from "@/lib/storeStatus";

const ADMIN_QUEUE_PATH = "/admin/approve";

interface StoreEmailParams {
  storeName: string;
  username: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  storeEmail?: string | null;
  applicantEmail?: string | null;
  reason?: string | null;
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://www.abumarketplace.shop").replace(/\/$/, "");
}

function shell(title: string, badge: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F6F3EE;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:600px;margin:0 auto;padding:24px 16px">
      <div style="background:#1A1A1A;border-radius:16px 16px 0 0;padding:28px 24px;text-align:center">
        <h1 style="margin:0;color:#F6E0B9;font-size:22px">ABU Marketplace</h1>
        <p style="margin:6px 0 0;color:#C9A96E;font-size:13px;letter-spacing:2px;text-transform:uppercase">${escapeHtml(badge)}</p>
      </div>
      <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px 24px">
        <h2 style="margin:0 0 16px;color:#1A1A1A;font-size:18px">${escapeHtml(title)}</h2>
        ${bodyHtml}
      </div>
      <div style="text-align:center;padding:16px;color:#888;font-size:12px">
        <p style="margin:0">ABU Marketplace — trusted online shopping in Sierra Leone</p>
      </div>
    </div>
  </body>
</html>`;
}

function rows(fields: [string, string | null | undefined][]): string {
  return fields
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(
      ([label, value]) => `
      <p style="margin:0 0 10px;color:#333">
        <strong style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888">${escapeHtml(label)}</strong>
        <span style="font-size:14px">${escapeHtml(value)}</span>
      </p>`
    )
    .join("");
}

// ─── New application → team ─────────────────────────────────────────────────

export function buildStoreApplicationReceivedEmail({
  storeName,
  username,
  ownerName,
  ownerEmail,
  storeEmail,
  applicantEmail,
}: StoreEmailParams): { subject: string; html: string; text: string } {
  const queueUrl = `${siteUrl()}${ADMIN_QUEUE_PATH}`;
  const body =
    `<p style="margin:0 0 16px;color:#888;font-size:13px">A seller has applied to open a store and is waiting for review.</p>` +
    rows([
      ["Store name", storeName],
      ["Store URL", `${siteUrl()}/shop/${username}`],
      ["Owner", ownerName],
      ["Owner email", ownerEmail],
      ["Store contact", storeEmail],
      ["Other email", applicantEmail],
    ]) +
    `<p style="margin:20px 0 0"><a href="${escapeHtml(queueUrl)}" style="display:inline-block;background:#EA580C;color:#fff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 24px;border-radius:999px">Review the application</a></p>`;

  return {
    subject: `[ABU Stores] New application: ${storeName}`,
    html: shell("New store application", "Store approval", body),
    text: `New store application\n\nStore: ${storeName}\nURL: ${siteUrl()}/shop/${username}\nOwner: ${ownerName || "-"}\nOwner email: ${ownerEmail || "-"}\nStore contact: ${storeEmail || "-"}\n\nReview: ${queueUrl}`,
  };
}

// ─── Decision → seller ──────────────────────────────────────────────────────

export function buildStoreDecisionEmail({
  storeName,
  username,
  decision,
  reason,
}: StoreEmailParams & { decision: "approved" | "rejected" }): {
  subject: string;
  html: string;
  text: string;
} {
  const storeUrl = `${siteUrl()}/store`;
  const shopUrl = `${siteUrl()}/shop/${username}`;

  if (decision === STORE_STATUS.APPROVED) {
    const body =
      `<p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">Good news — <strong>${escapeHtml(storeName)}</strong> is approved and live on ABU Marketplace. Buyers can find you at <a href="${escapeHtml(shopUrl)}">${escapeHtml(shopUrl)}</a>.</p>` +
      `<p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">Next: add your WhatsApp number in store settings so buyers can reach you directly, then list your first products.</p>` +
      `<p style="margin:20px 0 0"><a href="${escapeHtml(storeUrl)}" style="display:inline-block;background:#EA580C;color:#fff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 24px;border-radius:999px">Open your dashboard</a></p>`;
    return {
      subject: `Your store "${storeName}" is approved — ABU Marketplace`,
      html: shell("Your store is approved 🎉", "Approved", body),
      text: `Your store "${storeName}" is approved and live.\n\nBuyers can find you at ${shopUrl}\n\nAdd your WhatsApp number in store settings, then list your first products.\n\nDashboard: ${storeUrl}`,
    };
  }

  const body =
    `<p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">We couldn't approve <strong>${escapeHtml(storeName)}</strong> yet. Here's what to fix:</p>` +
    `<blockquote style="margin:0 0 16px;padding:12px 16px;background:#FFF7ED;border-left:4px solid #EA580C;color:#7C2D12;font-size:14px;line-height:1.6">${escapeHtml(reason || "Your application didn't meet our seller requirements.")}</blockquote>` +
    `<p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">Fix that and resubmit from the same page — your application stays on file, so you don't have to start over.</p>` +
    `<p style="margin:20px 0 0"><a href="${escapeHtml(`${siteUrl()}/create-store`)}" style="display:inline-block;background:#EA580C;color:#fff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 24px;border-radius:999px">Fix and resubmit</a></p>`;
  return {
    subject: `Action needed: your store "${storeName}" needs changes`,
    html: shell("Your store needs changes", "Action needed", body),
    text: `We couldn't approve "${storeName}" yet.\n\nWhat to fix:\n${reason || "Your application didn't meet our seller requirements."}\n\nFix that and resubmit: ${siteUrl()}/create-store`,
  };
}

// ─── Senders (best-effort — never throw) ────────────────────────────────────

async function send(
  purpose: "support" | "order",
  to: string,
  mail: { subject: string; html: string; text: string }
): Promise<boolean> {
  if (!to) return false;
  if (!process.env.RESEND_API_KEY) {
    console.warn("[storeApplicationEmail] RESEND_API_KEY is not set — skipping email.");
    return false;
  }
  try {
    await resend.emails.send({
      from: getEmailFromAddress(purpose) || to,
      to: [to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    return true;
  } catch (error) {
    console.error(
      "[storeApplicationEmail] send failed",
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}

/** Alert the team that a seller is waiting for review. */
export async function sendStoreApplicationReceivedEmail(
  params: StoreEmailParams
): Promise<boolean> {
  const to = process.env.SUPPORT_EMAIL_TO;
  if (!to) {
    console.warn("[storeApplicationEmail] SUPPORT_EMAIL_TO is not set — no admin notification sent.");
    return false;
  }
  return send("support", to, buildStoreApplicationReceivedEmail(params));
}

/** Tell the seller the outcome, including the reason on a rejection. */
export async function sendStoreDecisionEmail(
  params: StoreEmailParams & { decision: "approved" | "rejected" }
): Promise<boolean> {
  const to = params.storeEmail || params.ownerEmail || params.applicantEmail || "";
  return send("order", to, buildStoreDecisionEmail(params));
}
