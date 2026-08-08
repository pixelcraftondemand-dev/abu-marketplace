import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { GET } from "@/app/api/auth/status/route";

vi.mock("@/lib/serverAuth", () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { findUnique: vi.fn() },
  },
}));

describe("GET /api/auth/status", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when the user is not authenticated", async () => {
    getSessionFromRequest.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost:3000/api/auth/status"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "not authorized" });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("reports a verified user", async () => {
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_1" } });
    prisma.user.findUnique.mockResolvedValue({ id: "usr_1", emailVerified: true });

    const res = await GET(new Request("http://localhost:3000/api/auth/status"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ verified: true });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "usr_1", deletedAt: null },
      select: { emailVerified: true },
    });
  });

  it("reports an unverified user (even an OAuth account) as not verified", async () => {
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_2" } });
    prisma.user.findUnique.mockResolvedValue({ id: "usr_2", emailVerified: false });

    const res = await GET(new Request("http://localhost:3000/api/auth/status"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ verified: false });
  });

  it("reports a missing user row as not verified", async () => {
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_ghost" } });
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost:3000/api/auth/status"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ verified: false });
  });
});
