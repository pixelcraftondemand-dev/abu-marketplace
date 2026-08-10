import { escapeHtml } from "@/lib/emailUtils";

/**
 * Shared HTML shell for ABU Marketplace service-notification emails
 * (hire requests and worker self-listings). All dynamic content is escaped.
 */
function emailShell({ title, badge, bodyHtml }) {
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
        <p style="margin:0">ABU Marketplace — hire skilled workers at abumarketplace.shop/services</p>
      </div>
    </div>
  </body>
</html>`;
}

function fieldRows(fields) {
  return fields
    .map(
      ([label, value]) => `
      <p style="margin:0 0 10px;color:#333">
        <strong style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888">${escapeHtml(label)}</strong>
        <span style="font-size:14px">${escapeHtml(value)}</span>
      </p>`
    )
    .join("");
}

/** Builds the "hire request" email (buyer → team). */
export function buildHireRequestEmail({ name, phone, email, location, trade, jobDate, details }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;color:#888;font-size:13px">A customer is looking for a worker. Details:</p>
    ${fieldRows([
      ["Customer name", name],
      ["Phone", phone],
      ["Email", email],
      ["Location", location],
      ["Trade needed", trade],
      ["When needed", jobDate],
      ["Job details", details],
    ])}`;
  return {
    subject: `[ABU For Hire] Request: ${trade || "Skilled worker"}`,
    html: emailShell({ title: "New hire request", badge: "For Hire", bodyHtml }),
    text: `New hire request:\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nLocation: ${location}\nTrade: ${trade}\nWhen: ${jobDate}\n\nDetails:\n${details}`,
  };
}

/** Builds the "worker self-listing" email (worker → team). */
export function buildWorkerListingEmail({ name, phone, email, trade, location, experience, hourlyRate, bio }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;color:#888;font-size:13px">A skilled worker wants to be listed in the For Hire directory:</p>
    ${fieldRows([
      ["Worker name", name],
      ["Phone", phone],
      ["Email", email],
      ["Trade", trade],
      ["Location", location],
      ["Experience", experience],
      ["Hourly rate", hourlyRate],
      ["Bio", bio],
    ])}`;
  return {
    subject: `[ABU For Hire] New worker listing: ${trade || "Skilled worker"}`,
    html: emailShell({ title: "New worker listing", badge: "For Hire", bodyHtml }),
    text: `New worker listing:\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nTrade: ${trade}\nLocation: ${location}\nExperience: ${experience}\nHourly rate: ${hourlyRate}\n\nBio:\n${bio}`,
  };
}
