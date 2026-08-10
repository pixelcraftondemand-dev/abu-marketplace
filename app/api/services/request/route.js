import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { getEmailFromAddress } from "@/lib/emailUtils";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { serviceRequestRateLimiter, sanitizeText } from "@/lib/security";
import { buildHireRequestEmail } from "@/lib/servicesEmail";
import { allTrades } from "@/lib/servicesData";

const MAX_DETAILS = 2000;

export async function POST(request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const session = await getSessionFromRequest();
    const userId = session?.user?.id || null;
    const rl = await serviceRequestRateLimiter.check(userId || ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const name = sanitizeText(body.name, 100);
    const phone = sanitizeText(body.phone, 40);
    const email = sanitizeText(body.email, 160);
    const location = sanitizeText(body.location, 120);
    const trade = sanitizeText(body.trade, 80);
    const jobDate = sanitizeText(body.jobDate, 60);
    const details = sanitizeText(body.details, MAX_DETAILS);

    if (!name || !phone || !location || !trade) {
      return NextResponse.json(
        { error: "Name, phone, location, and trade are required." },
        { status: 400 }
      );
    }
    // Restrict trade to a known directory trade (defends the email subject line).
    if (!allTrades.includes(trade)) {
      return NextResponse.json({ error: "Unknown trade." }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Email service is not configured." }, { status: 500 });
    }

    const supportEmail = process.env.SUPPORT_EMAIL_TO;
    if (!supportEmail) {
      return NextResponse.json({ error: "Support email destination is not configured." }, { status: 500 });
    }

    const from = getEmailFromAddress("support") || supportEmail;
    const mail = buildHireRequestEmail({ name, phone, email, location, trade, jobDate, details });

    await resend.emails.send({
      from,
      to: [supportEmail],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[services/request]", error);
    return NextResponse.json({ error: "Unable to submit your request. Please try again." }, { status: 500 });
  }
}
