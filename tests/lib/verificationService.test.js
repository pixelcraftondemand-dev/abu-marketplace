import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createVerificationToken,
  generateVerificationToken,
  hashVerificationToken,
  issueVerificationEmail,
  verifyVerificationToken,
} from "@/lib/services/verificationService";

const { mockSendAccountVerificationEmail } = vi.hoisted(() => ({
  mockSendAccountVerificationEmail: vi.fn(),
}));

vi.mock("@/lib/verificationEmail", () => ({
  sendAccountVerificationEmail: mockSendAccountVerificationEmail,
}));

vi.mock("@/lib/prisma", () => {
  const prismaMock = {
    verification: { deleteMany: vi.fn(), create: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
  };
  prismaMock.$transaction = vi.fn(async (fn) => fn(prismaMock));
  return { default: prismaMock };
});

import prisma from "@/lib/prisma";

describe("verificationService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    mockSendAccountVerificationEmail.mockResolvedValue({});
    process.env.VERIFICATION_TOKEN_TTL_HOURS = "24";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("token generation + hashing", () => {
    it("generates URL-safe tokens with high entropy", () => {
      const a = generateVerificationToken();
      const b = generateVerificationToken();
      expect(a).not.toBe(b);
      expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
      // 32 bytes base64url -> 43 chars.
      expect(a).toHaveLength(43);
    });

    it("hashes tokens to a stable SHA-256 hex (raw token never stored)", () => {
      const token = generateVerificationToken();
      const h1 = hashVerificationToken(token);
      const h2 = hashVerificationToken(token);
      expect(h1).toBe(h2);
      expect(h1).toMatch(/^[0-9a-f]{64}$/);
      expect(h1).not.toBe(token);
    });

    it("rejects hashing an empty token", () => {
      expect(() => hashVerificationToken("")).toThrow("Verification token is required.");
    });
  });

  describe("createVerificationToken", () => {
    it("stores only the hash and sets a future expiry", async () => {
      prisma.verification.create.mockResolvedValue({});
      prisma.verification.deleteMany.mockResolvedValue({ count: 1 });

      const { token, expiresAt } = await createVerificationToken("usr_1");

      expect(token).toBeTruthy();
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
      // Deletes previous tokens first (single live token per user).
      expect(prisma.verification.deleteMany).toHaveBeenCalledWith({
        where: { identifier: "usr_1" },
      });
      // Only the hash is persisted — the raw token never reaches the DB.
      const createArg = prisma.verification.create.mock.calls[0][0].data;
      expect(createArg.value).toBe(hashVerificationToken(token));
      expect(createArg.value).not.toBe(token);
      expect(createArg.identifier).toBe("usr_1");
    });

    it("honors VERIFICATION_TOKEN_TTL_HOURS", async () => {
      prisma.verification.create.mockResolvedValue({});
      process.env.VERIFICATION_TOKEN_TTL_HOURS = "1";
      const { expiresAt } = await createVerificationToken("usr_1");
      const diffHours = (expiresAt.getTime() - Date.now()) / (60 * 60 * 1000);
      expect(diffHours).toBeGreaterThan(0.9);
      expect(diffHours).toBeLessThan(1.1);
    });
  });

  describe("verifyVerificationToken", () => {
    it("verifies a valid token, consumes it, and marks the account verified atomically", async () => {
      prisma.verification.findUnique.mockResolvedValue({
        id: "v_1",
        identifier: "usr_1",
        value: "hash",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      prisma.user.findUnique.mockResolvedValue({ id: "usr_1", emailVerified: false });

      const { token } = await createVerificationToken("usr_1");
      const outcome = await verifyVerificationToken(token);

      expect(outcome).toEqual({ status: "verified", userId: "usr_1" });
      // Token row deleted (single-use) + user marked verified in the same tx.
      expect(prisma.verification.delete).toHaveBeenCalledWith({ where: { id: "v_1" } });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "usr_1" },
        data: { emailVerified: true },
      });
    });

    it("rejects an unknown token as invalid", async () => {
      prisma.verification.findUnique.mockResolvedValue(null);
      const outcome = await verifyVerificationToken("totally-bogus-token");
      expect(outcome).toEqual({ status: "invalid" });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("rejects an expired token and consumes it", async () => {
      prisma.verification.findUnique.mockResolvedValue({
        id: "v_1",
        identifier: "usr_1",
        value: "hash",
        expiresAt: new Date(Date.now() - 1000),
      });
      prisma.user.findUnique.mockResolvedValue({ id: "usr_1", emailVerified: false });

      const outcome = await verifyVerificationToken("expired-token");
      expect(outcome).toEqual({ status: "expired" });
      expect(prisma.verification.delete).toHaveBeenCalledWith({ where: { id: "v_1" } });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("cannot be replayed: the token is consumed on first use", async () => {
      // First call: valid -> verified.
      prisma.verification.findUnique.mockResolvedValue({
        id: "v_1",
        identifier: "usr_1",
        value: "hash",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      prisma.user.findUnique.mockResolvedValue({ id: "usr_1", emailVerified: false });
      const { token } = await createVerificationToken("usr_1");
      await verifyVerificationToken(token);

      // Second call: the row is gone -> invalid (replay fails).
      prisma.verification.findUnique.mockResolvedValue(null);
      const replay = await verifyVerificationToken(token);
      expect(replay).toEqual({ status: "invalid" });
    });

    it("treats an already-verified account safely (idempotent, token cleaned up)", async () => {
      prisma.verification.findUnique.mockResolvedValue({
        id: "v_1",
        identifier: "usr_1",
        value: "hash",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      prisma.user.findUnique.mockResolvedValue({ id: "usr_1", emailVerified: true });

      const outcome = await verifyVerificationToken("some-token");
      expect(outcome).toEqual({ status: "already_verified", userId: "usr_1" });
      expect(prisma.verification.delete).toHaveBeenCalledWith({ where: { id: "v_1" } });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("rejects empty/oversized tokens without touching the DB", async () => {
      prisma.verification.findUnique.mockResolvedValue(null);
      expect((await verifyVerificationToken("")).status).toBe("invalid");
      expect((await verifyVerificationToken("x".repeat(201))).status).toBe("invalid");
      expect(prisma.verification.findUnique).not.toHaveBeenCalled();
    });

    it("returns server_error instead of throwing on a DB failure", async () => {
      prisma.verification.findUnique.mockRejectedValue(new Error("db down"));
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const outcome = await verifyVerificationToken("some-token");
        expect(outcome).toEqual({ status: "server_error" });
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe("issueVerificationEmail", () => {
    it("issues a token and sends a link email using the app domain", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "usr_1", email: "buyer@example.com", emailVerified: false });
      prisma.verification.deleteMany.mockResolvedValue({ count: 1 });
      prisma.verification.create.mockResolvedValue({});
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://abumarketplace.shop");

      const result = await issueVerificationEmail("usr_1");

      expect(result).toEqual({ sent: true });
      expect(mockSendAccountVerificationEmail).toHaveBeenCalledTimes(1);
      const emailArg = mockSendAccountVerificationEmail.mock.calls[0][0];
      expect(emailArg.to).toBe("buyer@example.com");
      expect(emailArg.verificationUrl).toMatch(
        /^https:\/\/abumarketplace\.shop\/verify-email\?token=[A-Za-z0-9_-]+$/
      );
      expect(emailArg.expiresAt).toBeInstanceOf(Date);
    });

    it("uses the raw token in the link but never stores it", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "usr_1", email: "buyer@example.com", emailVerified: false });
      prisma.verification.deleteMany.mockResolvedValue({ count: 1 });
      prisma.verification.create.mockResolvedValue({});
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://abumarketplace.shop");

      await issueVerificationEmail("usr_1");

      const url = mockSendAccountVerificationEmail.mock.calls[0][0].verificationUrl;
      const rawToken = decodeURIComponent(url.split("token=")[1]);
      // DB stores the hash of the exact token that was emailed.
      expect(prisma.verification.create.mock.calls[0][0].data.value).toBe(
        hashVerificationToken(rawToken)
      );
    });

    it("does not send or issue a token for an already-verified account", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "usr_1", email: "buyer@example.com", emailVerified: true });
      const result = await issueVerificationEmail("usr_1");
      expect(result).toEqual({ sent: false, reason: "already_verified" });
      expect(mockSendAccountVerificationEmail).not.toHaveBeenCalled();
      expect(prisma.verification.create).not.toHaveBeenCalled();
    });

    it("returns no_account without sending when the user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await issueVerificationEmail("usr_nope");
      expect(result).toEqual({ sent: false, reason: "no_account" });
      expect(mockSendAccountVerificationEmail).not.toHaveBeenCalled();
    });
  });
});
