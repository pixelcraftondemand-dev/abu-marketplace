import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import { getVerifiedUserFromRequest } from "@/lib/serverAuth";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { findUnique: vi.fn() },
  },
}));

import { auth } from "@clerk/nextjs/server";

describe("getVerifiedUserFromRequest", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    auth.mockResolvedValue({ userId: "usr_1" });
  });

  it("returns the user only when verified AND not soft-deleted", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "usr_1", emailVerified: true });

    const user = await getVerifiedUserFromRequest();

    expect(user).toEqual({ id: "usr_1", emailVerified: true });
    // Closed accounts are excluded at the query level (deletedAt: null).
    expect(prisma.user.findUnique.mock.calls[0][0].where).toEqual({
      id: "usr_1",
      deletedAt: null,
    });
  });

  it("returns null when unauthenticated", async () => {
    auth.mockResolvedValue({ userId: null });
    expect(await getVerifiedUserFromRequest()).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when the account is unverified", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "usr_1", emailVerified: false });
    expect(await getVerifiedUserFromRequest()).toBeNull();
  });

  it("returns null when the account does not exist", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    expect(await getVerifiedUserFromRequest()).toBeNull();
  });
});
