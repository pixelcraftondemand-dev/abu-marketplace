import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { findUnique: vi.fn() },
  },
}));

describe("authSeller", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns false for a falsy userId without querying", async () => {
    expect(await authSeller(null)).toBe(false);
    expect(await authSeller(undefined)).toBe(false);
    expect(await authSeller("")).toBe(false);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns false when the user does not exist", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    expect(await authSeller("usr_1")).toBe(false);
  });

  it("returns false when the user has no store", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "usr_1", store: null });
    expect(await authSeller("usr_1")).toBe(false);
  });

  it("returns false when the store is not approved", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "usr_1",
      store: { id: "st_1", status: "pending", isActive: true },
    });
    expect(await authSeller("usr_1")).toBe(false);
  });

  it("returns false when the store is not active", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "usr_1",
      store: { id: "st_1", status: "approved", isActive: false },
    });
    expect(await authSeller("usr_1")).toBe(false);
  });

  it("returns the store id for an approved, active store", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "usr_1",
      store: { id: "st_1", status: "approved", isActive: true },
    });
    expect(await authSeller("usr_1")).toBe("st_1");
  });

  it("returns false for a soft-deleted (closed) account even with an approved store", async () => {
    // The guard is enforced in the query (deletedAt: null), so a deleted
    // account never even reaches the store checks.
    prisma.user.findUnique.mockResolvedValue(null);
    expect(await authSeller("usr_deleted")).toBe(false);
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "usr_deleted", deletedAt: null } })
    );
  });

  it("returns false when the prisma lookup throws", async () => {
    prisma.user.findUnique.mockRejectedValue(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await authSeller("usr_1")).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});
