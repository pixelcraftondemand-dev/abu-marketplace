import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Keep the OTP service focused on its own logic — the limiter is covered by
// tests/lib/rateLimit.test.js and must never touch Redis here.
vi.mock("@/lib/services/rateLimitStore", () => ({
  createDistributedRateLimiter: () => ({
    check: async () => ({ allowed: true }),
    _clear: () => {},
  }),
}));

vi.mock("@/lib/prisma", () => {
  const prismaMock = {
    verification: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  };
  prismaMock.$transaction = vi.fn(async (fn) => fn(prismaMock));
  return { default: prismaMock };
});

import prisma from "@/lib/prisma";
import {
  generateWhatsappOtp,
  hashWhatsappOtp,
  issueWhatsappOtp,
  toWhatsappDigits,
  verifyWhatsappOtp,
  whatsappIdentifier,
} from "@/lib/services/whatsappOtpService";

const TEST_SECRET = "test-whatsapp-otp-secret";

describe("whatsappOtpService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    prisma.verification.deleteMany.mockResolvedValue({ count: 0 });
    prisma.verification.create.mockResolvedValue({});
    vi.stubEnv("WHATSAPP_OTP_SECRET", TEST_SECRET);
    vi.stubEnv("WHATSAPP_OTP_PROVIDER", "mock");
    vi.stubEnv("WHATSAPP_OTP_TTL_MINUTES", "5");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe("number normalisation", () => {
    it("accepts local and international spellings", () => {
      expect(toWhatsappDigits("076 123 456")).toBe("23276123456");
      expect(toWhatsappDigits("+232 76 123 456")).toBe("23276123456");
      expect(toWhatsappDigits("23276123456")).toBe("23276123456");
      expect(toWhatsappDigits("00 232 76 123 456")).toBe("23276123456");
    });

    it("rejects unusable values", () => {
      expect(toWhatsappDigits("")).toBeNull();
      expect(toWhatsappDigits(null)).toBeNull();
      expect(toWhatsappDigits("abc")).toBeNull();
      expect(toWhatsappDigits("123")).toBeNull();
    });

    it("namespaces the identifier so email and WhatsApp codes never collide", () => {
      expect(whatsappIdentifier("23276123456")).toBe("whatsapp:23276123456");
    });
  });

  describe("code generation + hashing", () => {
    it("generates 6-digit codes", () => {
      expect(generateWhatsappOtp()).toMatch(/^\d{6}$/);
    });

    it("stores an HMAC digest, never the raw code and never a bare SHA-256", () => {
      const code = "048192";
      const digest = hashWhatsappOtp(code);
      expect(digest).toMatch(/^[0-9a-f]{64}$/);
      expect(digest).not.toBe(code);
      expect(digest).toBe(hashWhatsappOtp(code));
      // Keyed: a different secret yields a different digest for the same code.
      vi.stubEnv("WHATSAPP_OTP_SECRET", "another-secret");
      expect(hashWhatsappOtp(code)).not.toBe(digest);
    });

    it("throws when no hashing secret is configured", () => {
      process.env.WHATSAPP_OTP_SECRET = "";
      process.env.CLERK_SECRET_KEY = "";
      expect(() => hashWhatsappOtp("123456")).toThrow(/WHATSAPP_OTP_SECRET/);
    });
  });

  describe("issueWhatsappOtp (mock provider)", () => {
    it("invalidates the previous code, stores only the hash, and returns a dev code", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        const result = await issueWhatsappOtp("076 123 456");

        expect(result.sent).toBe(true);
        expect(result.devCode).toMatch(/^\d{6}$/);
        expect(result.expiresInMinutes).toBe(5);

        expect(prisma.verification.deleteMany).toHaveBeenCalledWith({
          where: { identifier: "whatsapp:23276123456" },
        });
        const stored = prisma.verification.create.mock.calls[0][0].data;
        expect(stored.identifier).toBe("whatsapp:23276123456");
        expect(stored.value).toBe(hashWhatsappOtp(result.devCode));
        expect(stored.value).not.toBe(result.devCode);
      } finally {
        warn.mockRestore();
      }
    });

    it("rejects an invalid number without touching the database", async () => {
      const result = await issueWhatsappOtp("nope");
      expect(result).toEqual({ sent: false, reason: "invalid_number" });
      expect(prisma.verification.create).not.toHaveBeenCalled();
    });

    it("retries when the code digest collides (unique constraint)", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        prisma.verification.create
          .mockRejectedValueOnce({ code: "P2002" })
          .mockResolvedValueOnce({});
        const result = await issueWhatsappOtp("23276123456");
        expect(result.sent).toBe(true);
        expect(prisma.verification.create).toHaveBeenCalledTimes(2);
      } finally {
        warn.mockRestore();
      }
    });

    it("refuses to run the mock provider in production", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        vi.stubEnv("NODE_ENV", "production");
        const result = await issueWhatsappOtp("23276123456");

        expect(result.sent).toBe(false);
        expect(result.reason).toBe("provider_error");
        // The undeliverable code is removed rather than left lying around.
        expect(prisma.verification.deleteMany).toHaveBeenCalledTimes(2);
      } finally {
        error.mockRestore();
      }
    });
  });

  describe("issueWhatsappOtp (meta provider)", () => {
    beforeEach(() => {
      vi.stubEnv("WHATSAPP_OTP_PROVIDER", "meta");
      vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "1234567890");
      vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "eaab-test-token");
      vi.stubEnv("WHATSAPP_OTP_TEMPLATE", "abu_signin_code");
      vi.stubEnv("WHATSAPP_OTP_TEMPLATE_LANG", "en_US");
    });

    it("posts an authentication template to the Cloud API without leaking the code to the DB", async () => {
      const fetchMock = vi.fn(async () => ({ ok: true, status: 200, text: async () => "" }));
      vi.stubGlobal("fetch", fetchMock);

      const result = await issueWhatsappOtp("23276123456");
      expect(result.sent).toBe(true);
      expect(result.devCode).toBeUndefined();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://graph.facebook.com/v23.0/1234567890/messages");
      expect(init.headers.Authorization).toBe("Bearer eaab-test-token");

      const body = JSON.parse(init.body);
      expect(body.to).toBe("23276123456");
      expect(body.type).toBe("template");
      expect(body.template.name).toBe("abu_signin_code");
      expect(body.template.language.code).toBe("en_US");
      const sentCode = body.template.components[0].parameters[0].text;
      expect(sentCode).toMatch(/^\d{6}$/);
      expect(prisma.verification.create.mock.calls[0][0].data.value).toBe(
        hashWhatsappOtp(sentCode)
      );
    });

    it("fails cleanly and removes the code when the provider rejects the send", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        vi.stubGlobal(
          "fetch",
          vi.fn(async () => ({ ok: false, status: 401, text: async () => "bad token" }))
        );

        const result = await issueWhatsappOtp("23276123456");
        expect(result).toEqual({
          sent: false,
          reason: "provider_error",
          message: "We couldn't send your code.",
        });
        expect(prisma.verification.deleteMany).toHaveBeenCalledTimes(2);
      } finally {
        error.mockRestore();
      }
    });

    it("reports a configuration error instead of a raw crash when credentials are missing", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "");
        const result = await issueWhatsappOtp("23276123456");
        expect(result.sent).toBe(false);
        expect(result.reason).toBe("provider_error");
      } finally {
        error.mockRestore();
      }
    });
  });

  describe("verifyWhatsappOtp", () => {
    it("consumes the code and returns the verified number", async () => {
      const code = "135790";
      prisma.verification.findFirst.mockResolvedValue({
        id: "v_1",
        expiresAt: new Date(Date.now() + 60 * 1000),
      });

      const outcome = await verifyWhatsappOtp("+232 76 123 456", code);

      expect(outcome).toEqual({ status: "verified", phone: "23276123456" });
      expect(prisma.verification.findFirst).toHaveBeenCalledWith({
        where: { identifier: "whatsapp:23276123456", value: hashWhatsappOtp(code) },
        select: { id: true, expiresAt: true },
      });
      expect(prisma.verification.delete).toHaveBeenCalledWith({ where: { id: "v_1" } });
    });

    it("rejects an unknown code", async () => {
      prisma.verification.findFirst.mockResolvedValue(null);
      await expect(verifyWhatsappOtp("23276123456", "000000")).resolves.toEqual({
        status: "invalid",
      });
      expect(prisma.verification.delete).not.toHaveBeenCalled();
    });

    it("rejects a malformed code without hitting the database", async () => {
      await expect(verifyWhatsappOtp("23276123456", "12")).resolves.toEqual({ status: "invalid" });
      await expect(verifyWhatsappOtp("bad-number", "123456")).resolves.toEqual({
        status: "invalid",
      });
      expect(prisma.verification.findFirst).not.toHaveBeenCalled();
    });

    it("expires a stale code and consumes it", async () => {
      prisma.verification.findFirst.mockResolvedValue({
        id: "v_1",
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(verifyWhatsappOtp("23276123456", "123456")).resolves.toEqual({
        status: "expired",
      });
      expect(prisma.verification.delete).toHaveBeenCalledWith({ where: { id: "v_1" } });
    });

    it("cannot be replayed: the code row is deleted on first success", async () => {
      prisma.verification.findFirst.mockResolvedValueOnce({
        id: "v_1",
        expiresAt: new Date(Date.now() + 60 * 1000),
      });
      await expect(verifyWhatsappOtp("23276123456", "123456")).resolves.toEqual({
        status: "verified",
        phone: "23276123456",
      });

      prisma.verification.findFirst.mockResolvedValue(null);
      await expect(verifyWhatsappOtp("23276123456", "123456")).resolves.toEqual({
        status: "invalid",
      });
    });

    it("returns server_error instead of throwing when the database fails", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        prisma.verification.findFirst.mockRejectedValue(new Error("db down"));
        await expect(verifyWhatsappOtp("23276123456", "123456")).resolves.toEqual({
          status: "server_error",
        });
      } finally {
        error.mockRestore();
      }
    });
  });
});
