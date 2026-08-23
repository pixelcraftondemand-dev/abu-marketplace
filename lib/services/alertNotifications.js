// Alert notification routing.
//
// Routes alerts to the appropriate channel based on severity tier:
//   Critical → Telegram (immediate) + email
//   High     → Email (within business hours)
//   Medium   → accumulated for daily digest
//
// Uses Resend (already in stack) for email. Telegram via webhook URL.

import { resend } from "@/lib/resend.js";
import { getEmailFromAddress, escapeHtml } from "@/lib/emailUtils.js";

// ─── Telegram ────────────────────────────────────────────────────────────────

/**
 * Send a Telegram message via webhook.
 * Requires TELEGRAM_ALERT_WEBHOOK_URL env var.
 */
async function sendTelegram(message) {
  const webhookUrl = process.env.TELEGRAM_ALERT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[monitoring] TELEGRAM_ALERT_WEBHOOK_URL not set — skipping Telegram notification");
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      console.error("[monitoring] Telegram send failed:", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[monitoring] Telegram send error:", error.message);
    return false;
  }
}

// ─── Email ───────────────────────────────────────────────────────────────────

/**
 * Send an alert email via Resend.
 */
async function sendAlertEmail({ subject, html, text }) {
  const toAddress = process.env.MONITORING_EMAIL_TO;
  if (!toAddress) {
    console.warn("[monitoring] MONITORING_EMAIL_TO not set — skipping email notification");
    return false;
  }

  try {
    await resend.emails.send({
      from: getEmailFromAddress("support"),
      to: [toAddress],
      subject,
      html,
      text,
    });
    return true;
  } catch (error) {
    console.error("[monitoring] Email send error:", error.message);
    return false;
  }
}

// ─── HTML email builder ──────────────────────────────────────────────────────

function buildAlertEmailHtml({ tier, metric, message, actualValue, threshold, context }) {
  const tierColors = {
    critical: { bg: "#FEF2F2", border: "#EF4444", badge: "#DC2626", label: "CRITICAL" },
    high: { bg: "#FFF7ED", border: "#F97316", badge: "#EA580C", label: "HIGH" },
    medium: { bg: "#EFF6FF", border: "#3B82F6", badge: "#2563EB", label: "MEDIUM" },
  };
  const tc = tierColors[tier] || tierColors.medium;

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F6F3EE;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <div style="background:#1A1A1A;border-radius:16px 16px 0 0;padding:28px 24px;text-align:center">
      <h1 style="margin:0;color:#F6E0B9;font-size:22px">ABU Marketplace</h1>
      <p style="margin:6px 0 0;color:${tc.badge};font-size:13px;letter-spacing:2px;text-transform:uppercase">${tc.label} Alert</p>
    </div>
    <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px 24px">
      <div style="background:${tc.bg};border-left:4px solid ${tc.border};border-radius:8px;padding:16px;margin-bottom:20px">
        <p style="margin:0;font-size:15px;color:#333;line-height:1.6">${escapeHtml(message)}</p>
      </div>
      <table style="width:100%;font-size:13px;color:#555;border-collapse:collapse">
        <tr>
          <td style="padding:8px 0;font-weight:bold;color:#333;width:120px">Metric</td>
          <td style="padding:8px 0">${escapeHtml(metric)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:bold;color:#333">Current Value</td>
          <td style="padding:8px 0">${escapeHtml(String(actualValue))}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:bold;color:#333">Threshold</td>
          <td style="padding:8px 0">${escapeHtml(String(threshold))}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:bold;color:#333">Severity</td>
          <td style="padding:8px 0"><span style="background:${tc.badge};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;text-transform:uppercase">${tc.label}</span></td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-weight:bold;color:#333">Time</td>
          <td style="padding:8px 0">${escapeHtml(new Date().toLocaleString("en-US", { timeZone: "Africa/Freetown", dateStyle: "full", timeStyle: "short" }))}</td>
        </tr>
      </table>
      ${context ? `<div style="background:#F9F6F2;border-radius:8px;padding:12px;margin-top:16px;font-size:12px;color:#666"><strong>Context:</strong> ${escapeHtml(JSON.stringify(context, null, 0).slice(0, 500))}</div>` : ""}
      <div style="border-top:1px solid #EEE;padding-top:16px;margin-top:16px;font-size:12px;color:#888;text-align:center">
        <p style="margin:0">ABU Marketplace Monitoring — automated alert</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildAlertEmailText({ tier, metric, message, actualValue, threshold }) {
  return `ABU Marketplace — ${tier.toUpperCase()} Alert

${message}

Metric: ${metric}
Current Value: ${actualValue}
Threshold: ${threshold}
Time: ${new Date().toISOString()}

ABU Marketplace Monitoring — automated alert`;
}

// ─── Digest builder ──────────────────────────────────────────────────────────

/**
 * Build a daily digest email from accumulated medium-tier alerts.
 */
export function buildDigestEmailHtml(alerts) {
  if (!alerts || alerts.length === 0) {
    return `<p>No medium-tier alerts in the last 24 hours.</p>`;
  }

  const rows = alerts
    .map(
      (a) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #EEE;font-size:13px;color:#333">${escapeHtml(a.metric)}</td>
      <td style="padding:8px;border-bottom:1px solid #EEE;font-size:13px;color:#555">${escapeHtml(String(a.actualValue))}</td>
      <td style="padding:8px;border-bottom:1px solid #EEE;font-size:13px;color:#555">${escapeHtml(a.message)}</td>
      <td style="padding:8px;border-bottom:1px solid #EEE;font-size:12px;color:#888">${escapeHtml(new Date(a.firedAt).toLocaleString("en-US", { timeZone: "Africa/Freetown" }))}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F6F3EE;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:700px;margin:0 auto;padding:24px 16px">
    <div style="background:#1A1A1A;border-radius:16px 16px 0 0;padding:28px 24px;text-align:center">
      <h1 style="margin:0;color:#F6E0B9;font-size:22px">ABU Marketplace</h1>
      <p style="margin:6px 0 0;color:#3B82F6;font-size:13px;letter-spacing:2px;text-transform:uppercase">Daily Monitoring Digest</p>
    </div>
    <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px 24px">
      <p style="margin:0 0 16px;font-size:14px;color:#555">${alerts.length} medium-tier alert(s) in the last 24 hours:</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#F9F6F2">
            <th style="padding:8px;text-align:left;font-size:12px;color:#666">Metric</th>
            <th style="padding:8px;text-align:left;font-size:12px;color:#666">Value</th>
            <th style="padding:8px;text-align:left;font-size:12px;color:#666">Message</th>
            <th style="padding:8px;text-align:left;font-size:12px;color:#666">Time</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="border-top:1px solid #EEE;padding-top:16px;margin-top:16px;font-size:12px;color:#888;text-align:center">
        <p style="margin:0">ABU Marketplace Monitoring — daily digest</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Route alert to appropriate channel ──────────────────────────────────────

/**
 * Route an alert to the right notification channel based on tier.
 * Critical = Telegram + Email immediately
 * High = Email immediately
 * Medium = accumulated for digest (not sent in real-time)
 *
 * @param {object} params
 * @param {string} params.metric
 * @param {string} params.tier - "critical" | "high" | "medium"
 * @param {string} params.message
 * @param {number} params.actualValue
 * @param {number} params.threshold
 * @param {object} params.context
 */
export async function routeAlert({ metric, tier, message, actualValue, threshold, context }) {
  const dashboardUrl = process.env.MONITORING_DASHBOARD_URL || "https://www.abumarketplace.shop/admin/monitoring";

  const enrichedContext = {
    ...context,
    dashboardUrl,
    firedAt: new Date().toISOString(),
  };

  switch (tier) {
    case "critical": {
      // Telegram (immediate paging)
      const telegramMsg = `🚨 <b>CRITICAL ALERT</b>\n\n${escapeHtml(message)}\n\nMetric: ${escapeHtml(metric)}\nValue: ${actualValue}\nThreshold: ${threshold}\n\n<a href="${dashboardUrl}">View Dashboard</a>`;
      await sendTelegram(telegramMsg);

      // Email
      await sendAlertEmail({
        subject: `[CRITICAL] ${metric} — ABU Marketplace Monitoring`,
        html: buildAlertEmailHtml({ tier, metric, message, actualValue, threshold, context: enrichedContext }),
        text: buildAlertEmailText({ tier, metric, message, actualValue, threshold }),
      });
      break;
    }

    case "high": {
      // Email
      await sendAlertEmail({
        subject: `[HIGH] ${metric} — ABU Marketplace Monitoring`,
        html: buildAlertEmailHtml({ tier, metric, message, actualValue, threshold, context: enrichedContext }),
        text: buildAlertEmailText({ tier, metric, message, actualValue, threshold }),
      });
      break;
    }

    case "medium": {
      // Medium alerts are NOT sent immediately — they accumulate for the daily digest.
      // The digest cron job queries AlertLog for medium alerts in the last 24 hours
      // and sends a summary email.
      break;
    }

    default:
      console.warn(`[monitoring] Unknown alert tier: ${tier}`);
  }
}
