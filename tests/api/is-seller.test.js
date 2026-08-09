import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/serverAuth";
import authSeller from "@/middlewares/authSeller";
import { GET } from "@/app/api/store/is-seller/route";

vi.mock("@/lib/serverAuth", () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock("@/middlewares/authSeller", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    store: { findUnique: vi.fn() },
  },
}));

describe("GET /api/store/is-seller", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    getSessionFromRequest.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost:3000/api/store/is-seller"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "not authorized" });
    expect(authSeller).not.toHaveBeenCalled();
  });

  it("returns { isSeller: false } (200) for a signed-in non-seller", async () => {
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_1" } });
    authSeller.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost:3000/api/store/is-seller"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ isSeller: false });
  });

  it("returns { isSeller: true, storeInfo } for an approved/active seller", async () => {
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_2" } });
    authSeller.mockResolvedValue("store_1");
    prisma.store.findUnique.mockResolvedValue({
      id: "store_1",
      name: "Foo Store",
      username: "foo",
    });

    const res = await GET(new Request("http://localhost:3000/api/store/is-seller"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      isSeller: true,
      storeInfo: { id: "store_1", name: "Foo Store", username: "foo" },
    });
    expect(prisma.store.findUnique).toHaveBeenCalledWith({
      where: { userId: "usr_2" },
      select: expect.objectContaining({ id: true, name: true, username: true }),
    });
  });

  it("returns 500 (not 400) when the DB lookup fails", async () => {
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_3" } });
    authSeller.mockResolvedValue("store_3");
    prisma.store.findUnique.mockRejectedValue(new Error("db down"));

    const res = await GET(new Request("http://localhost:3000/api/store/is-seller"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Unable to verify seller access." });
  });
});
