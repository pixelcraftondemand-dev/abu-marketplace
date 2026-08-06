import authAdmin from "@/middlewares/authAdmin";
import { getSessionFromRequest } from "@/lib/serverAuth";
import prisma from "@/lib/prisma";
import { adminSupportReplyRateLimiter } from "@/lib/security";
import { NextResponse } from "next/server";

const MAX_REPLY_LENGTH = 4000;
const TICKET_ID_PATTERN = /^[A-Za-z0-9_-]{5,60}$/;

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id;
    const isAdmin = await authAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const rl = adminSupportReplyRateLimiter.check(userId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many replies. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 60) } }
      );
    }

    let ticketId, reply;
    try {
      ({ ticketId, reply } = await request.json());
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (typeof ticketId !== "string" || !TICKET_ID_PATTERN.test(ticketId)) {
      return NextResponse.json({ error: "Invalid ticket id." }, { status: 422 });
    }
    if (typeof reply !== "string" || !reply.trim() || reply.length > MAX_REPLY_LENGTH) {
      return NextResponse.json(
        { error: `Reply must be 1-${MAX_REPLY_LENGTH} characters.` },
        { status: 422 }
      );
    }

    // Fail fast if the ticket no longer exists (never create orphan messages).
    const existing = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    await prisma.supportMessage.create({
      data: {
        ticketId,
        sender: "agent",
        content: reply.trim(),
      },
    });

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "agent_replied" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/admin/support-reply]", error);
    return NextResponse.json({ error: "Unable to send reply." }, { status: 500 });
  }
}
