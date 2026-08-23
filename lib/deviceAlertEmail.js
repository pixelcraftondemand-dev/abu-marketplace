import { resend } from "@/lib/resend";
import { escapeHtml, getEmailFromAddress } from "@/lib/emailUtils";

const SUBJECT = "New sign-in detected — ABU Marketplace";

function buildHtml({ email, deviceInfo, timestamp }) {
  const ua = escapeHtml(deviceInfo.userAgent || "Unknown browser");
  const platform = escapeHtml(deviceInfo.platform || "Unknown");
  const timezone = escapeHtml(deviceInfo.timezone || "Unknown");
  const screen = escapeHtml(deviceInfo.screen || "Unknown");
  const time = escapeHtml(
    timestamp ||
      new Date().toLocaleString("en-US", {
        timeZone: "Africa/Freetown",
        dateStyle: "full",
        timeStyle: "short",
      })
  );

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F6F3EE;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:600px;margin:0 auto;padding:24px 16px">
      <div style="background:#1A1A1A;border-radius:16px 16px 0 0;padding:28px 24px;text-align:center">
        <h1 style="margin:0;color:#F6E0B9;font-size:22px">ABU Marketplace</h1>
        <p style="margin:6px 0 0;color:#E05252;font-size:13px;letter-spacing:2px;text-transform:uppercase">Security Alert</p>
      </div>
      <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px 24px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;width:48px;height:48px;border-radius:50%;background:#FEF2F2;line-height:48px;font-size:24px">⚠️</div>
        </div>
        <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">
          A sign-in to your ABU Marketplace account was detected from a <strong>device we don't recognize</strong>.
        </p>
        <div style="background:#F9F6F2;border-radius:12px;padding:16px;margin:16px 0;font-size:13px;color:#555;line-height:1.8">
          <strong style="color:#333">Account:</strong> ${escapeHtml(email)}<br>
          <strong style="color:#333">Time:</strong> ${time}<br>
          <strong style="color:#333">Platform:</strong> ${platform}<br>
          <strong style="color:#333">Screen:</strong> ${screen}<br>
          <strong style="color:#333">Timezone:</strong> ${timezone}<br>
          <strong style="color:#333">Browser:</strong> <span style="word-break:break-all">${ua}</span>
        </div>
        <div style="border-top:1px solid #EEE;padding-top:16px;margin-top:16px;font-size:13px;color:#666;line-height:1.6">
          <p style="margin:0 0 8px"><strong style="color:#333">If this was you</strong> — no action needed. Your account is secure.</p>
          <p style="margin:0"><strong style="color:#333">If this wasn't you</strong> — change your passwords immediately and contact our support team at <a href="mailto:abumarketplace.shop@gmail.com" style="color:#C9A96E">abumarketplace.shop@gmail.com</a>.</p>
        </div>
      </div>
      <div style="text-align:center;padding:16px;color:#888;font-size:12px">
        <p style="margin:0">ABU Marketplace — halal-certified African marketplace</p>
      </div>
    </div>
  </body>
</html>`;
}

function buildText({ email, deviceInfo, timestamp }) {
  return `ABU Marketplace — Security Alert

A sign-in to your account was detected from a device we don't recognize.

Account: ${email}
Time: ${timestamp || new Date().toISOString()}
Platform: ${deviceInfo.platform || "Unknown"}
Screen: ${deviceInfo.screen || "Unknown"}
Timezone: ${deviceInfo.timezone || "Unknown"}
Browser: ${deviceInfo.userAgent || "Unknown"}

If this was you — no action needed. Your account is secure.
If this wasn't you — change your passwords immediately and contact support at abumarketplace.shop@gmail.com.

ABU Marketplace — halal-certified African marketplace`;
}

/**
 * Send a security alert email when a sign-in happens from an unrecognized device.
 */
export async function sendNewDeviceAlert({ email, deviceInfo, timestamp }) {
  if (!email || !deviceInfo) {
    throw new Error("sendNewDeviceAlert requires email and deviceInfo.");
  }

  await resend.emails.send({
    from: getEmailFromAddress("verification"),
    to: [email],
    subject: SUBJECT,
    html: buildHtml({ email, deviceInfo, timestamp }),
    text: buildText({ email, deviceInfo, timestamp }),
  });
}
