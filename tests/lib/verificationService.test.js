import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createVerificationToken,
  generateVerificationToken,
  hashVerificationToken,
  issueVerificationEmail,
  verifyVerificationToken,
} from "@/lib/services/verificationService";

const { mockSendVerificationEmail } = vi.hoisted(() => ({
  mockSendVerificationEmail: vi.fn(),
}));

vi.mock("@/lib/verificationEmail", () => ({
  sendVerificationEmail: mockSendVerificationEmail,
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
    mockSendVerificationEmail.mockResolvedValue({});
    process.env.VERIFICATION_OTP_TTL_MINUTES = "15";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("code generation + hashing", () => {
    it("generates random 6-digit numeric codes", () => {
      const a = generateVerificationToken();
      const b = generateVerificationToken();
      expect(a).not.toBe(b);
      expect(a).toMatch(/^\d{6}$/);
      expect(b).toMatch(/^\d{6}$/);
    });

    it("hashes codes to a stable SHA-256 hex (raw code never stored)", () => {
      const code = generateVerificationToken();
      const h1 = hashVerificationToken(code);
      const h2 = hashVerificationToken(code);
      expect(h1).toBe(h2);
      expect(h1).toMatch(/^[0-9a-f]{64}$/);
      expect(h1).not.toBe(code);
    });

    it("rejects hashing an empty code", () => {
      expect(() => hashVerificationToken("")).toThrow("Verification token is required.");
    });
  });

  describe("createVerificationToken", () => {
    it("stores only the hash and sets a ~15 minute expiry", async () => {
      prisma.verification.create.mockResolvedValue({});
      prisma.verification.deleteMany.mockResolvedValue({ count: 1 });

      const { token, expiresAt } = await createVerificationToken("usr_1");

      expect(token).toMatch(/^\d{6}$/);
      const diffMinutes = (expiresAt.getTime() - Date.now()) / (60 * 1000);
      expect(diffMinutes).toBeGreaterThan(14.5);
      expect(diffMinutes).toBeLessThan(15.5);
      // Deletes previous codes first (single live code per user).
      expect(prisma.verification.deleteMany).toHaveBeenCalledWith({
        where: { identifier: "usr_1" },
      });
      // Only the hash is persisted — the raw code never reaches the DB.
      const createArg = prisma.verification.create.mock.calls[0][0].data;
      expect(createArg.value).toBe(hashVerificationToken(token));
      expect(createArg.value).not.toBe(token);
      expect(createArg.identifier).toBe("usr_1");
    });

    it("honors VERIFICATION_OTP_TTL_MINUTES", async () => {
      prisma.verification.create.mockResolvedValue({});
      process.env.VERIFICATION_OTP_TTL_MINUTES = "30";
      const { expiresAt } = await createVerificationToken("usr_1");
      const diffMinutes = (expiresAt.getTime() - Date.now()) / (60 * 1000);
      expect(diffMinutes).toBeGreaterThan(29.5);
      expect(diffMinutes).toBeLessThan(30.5);
    });

    it("retries with a fresh code when the unique hash collides (P2002)", async () => {
      prisma.verification.deleteMany.mockResolvedValue({ count: 1 });
      // First attempt collides with another user's live code, second succeeds.
      prisma.verification.create
        .mockRejectedValueOnce({ code: "P2002" })
        .mockResolvedValueOnce({});

      const { token, expiresAt } = await createVerificationToken("usr_1");

      expect(token).toMatch(/^\d{6}$/);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(prisma.verification.create).toHaveBeenCalledTimes(2);
    });

    it("throws when a unique code cannot be allocated", async () => {
      prisma.verification.deleteMany.mockResolvedValue({ count: 1 });
      prisma.verification.create.mockRejectedValue({ code: "P2002" });

      await expect(createVerificationToken("usr_1")).rejects.toThrow(
        "Could not allocate a unique verification code"
      );
    });
  });

  describe("verifyVerificationToken", () => {
    it("verifies a valid code, consumes it, and marks the account verified atomically", async () => {
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
      // Code row deleted (single-use) + user marked verified in the same tx.
      expect(prisma.verification.delete).toHaveBeenCalledWith({ where: { id: "v_1" } });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "usr_1" },
        data: { emailVerified: true },
      });
    });

    it("rejects an unknown code as invalid", async () => {
      prisma.verification.findUnique.mockResolvedValue(null);
      const outcome = await verifyVerificationToken("000000");
      expect(outcome).toEqual({ status: "invalid" });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("rejects an expired code and consumes it", async () => {
      prisma.verification.findUnique.mockResolvedValue({
        id: "v_1",
        identifier: "usr_1",
        value: "hash",
        expiresAt: new Date(Date.now() - 1000),
      });
      prisma.user.findUnique.mockResolvedValue({ id: "usr_1", emailVerified: false });

      const outcome = await verifyVerificationToken("123456");
      expect(outcome).toEqual({ status: "expired" });
      expect(prisma.verification.delete).toHaveBeenCalledWith({ where: { id: "v_1" } });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("cannot be replayed: the code is consumed on first use", async () => {
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

    it("treats an already-verified account safely (idempotent, code cleaned up)", async () => {
      prisma.verification.findUnique.mockResolvedValue({
        id: "v_1",
        identifier: "usr_1",
        value: "hash",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      prisma.user.findUnique.mockResolvedValue({ id: "usr_1", emailVerified: true });

      const outcome = await verifyVerificationToken("123456");
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
        const outcome = await verifyVerificationToken("123456");
        expect(outcome).toEqual({ status: "server_error" });
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe("issueVerificationEmail", () => {
    it("issues a code and sends a code email with the default expiry", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "usr_1", email: "buyer@example.com", emailVerified: false });
      prisma.verification.deleteMany.mockResolvedValue({ count: 1 });
      prisma.verification.create.mockResolvedValue({});

      const result = await issueVerificationEmail("usr_1");

      expect(result).toEqual({ sent: true });
      expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
      const emailArg = mockSendVerificationEmail.mock.calls[0][0];
      expect(emailArg.to).toBe("buyer@example.com");
      expect(emailArg.code).toMatch(/^\d{6}$/);
      expect(emailArg.purpose).toBe("verification");
      expect(emailArg.expiresInMinutes).toBe(15);
    });

    it("uses the emailed code but never stores it in plaintext", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "usr_1", email: "buyer@example.com", emailVerified: false });
      prisma.verification.deleteMany.mockResolvedValue({ count: 1 });
      prisma.verification.create.mockResolvedValue({});

      await issueVerificationEmail("usr_1");

      const emailedCode = mockSendVerificationEmail.mock.calls[0][0].code;
      // DB stores the hash of the exact code that was emailed.
      expect(prisma.verification.create.mock.calls[0][0].data.value).toBe(
        hashVerificationToken(emailedCode)
      );
    });

    it("does not send or issue a code for an already-verified account", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "usr_1", email: "buyer@example.com", emailVerified: true });
      const result = await issueVerificationEmail("usr_1");
      expect(result).toEqual({ sent: false, reason: "already_verified" });
      expect(mockSendVerificationEmail).not.toHaveBeenCalled();
      expect(prisma.verification.create).not.toHaveBeenCalled();
    });

    it("returns no_account without sending when the user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await issueVerificationEmail("usr_nope");
      expect(result).toEqual({ sent: false, reason: "no_account" });
      expect(mockSendVerificationEmail).not.toHaveBeenCalled();
    });
  });
});
