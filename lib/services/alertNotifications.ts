// Alert notification routing.
import { resend } from "@/lib/resend";
import { getEmailFromAddress, escapeHtml } from "@/lib/emailUtils";

async function sendTelegram(message: string): Promise<boolean> {
  const webhookUrl = process.env.TELEGRAM_ALERT_WEBHOOK_URL;
  if (!webhookUrl) { console.warn("[monitoring] TELEGRAM_ALERT_WEBHOOK_URL not set"); return false; }
  try {
    const response = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: message, parse_mode: "HTML" }) });
    if (!response.ok) { console.error("[monitoring] Telegram send failed:", response.status); return false; }
    return true;
  } catch (error) { console.error("[monitoring] Telegram send error:", (error as Error).message); return false; }
}

export async function sendAlertEmail({ subject, html, text }: { subject: string; html: string; text: string }): Promise<boolean> {
  const toAddress = process.env.MONITORING_EMAIL_TO;
  if (!toAddress) { console.warn("[monitoring] MONITORING_EMAIL_TO not set"); return false; }
  try { await resend.emails.send({ from: getEmailFromAddress("support"), to: [toAddress], subject, html, text }); return true; } catch (error) { console.error("[monitoring] Email send error:", (error as Error).message); return false; }
}

function buildAlertEmailHtml({ tier, metric, message, actualValue, threshold, context }: { tier: string; metric: string; message: string; actualValue: number; threshold: number; context?: Record<string, unknown> }): string {
  const tierColors: Record<string, { bg: string; border: string; badge: string; label: string }> = { critical: { bg: "#FEF2F2", border: "#EF4444", badge: "#DC2626", label: "CRITICAL" }, high: { bg: "#FFF7ED", border: "#F97316", badge: "#EA580C", label: "HIGH" }, medium: { bg: "#EFF6FF", border: "#3B82F6", badge: "#2563EB", label: "MEDIUM" } };
  const tc = tierColors[tier] || tierColors.medium;
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F6F3EE;font-family:Arial,Helvetica,sans-serif"><div style="max-width:600px;margin:0 auto;padding:24px 16px"><div style="background:#1A1A1A;border-radius:16px 16px 0 0;padding:28px 24px;text-align:center"><h1 style="margin:0;color:#F6E0B9;font-size:22px">ABU Marketplace</h1><p style="margin:6px 0 0;color:${tc.badge};font-size:13px;letter-spacing:2px;text-transform:uppercase">${tc.label} Alert</p></div><div style="background:#fff;border-radius:0 0 16px 16px;padding:28px 24px"><div style="background:${tc.bg};border-left:4px solid ${tc.border};border-radius:8px;padding:16px;margin-bottom:20px"><p style="margin:0;font-size:15px;color:#333;line-height:1.6">${escapeHtml(message)}</p></div><table style="width:100%;font-size:13px;color:#555;border-collapse:collapse"><tr><td style="padding:8px 0;font-weight:bold;color:#333;width:120px">Metric</td><td style="padding:8px 0">${escapeHtml(metric)}</td></tr><tr><td style="padding:8px 0;font-weight:bold;color:#333">Current Value</td><td style="padding:8px 0">${escapeHtml(String(actualValue))}</td></tr><tr><td style="padding:8px 0;font-weight:bold;color:#333">Threshold</td><td style="padding:8px 0">${escapeHtml(String(threshold))}</td></tr></table></div></div></body></html>`;
}

function buildAlertEmailText({ tier, metric, message, actualValue, threshold }: { tier: string; metric: string; message: string; actualValue: number; threshold: number }): string {
  return `ABU Marketplace — ${tier.toUpperCase()} Alert\n\n${message}\n\nMetric: ${metric}\nCurrent Value: ${actualValue}\nThreshold: ${threshold}\nTime: ${new Date().toISOString()}`;
}

interface AlertAlert { metric: string; actualValue: number; message: string; firedAt: string; }

export function buildDigestEmailHtml(alerts: AlertAlert[]): string {
  if (!alerts || alerts.length === 0) return `<p>No medium-tier alerts in the last 24 hours.</p>`;
  const rows = alerts.map((a) => `<tr><td style="padding:8px;border-bottom:1px solid #EEE;font-size:13px;color:#333">${escapeHtml(a.metric)}</td><td style="padding:8px;border-bottom:1px solid #EEE;font-size:13px;color:#555">${escapeHtml(String(a.actualValue))}</td><td style="padding:8px;border-bottom:1px solid #EEE;font-size:13px;color:#555">${escapeHtml(a.message)}</td><td style="padding:8px;border-bottom:1px solid #EEE;font-size:12px;color:#888">${escapeHtml(new Date(a.firedAt).toLocaleString("en-US", { timeZone: "Africa/Freetown" }))}</td></tr>`).join("");
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F6F3EE;font-family:Arial,Helvetica,sans-serif"><div style="max-width:700px;margin:0 auto;padding:24px 16px"><div style="background:#1A1A1A;border-radius:16px 16px 0 0;padding:28px 24px;text-align:center"><h1 style="margin:0;color:#F6E0B9;font-size:22px">ABU Marketplace</h1><p style="margin:6px 0 0;color:#3B82F6;font-size:13px;letter-spacing:2px;text-transform:uppercase">Daily Monitoring Digest</p></div><div style="background:#fff;border-radius:0 0 16px 16px;padding:28px 24px"><p style="margin:0 0 16px;font-size:14px;color:#555">${alerts.length} medium-tier alert(s) in the last 24 hours:</p><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#F9F6F2"><th style="padding:8px;text-align:left;font-size:12px;color:#666">Metric</th><th style="padding:8px;text-align:left;font-size:12px;color:#666">Value</th><th style="padding:8px;text-align:left;font-size:12px;color:#666">Message</th><th style="padding:8px;text-align:left;font-size:12px;color:#666">Time</th></tr></thead><tbody>${rows}</tbody></table></div></div></body></html>`;
}

interface RouteAlertParams { metric: string; tier: string; message: string; actualValue: number; threshold: number; context?: Record<string, unknown>; }

export async function routeAlert({ metric, tier, message, actualValue, threshold, context }: RouteAlertParams): Promise<void> {
  const dashboardUrl = process.env.MONITORING_DASHBOARD_URL || "https://www.abumarketplace.shop/admin/monitoring";
  const enrichedContext = { ...context, dashboardUrl, firedAt: new Date().toISOString() };
  switch (tier) {
    case "critical": {
      const telegramMsg = `🚨 <b>CRITICAL ALERT</b>\n\n${escapeHtml(message)}\n\nMetric: ${escapeHtml(metric)}\nValue: ${actualValue}\nThreshold: ${threshold}\n\n<a href="${dashboardUrl}">View Dashboard</a>`;
      await sendTelegram(telegramMsg);
      await sendAlertEmail({ subject: `[CRITICAL] ${metric} — ABU Marketplace Monitoring`, html: buildAlertEmailHtml({ tier, metric, message, actualValue, threshold, context: enrichedContext }), text: buildAlertEmailText({ tier, metric, message, actualValue, threshold }) });
      break;
    }
    case "high": {
      await sendAlertEmail({ subject: `[HIGH] ${metric} — ABU Marketplace Monitoring`, html: buildAlertEmailHtml({ tier, metric, message, actualValue, threshold, context: enrichedContext }), text: buildAlertEmailText({ tier, metric, message, actualValue, threshold }) });
      break;
    }
    case "medium": break;
    default: console.warn(`[monitoring] Unknown alert tier: ${tier}`);
  }
}
