import { getOpenAI } from "@/configs/openai";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { supportAIRateLimiter, hashAccessToken } from "@/lib/security";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 20;

/**
 * Build the system prompt for ABU.
 *
 * When a signed-in shopper's account context was loaded, ABU gets a compact
 * summary of their real orders, wallet balance, and membership so it can
 * answer "track my order", "what's my balance", etc. from facts. Guests get
 * the generic prompt (with a nudge to sign in for account-specific help).
 */
function buildSystemPrompt(accountContext) {
  const base =
    'You are ABU, a friendly and professional customer support assistant for ABU Marketplace. ' +
    'Always be concise, helpful, and polite. Identify yourself as "ABU" when helpful, and offer ' +
    'next steps (actions, links, or how to contact human support) when a customer asks for help ' +
    'beyond your scope.';

  if (!accountContext || !accountContext.orders) {
    return (
      base +
      ' The customer is browsing as a guest (not signed in), so you do not have access to their ' +
      'account. If they ask about an order or wallet balance, explain they need to sign in first.'
    );
  }

  const { orders, wallet } = accountContext;
  const lines = [];

  if (orders.length > 0) {
    lines.push("The customer's recent orders (newest first):");
    for (const order of orders) {
      const items = order.orderItems
        .map((item) => `${item.product?.name || "item"} x${item.quantity}`)
        .join(", ");
      const placed = order.createdAt ? new Date(order.createdAt).toISOString().slice(0, 10) : "recently";
      lines.push(
        `- Order ${order.id.slice(-6)} (${placed}): ${order.status}, payment ${order.paymentStatus}, ` +
          `${order.isPaid ? "paid" : "not paid"}, $${Number(order.total).toFixed(2)} — ${items}`
      );
    }
  } else {
    lines.push("The customer has no orders yet.");
  }

  if (wallet) {
    lines.push(`Wallet balance: $${Number(wallet.balance).toFixed(2)}`);
  } else {
    lines.push("The customer does not have a wallet balance recorded.");
  }

  return (
    base +
    ' The customer is signed in, and you have access to their real account data below. ' +
    'Use it to answer order-status, payment, and wallet questions accurately. ' +
    'If the data does not contain what they ask about, say you cannot see it and suggest ' +
    'checking their account page or escalating to human support. Do not invent orders, ' +
    'amounts, or statuses.' +
    "\n\nAccount context:\n" +
    lines.join("\n")
  );
}

export async function POST(request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const session = await getSessionFromRequest();
    const userId = session?.user?.id || null;
    const rl = await supportAIRateLimiter.check(userId || ip);
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

    // ── Signed-in user context ──────────────────────────────────────────────
    // When the shopper is authenticated, pull their real account data so ABU
    // answers from facts (their orders, wallet balance, membership) instead of
    // generic advice. Best-effort: if the DB query fails, fall back to the
    // generic prompt — the chat must never break because context lookup did.
    let accountContext = null;
    if (userId) {
      try {
        const [orders, wallet] = await Promise.all([
          prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              status: true,
              paymentStatus: true,
              isPaid: true,
              total: true,
              createdAt: true,
              orderItems: {
                select: { quantity: true, product: { select: { name: true } } },
              },
            },
          }),
          prisma.wallet.findUnique({ where: { userId }, select: { balance: true } }),
        ]);
        accountContext = { orders, wallet };
      } catch (error) {
        console.error("[POST /api/support/ai] account context fetch failed:", error);
      }
    }

    const openai = getOpenAI();

    const systemPrompt = buildSystemPrompt(accountContext);

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

    let response;
    try {
      response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages,
        max_tokens: 600,
      });
    } catch (aiError) {
      // The AI provider is down, rate-limited (429) or misconfigured. The chat
      // must degrade gracefully: tell the customer the assistant is unavailable
      // and point them at human support instead of a raw 500.
      const isRateLimited = aiError?.status === 429 || aiError?.status === 402;
      if (isRateLimited || aiError?.status === 401 || aiError?.status === 403) {
        console.error("[POST /api/support/ai] provider rejected the request", {
          status: aiError.status,
          message: aiError.message,
        });
        return NextResponse.json(
          {
            reply: "I'm having trouble reaching my AI provider right now (rate limit or quota). Your message was saved to our support ticket — please escalate to human support or try again in a few minutes.",
            aiUnavailable: true,
            ticketId,
            accessToken: ticketAccessToken,
          },
          { status: 503 }
        );
      }
      // Anything else (network blips, provider 5xx) — report it, do not crash.
      console.error("[POST /api/support/ai] provider error", {
        status: aiError?.status,
        message: aiError instanceof Error ? aiError.message : String(aiError),
      });
      throw aiError;
    }

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
