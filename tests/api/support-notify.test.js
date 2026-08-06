import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import { hashAccessToken, supportNotifyRateLimiter } from "@/lib/security";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { POST } from "@/app/api/support/notify/route";

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: mockSend } },
}));

vi.mock("@/lib/serverAuth", () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    supportTicket: { findUnique: vi.fn(), update: vi.fn() },
    supportMessage: { create: vi.fn() },
  },
}));

const SUPPORT_EMAIL_TO = "support@abumarketplace.shop";
const SUPPORT_EMAIL_FROM = "ABU Marketplace <noreply@abumarketplace.shop>";

const ticket = {
  id: "ticket_1",
  userId: "usr_1",
  accessTokenHash: hashAccessToken("tok_secret_1"),
  subject: "Refund question",
  messages: [
    { sender: "user", content: "I need a refund" },
    { sender: "admin", content: "We are looking into it" },
  ],
};

function buildRequest(body) {
  return new Request("http://localhost:3000/api/support/notify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("support notify POST", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("SUPPORT_EMAIL_TO", SUPPORT_EMAIL_TO);
    vi.stubEnv("SUPPORT_EMAIL_FROM", SUPPORT_EMAIL_FROM);
    vi.resetAllMocks();
    supportNotifyRateLimiter._clear();
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_1" } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 400 when ticketId or message is missing", async () => {
    const res = await POST(buildRequest({ message: "hello" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing ticketId" });
  });

  it("returns 403 when the caller does not own the ticket (IDOR guard)", async () => {
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_attacker" } });
    prisma.supportTicket.findUnique.mockResolvedValue(ticket);
    const res = await POST(buildRequest({ ticketId: "ticket_1", message: "hello" }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Not authorized to escalate this ticket." });
    expect(prisma.supportMessage.create).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 404 when the ticket does not exist", async () => {
    prisma.supportTicket.findUnique.mockResolvedValue(null);
    const res = await POST(buildRequest({ ticketId: "ticket_1", message: "hello" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Ticket not found" });
  });

  it("returns 500 when the support destination email is not configured", async () => {
    vi.stubEnv("SUPPORT_EMAIL_TO", "");
    prisma.supportTicket.findUnique.mockResolvedValue(ticket);
    const res = await POST(buildRequest({ ticketId: "ticket_1", message: "hello", accessToken: "tok_secret_1" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Support email destination is not configured" });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("persists the message, sends via Resend, and escalates the ticket", async () => {
    prisma.supportTicket.findUnique.mockResolvedValue(ticket);
    mockSend.mockResolvedValue({ data: { id: "email_1" } });

    const res = await POST(buildRequest({ ticketId: "ticket_1", message: "hello there", accessToken: "tok_secret_1" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    expect(prisma.supportMessage.create).toHaveBeenCalledWith({
      data: { ticketId: "ticket_1", sender: "user", content: "hello there" },
    });
    expect(mockSend).toHaveBeenCalledWith({
      from: SUPPORT_EMAIL_FROM,
      to: [SUPPORT_EMAIL_TO],
      subject: "[ABU Support] Refund question",
      text: expect.stringContaining("hello there"),
    });
    const sendArg = mockSend.mock.calls[0][0];
    expect(sendArg.text).toContain("ticket_1");
    expect(sendArg.text).toContain("USER: I need a refund");
    expect(sendArg.text).toContain("ADMIN: We are looking into it");
    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: "ticket_1" },
      data: { status: "escalated" },
    });
  });

  it("falls back to the support email as the from-address when SUPPORT_EMAIL_FROM is unset", async () => {
    vi.stubEnv("SUPPORT_EMAIL_FROM", "");
    prisma.supportTicket.findUnique.mockResolvedValue(ticket);
    mockSend.mockResolvedValue({ data: { id: "email_1" } });

    const res = await POST(buildRequest({ ticketId: "ticket_1", message: "hello", accessToken: "tok_secret_1" }));
    expect(res.status).toBe(200);
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ from: SUPPORT_EMAIL_TO }));
  });

  it("returns 500 when the email send fails", async () => {
    prisma.supportTicket.findUnique.mockResolvedValue(ticket);
    mockSend.mockRejectedValue(new Error("domain not verified"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(buildRequest({ ticketId: "ticket_1", message: "hello", accessToken: "tok_secret_1" }));
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "Unable to escalate support" });
      expect(prisma.supportTicket.update).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
