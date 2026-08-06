import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { findUnique: vi.fn() },
  },
}));

describe("authAdmin", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false for a falsy userId without querying", async () => {
    expect(await authAdmin(null)).toBe(false);
    expect(await authAdmin("")).toBe(false);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns false when the user does not exist", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@abumarketplace.shop");
    prisma.user.findUnique.mockResolvedValue(null);
    expect(await authAdmin("usr_1")).toBe(false);
  });

  it("returns false when the user has no email", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@abumarketplace.shop");
    prisma.user.findUnique.mockResolvedValue({ email: null });
    expect(await authAdmin("usr_1")).toBe(false);
  });

  it("returns false and warns when ADMIN_EMAIL is not configured", async () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    prisma.user.findUnique.mockResolvedValue({ email: "admin@abumarketplace.shop" });
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(await authAdmin("usr_1")).toBe(false);
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("returns true when the user email is in ADMIN_EMAIL", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@abumarketplace.shop");
    prisma.user.findUnique.mockResolvedValue({ email: "admin@abumarketplace.shop" });
    expect(await authAdmin("usr_1")).toBe(true);
  });

  it("only grants admin access to active accounts (deletedAt: null filter)", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@abumarketplace.shop");
    prisma.user.findUnique.mockResolvedValue({ email: "admin@abumarketplace.shop" });
    await authAdmin("usr_1");
    const where = prisma.user.findUnique.mock.calls[0][0].where;
    expect(where).toEqual({ id: "usr_1", deletedAt: null });
  });

  it("matches emails case-insensitively and trims whitespace", async () => {
    vi.stubEnv("ADMIN_EMAIL", "  Admin@AbuMarketplace.Shop , owner@example.com ");
    prisma.user.findUnique.mockResolvedValue({ email: "ADMIN@abumarketplace.shop" });
    expect(await authAdmin("usr_1")).toBe(true);
  });

  it("returns false when the email is not in the admin list", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@abumarketplace.shop");
    prisma.user.findUnique.mockResolvedValue({ email: "someone@example.com" });
    expect(await authAdmin("usr_1")).toBe(false);
  });

  it("returns false when the prisma lookup throws", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@abumarketplace.shop");
    prisma.user.findUnique.mockRejectedValue(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await authAdmin("usr_1")).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});
