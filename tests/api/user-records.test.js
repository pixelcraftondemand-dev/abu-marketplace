import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { GET as searchGET } from "@/app/api/admin/user-records/route";
import { GET as detailGET } from "@/app/api/admin/user-records/[userId]/route";

vi.mock("@/middlewares/authAdmin", () => ({ default: vi.fn() }));
vi.mock("@/lib/serverAuth", () => ({ getSessionFromRequest: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

function buildRequest(url) {
  return new Request(url);
}

describe("admin user records (AML / law-enforcement)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getSessionFromRequest.mockResolvedValue({ user: { id: "admin_1" } });
    authAdmin.mockResolvedValue(true);
  });

  it("rejects non-admin requests before querying", async () => {
    authAdmin.mockResolvedValue(false);
    const res = await searchGET(buildRequest("http://localhost:3000/api/admin/user-records?q=amina"));
    expect(res.status).toBe(403);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("searches by name/email/id including closed accounts", async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: "usr_1",
        name: "Amina Kargbo",
        email: "amina@example.com",
        deletedAt: new Date(),
        dataRetentionUntil: new Date(),
      },
    ]);

    const res = await searchGET(buildRequest("http://localhost:3000/api/admin/user-records?q=amina"));

    expect(res.status).toBe(200);
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.OR).toHaveLength(3); // id / email / name
    const json = await res.json();
    expect(json.users).toHaveLength(1);
    expect(json.users[0].name).toBe("Amina Kargbo");
  });

  it("returns an empty list without a query (no broad table scan)", async () => {
    const res = await searchGET(buildRequest("http://localhost:3000/api/admin/user-records"));
    expect(res.status).toBe(200);
    expect((await res.json()).users).toEqual([]);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("returns the complete retained record for one account", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "usr_1",
      name: "Amina Kargbo",
      email: "amina@example.com",
      deletedAt: new Date(),
      buyerOrders: [],
      payments: [],
    });

    const res = await detailGET(
      buildRequest("http://localhost:3000/api/admin/user-records/usr_1"),
      { params: { userId: "usr_1" } }
    );

    expect(res.status).toBe(200);
    expect((await res.json()).record.id).toBe("usr_1");
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when the account does not exist", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await detailGET(
      buildRequest("http://localhost:3000/api/admin/user-records/usr_nope"),
      { params: { userId: "usr_nope" } }
    );
    expect(res.status).toBe(404);
  });

  it("rejects malformed account ids before querying", async () => {
    const res = await detailGET(
      buildRequest("http://localhost:3000/api/admin/user-records/../../etc"),
      { params: { userId: "../../etc" } }
    );
    expect(res.status).toBe(422);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
