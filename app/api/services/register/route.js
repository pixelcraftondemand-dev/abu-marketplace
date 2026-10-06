import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { getEmailFromAddress } from "@/lib/emailUtils";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { serviceRegisterRateLimiter, sanitizeText } from "@/lib/security";
import { buildWorkerListingEmail } from "@/lib/servicesEmail";
import { allTrades } from "@/lib/servicesData";

const MAX_DETAILS = 2000;

export async function POST(request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const session = await getSessionFromRequest();
    const userId = session?.user?.id || null;
    const rl = await serviceRegisterRateLimiter.check(userId || ip);
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
    const trade = sanitizeText(body.trade, 80);
    const location = sanitizeText(body.location, 120);
    const experience = sanitizeText(body.experience, 60);
    const hourlyRate = sanitizeText(body.hourlyRate, 40);
    const bio = sanitizeText(body.bio, MAX_DETAILS);

    if (!name || !phone || !email || !trade || !location) {
      return NextResponse.json(
        { error: "Name, phone, email, trade, and location are required." },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    if (bio.length > MAX_DETAILS) {
      return NextResponse.json({ error: "Bio is too long." }, { status: 400 });
    }
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
    const mail = buildWorkerListingEmail({ name, phone, email, trade, location, experience, hourlyRate, bio });

    await resend.emails.send({
      from,
      to: [supportEmail],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[services/register]", error);
    return NextResponse.json({ error: "Unable to submit your listing. Please try again." }, { status: 500 });
  }
}
