import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import { hashAccessToken, supportAIRateLimiter, supportNotifyRateLimiter } from "@/lib/security";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { POST as aiPOST } from "@/app/api/support/ai/route";
import { POST as notifyPOST } from "@/app/api/support/notify/route";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@/configs/openai", () => ({
  getOpenAI: () => ({
    chat: { completions: { create: mockCreate } },
  }),
}));

vi.mock("@/lib/serverAuth", () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: vi.fn().mockResolvedValue({ data: { id: "email_1" } }) } },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    supportTicket: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    supportMessage: { create: vi.fn() },
  },
}));

function buildRequest(body, { headers = {} } = {}) {
  return new Request("http://localhost:3000/api/support", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const ticketRow = { id: "t_12345", userId: "usr_1", accessTokenHash: hashAccessToken("tok_secret_1"), status: "open", subject: "Help", messages: [] };

describe("support endpoint security", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    supportAIRateLimiter._clear();
    supportNotifyRateLimiter._clear();
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_1" } });
    mockCreate.mockResolvedValue({ choices: [{ message: { content: "ABU reply" } }] });
    prisma.supportTicket.findUnique.mockResolvedValue(ticketRow);
    prisma.supportTicket.create.mockResolvedValue({ ...ticketRow, id: "t_new" });
    prisma.supportMessage.create.mockResolvedValue({});
    vi.stubEnv("RESEND_API_KEY", "re_123");
    vi.stubEnv("SUPPORT_EMAIL_TO", "support@abumarketplace.shop");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("/api/support/ai", () => {
    it("rejects writing to another user's ticket without the access token (IDOR)", async () => {
      // Attacker is a DIFFERENT user than the ticket owner and has no token.
      getSessionFromRequest.mockResolvedValue({ user: { id: "usr_attacker" } });
      const res = await aiPOST(
        buildRequest({ message: "pollute", ticketId: "t_12345" })
      );
      expect(res.status).toBe(403);
      expect(prisma.supportMessage.create).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("allows the owner (authenticated user) to continue their ticket", async () => {
      const res = await aiPOST(
        buildRequest({ message: "follow up", ticketId: "t_12345" })
      );
      expect(res.status).toBe(200);
      expect(prisma.supportMessage.create).toHaveBeenCalled();
    });

    it("allows the owner (access token) to continue an anonymous ticket", async () => {
      getSessionFromRequest.mockResolvedValue({ user: { id: null } });
      const res = await aiPOST(
        buildRequest({ message: "hi", ticketId: "t_12345", accessToken: "tok_secret_1" })
      );
      expect(res.status).toBe(200);
    });

    it("rejects an unknown ticketId", async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(null);
      const res = await aiPOST(
        buildRequest({ message: "hi", ticketId: "t_nope" })
      );
      expect(res.status).toBe(404);
    });

    it("issues a fresh ticket with a random access token when none is provided", async () => {
      const res = await aiPOST(buildRequest({ message: "hello" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ticketId).toBe("t_new");
      expect(json.accessToken).toBeTruthy();
      const created = prisma.supportTicket.create.mock.calls[0][0].data;
      // Only the SHA-256 hash is persisted — never the raw credential.
      expect(created.accessTokenHash).toBe(hashAccessToken(json.accessToken));
      expect(created.accessToken).toBeUndefined();
      expect(json.accessToken.length).toBeGreaterThanOrEqual(32);
    });

    it("rejects a valid ticket id but wrong access token (hash mismatch)", async () => {
      getSessionFromRequest.mockResolvedValue({ user: { id: null } });
      const res = await aiPOST(
        buildRequest({ message: "hi", ticketId: "t_12345", accessToken: "wrong_token" })
      );
      expect(res.status).toBe(403);
      expect(prisma.supportMessage.create).not.toHaveBeenCalled();
    });

    it("rejects oversized messages and invalid history", async () => {
      const res = await aiPOST(buildRequest({ message: "x".repeat(2001) }));
      expect(res.status).toBe(422);
      const res2 = await aiPOST(
        buildRequest({ message: "hi", history: { not: "array" } })
      );
      expect(res2.status).toBe(422);
    });

    it("rate limits per user", async () => {
      let last;
      for (let i = 0; i < 21; i++) {
        last = await aiPOST(buildRequest({ message: `msg ${i}` }));
      }
      expect(last.status).toBe(429);
    });
  });

  describe("/api/support/notify", () => {
    it("rejects escalating another user's ticket without the access token", async () => {
      getSessionFromRequest.mockResolvedValue({ user: { id: "usr_attacker" } });
      const res = await notifyPOST(
        buildRequest({ ticketId: "t_12345", message: "spam" })
      );
      expect(res.status).toBe(403);
      expect(prisma.supportMessage.create).not.toHaveBeenCalled();
    });

    it("allows escalation by the ticket owner", async () => {
      const res = await notifyPOST(
        buildRequest({ ticketId: "t_12345", message: "please help", accessToken: "tok_secret_1" })
      );
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });

    it("rate limits escalation to prevent email flooding", async () => {
      let last;
      for (let i = 0; i < 6; i++) {
        last = await notifyPOST(
          buildRequest({ ticketId: "t_12345", message: `m${i}`, accessToken: "tok_secret_1" })
        );
      }
      expect(last.status).toBe(429);
    });
  });
});
