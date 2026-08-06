import { getOpenAI } from "@/configs/openai";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { supportAIRateLimiter, hashAccessToken } from "@/lib/security";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 20;

export async function POST(request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const session = await getSessionFromRequest();
    const userId = session?.user?.id || null;
    const rl = supportAIRateLimiter.check(userId || ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many messages. Please wait a moment." }, { status: 429 });
    }

    const body = await request.json();
    const { message, history = [], ticketId: providedTicketId, accessToken, subject } = body || {};

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message is too long." }, { status: 422 });
    }
    if (!Array.isArray(history) || history.length > MAX_HISTORY) {
      return NextResponse.json({ error: "Invalid history." }, { status: 422 });
    }
    if (typeof accessToken !== "string" && accessToken != null) {
      return NextResponse.json({ error: "Invalid access token." }, { status: 422 });
    }

    let ticketId = providedTicketId;
    let ticketAccessToken = typeof accessToken === "string" ? accessToken : null;
    if (ticketId) {
      if (typeof ticketId !== "string" || !/^[A-Za-z0-9_-]{5,60}$/.test(ticketId)) {
        return NextResponse.json({ error: "Invalid ticket id." }, { status: 422 });
      }
      // ── IDOR guard ───────────────────────────────────────────────────────
      // The chat client binds to a ticket with a random access token. Without
      // a matching token (and, for owned tickets, a matching user), the ticket
      // is never touched — another user's conversation cannot be read or
      // polluted by guessing a ticket id.
      const existing = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        select: { id: true, userId: true, accessTokenHash: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
      }
      const ownsByUser = existing.userId && userId && existing.userId === userId;
      // Tokens are compared as SHA-256 hashes — the raw credential is never
      // stored or logged, so a DB dump cannot be replayed as a live token.
      const ownsByToken =
        existing.accessTokenHash &&
        accessToken &&
        existing.accessTokenHash === hashAccessToken(accessToken);
      if (!ownsByUser && !ownsByToken) {
        return NextResponse.json({ error: "Not authorized to access this ticket." }, { status: 403 });
      }
    } else {
      // New ticket: issue a random bearer access token returned to the client.
      // Only its SHA-256 hash is persisted — the raw token exists solely in the
      // client's in-memory state and in the response below.
      const crypto = await import("node:crypto");
      const token = crypto.randomBytes(32).toString("base64url");
      const ticket = await prisma.supportTicket.create({
        data: {
          userId,
          subject: subject || (message.length > 120 ? message.substring(0, 117) + "..." : message),
          accessTokenHash: hashAccessToken(token),
        },
      });
      ticketId = ticket.id;
      ticketAccessToken = token;
    }

    // Log user message
    await prisma.supportMessage.create({
      data: { ticketId, sender: "user", content: message },
    });

    const openai = getOpenAI();

    const systemPrompt = `You are ABU, a friendly and professional customer support assistant for ABU Marketplace. Always be concise, helpful, and polite. Identify yourself as "ABU" when helpful, and offer next steps (actions, links, or how to contact human support) when a customer asks for help beyond your scope.`;

    const sanitizedHistory = history
      .filter((h) => h && typeof h === "object" && typeof h.content === "string")
      .slice(-MAX_HISTORY)
      .map((h) => ({
        role: h.role === "assistant" ? "assistant" : "user",
        content: String(h.content).slice(0, MAX_MESSAGE_LENGTH),
      }));

    const messages = [
      { role: "system", content: systemPrompt },
      ...sanitizedHistory,
      { role: "user", content: message },
    ];

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      max_tokens: 600,
    });

    const reply = response.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    // Save ABU reply
    try {
      await prisma.supportMessage.create({ data: { ticketId, sender: "abu", content: reply } });
    } catch (e) {
      console.error("Failed to save support message", e);
    }

    return NextResponse.json({ reply, ticketId, accessToken: ticketAccessToken });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Unable to process message" }, { status: 500 });
  }
}
