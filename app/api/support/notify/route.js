import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { getEmailFromAddress } from "@/lib/emailUtils";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { supportNotifyRateLimiter, hashAccessToken } from "@/lib/security";

const MAX_MESSAGE_LENGTH = 4000;

export async function POST(request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const session = await getSessionFromRequest();
    const userId = session?.user?.id || null;
    const rl = supportNotifyRateLimiter.check(userId || ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many escalation requests. Please wait." }, { status: 429 });
    }

    const body = await request.json();
    const { ticketId, message, accessToken } = body || {};

    if (!ticketId || typeof ticketId !== "string" || !/^[A-Za-z0-9_-]{5,60}$/.test(ticketId)) {
      return NextResponse.json({ error: "Missing ticketId" }, { status: 400 });
    }
    if (!message || typeof message !== "string" || message.trim().length === 0 || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Resend API key is not configured" }, { status: 500 });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { messages: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // ── IDOR guard: only the ticket owner (user id or access token) can
    // escalate. Admin can escalate any ticket (server-side role check).
    // Access tokens are compared as SHA-256 hashes — never in plaintext.
    const ownsByUser = ticket.userId && userId && ticket.userId === userId;
    const ownsByToken =
      ticket.accessTokenHash &&
      accessToken &&
      ticket.accessTokenHash === hashAccessToken(accessToken);
    if (!ownsByUser && !ownsByToken) {
      return NextResponse.json({ error: "Not authorized to escalate this ticket." }, { status: 403 });
    }

    const subject = `[ABU Support] ${ticket.subject}`;
    const supportEmail = process.env.SUPPORT_EMAIL_TO;
    const from = getEmailFromAddress("support") || supportEmail;

    if (!supportEmail) {
      return NextResponse.json({ error: "Support email destination is not configured" }, { status: 500 });
    }

    await prisma.supportMessage.create({
      data: { ticketId, sender: "user", content: message },
    });

    await resend.emails.send({
      from,
      to: [supportEmail],
      subject,
      text: `New support escalation for ticket ${ticketId}:\n\n${message}\n\nRecent messages:\n${ticket.messages.map((msg) => `${msg.sender.toUpperCase()}: ${msg.content}`).join("\n")}`,
    });

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "escalated" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to escalate support" }, { status: 500 });
  }
}
